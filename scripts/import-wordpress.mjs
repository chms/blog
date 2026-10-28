#!/usr/bin/env node
// Imports the posts of a WordPress export (WXR) into `src/content/blog/<year>/<slug>.md`.
//
//   node scripts/import-wordpress.mjs --sample        # a dozen posts that cover every special case
//   node scripts/import-wordpress.mjs --only 12,21    # specific WordPress post ids
//   node scripts/import-wordpress.mjs                 # everything
//   node scripts/import-wordpress.mjs --page 193 --slug ti-chronos --title "..." --date "2011-01-08 22:20:45"
//                                                     # turns a page of the old blog into a post
//                                                     # (--drop <regex> removes parts such as forms)
//
// Images go next to the post (`<year>/<slug>/`), other attachments to `public/files/<year>/<month>/`,
// YouTube thumbnails to `public/files/youtube/`. Downloads are cached in `import/cache/`, and a
// summary of everything that needs a look is written to `import/report.md`.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import domino from '@mixmark-io/domino';
import * as he from 'he';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXPORT = path.join(ROOT, 'import/wordpress-export.xml');
const CACHE = path.join(ROOT, 'import/cache');
const MANIFEST = path.join(ROOT, 'import/manifest.json');
const REPORT = path.join(ROOT, 'import/report.md');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const FILES_DIR = path.join(ROOT, 'public/files');
const BLOG_HOST = 'blog.chschmid.com';
// Cloudflare Pages rejects files over 25 MiB.
const MAX_BYTES = 24 * 1024 * 1024;
const TOO_BIG = Symbol('too big');
let currentPost;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const args = process.argv.slice(2);
const onlyIds = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
const sample = args.includes('--sample');
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const pageId = option('--page');

// ---------------------------------------------------------------- export file

const xml = fs.readFileSync(EXPORT, 'utf8');
const field = (item, tag) => {
	const m = item.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`));
	return m ? (m[1] ?? m[2] ?? '') : '';
};
const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
const posts = [];
const attachments = new Map(); // id -> file url
for (const item of items) {
	const type = field(item, 'wp:post_type');
	if (type === 'attachment') attachments.set(field(item, 'wp:post_id'), field(item, 'wp:attachment_url'));
	if (type !== 'post' || field(item, 'wp:status') !== 'publish') continue;
	const categories = [...item.matchAll(/<category domain="(\w+)" nicename="([^"]*)">(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/category>/g)].map(
		(m) => ({ domain: m[1], nicename: m[2], name: he.decode(m[3] ?? m[4] ?? '') }),
	);
	posts.push({
		id: field(item, 'wp:post_id'),
		title: he.decode(field(item, 'title')).trim(),
		slug: field(item, 'wp:post_name'),
		date: field(item, 'wp:post_date'),
		content: field(item, 'content:encoded'),
		excerpt: field(item, 'excerpt:encoded'),
		categories,
	});
}
posts.sort((a, b) => a.date.localeCompare(b.date));

// Posts that were imported by hand earlier keep their files; links to them point at their slug.
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
const existingByTitle = new Map(); // title -> slug, for files that did not come from this script
(function scan(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) scan(full);
		else if (/\.mdx?$/.test(entry.name) && !Object.values(manifest).includes(path.relative(ROOT, full))) {
			const title = fs.readFileSync(full, 'utf8').match(/^title:\s*'(.*)'\s*$/m)?.[1]?.replace(/''/g, "'");
			if (title) existingByTitle.set(title, entry.name.replace(/\.mdx?$/, ''));
		}
	}
})(BLOG_DIR);

const idToSlug = new Map();
const skipped = [];
for (const p of posts) {
	if (existingByTitle.has(p.title)) {
		idToSlug.set(p.id, existingByTitle.get(p.title));
		p.skip = true;
		skipped.push(`${p.title} (${p.id})`);
	} else idToSlug.set(p.id, p.slug);
}
// pages of the old blog that were turned into posts earlier (`--page`), so links to them can be resolved
for (const [key, file] of Object.entries(manifest)) if (key.startsWith('page-')) idToSlug.set(key.slice(5), path.basename(file, '.md'));
const tagByNicename = new Map();
for (const p of posts) for (const c of p.categories) if (c.domain === 'post_tag') tagByNicename.set(c.nicename, c.name);

// ------------------------------------------------------------------- reporting

const issues = { failed: [], unresolvedLinks: new Set(), unavailableVideos: [], unknown: [], big: [], tedMissing: [], soundcloud: [] };
let downloaded = 0;
let copied = 0;

// ------------------------------------------------------------------ downloading

fs.mkdirSync(CACHE, { recursive: true });

const normalize = (url) => {
	const u = new URL(url.startsWith('//') ? `https:${url}` : url);
	if (u.host === BLOG_HOST) u.protocol = 'https:';
	return u.href;
};

async function download(url) {
	url = normalize(url);
	const key = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
	const file = path.join(CACHE, `${key}-${path.basename(new URL(url).pathname)}`);
	if (fs.existsSync(file)) return file;
	try {
		const res = await fetch(url, { redirect: 'follow' });
		if (!res.ok) {
			issues.failed.push(`${url} (${res.status})`);
			return null;
		}
		fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
		downloaded++;
		return file;
	} catch (error) {
		issues.failed.push(`${url} (${error.message})`);
		return null;
	}
}

const quietDownload = async (url) => {
	const before = issues.failed.length;
	const file = await download(url);
	if (!file) issues.failed.length = before; // the caller decides whether a miss is a problem
	return file;
};

function place(cacheFile, destination) {
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.copyFileSync(cacheFile, destination);
	copied++;
	if (fs.statSync(destination).size > 20 * 1024 * 1024) issues.big.push(path.relative(ROOT, destination));
}

const safeName = (name) =>
	decodeURIComponent(name)
		.replace(/[^A-Za-z0-9._-]+/g, '-')
		.replace(/^-+|-+$/g, '');
const UPLOAD = /^https?:\/\/blog\.chschmid\.com\/wp-content\/uploads\/(\d{4})\/(\d{2})\/([^?#]+)/;
const IMAGE = /\.(jpe?g|png|gif|webp|avif)$/i;
const stripSize = (url) => url.replace(/-\d+x\d+(?=\.\w+(?:[?#].*)?$)/, '');

/** Copies an uploaded file to `public/files/<year>/<month>/` and returns its site path. */
async function publicFile(url) {
	const m = url.match(UPLOAD);
	const file = await download(url);
	if (!file) return null;
	if (fs.statSync(file).size > MAX_BYTES) {
		issues.big.push(`${normalize(url)} (${Math.round(fs.statSync(file).size / 1048576)} MB) in "${currentPost.title}", old post: https://${BLOG_HOST}/?p=${currentPost.id}`);
		return TOO_BIG;
	}
	const rel = `${m[1]}/${m[2]}/${safeName(m[3])}`;
	place(file, path.join(FILES_DIR, rel));
	return `/files/${rel}`;
}

/** A file that lives on the old blog outside of WordPress' upload folder (e.g. `/media/…`). */
async function legacyFile(url) {
	if (url.search || url.pathname === '/') return null;
	try {
		const res = await fetch(url.href, { redirect: 'follow' });
		if (!res.ok || (res.headers.get('content-type') ?? '').includes('text/html')) return null;
		const rel = url.pathname.split('/').filter(Boolean).map(safeName).join('/');
		const file = path.join(FILES_DIR, 'legacy', rel);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
		downloaded++;
		return `/files/legacy/${rel}`;
	} catch {
		return null;
	}
}

// ------------------------------------------------------------------ YouTube

const oembedCache = new Map();
async function youtubeInfo(id) {
	if (oembedCache.has(id)) return oembedCache.get(id);
	let info = null;
	try {
		const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
		if (res.ok) info = { title: (await res.json()).title };
	} catch {}
	if (info) {
		for (const name of ['maxresdefault', 'hqdefault']) {
			const file = await quietDownload(`https://i.ytimg.com/vi/${id}/${name}.jpg`);
			if (file) {
				place(file, path.join(FILES_DIR, 'youtube', `${id}.jpg`));
				info.thumb = true;
				break;
			}
		}
	} else issues.unavailableVideos.push(`https://www.youtube.com/watch?v=${id}`);
	oembedCache.set(id, info);
	return info;
}

const esc = (text) => he.escape(text);
async function youtubeBlock(id) {
	const info = await youtubeInfo(id);
	const watch = `https://www.youtube.com/watch?v=${id}`;
	if (!info?.thumb) return `[${info ? `Watch on YouTube: ${info.title}` : 'Watch on YouTube'}](${watch})`;
	return `<div class="video"><a class="yt-embed" href="${watch}" data-youtube="${id}" title="${esc(info.title)}"><img src="/files/youtube/${id}.jpg" alt="Video: ${esc(info.title)}" loading="lazy" width="1280" height="720"><span class="yt-play"></span></a></div>`;
}

const youtubeId = (url) =>
	url.match(/youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?(?:[^"'#\s]*&(?:amp;)?)?v=)([\w-]{11})/)?.[1] ?? url.match(/youtu\.be\/([\w-]{11})/)?.[1];

// ------------------------------------------------------- WordPress-specific syntax

const BLOCKS = 'table|thead|tfoot|caption|col|colgroup|tbody|tr|td|th|div|dl|dd|dt|ul|ol|li|pre|form|map|area|blockquote|address|math|style|p|h[1-6]|hr|fieldset|legend|section|article|aside|hgroup|header|footer|nav|figure|figcaption|details|menu|summary|object|iframe|audio|video|center';
const hasBlock = new RegExp(`<\\/?(?:${BLOCKS})[\\s>/]`, 'i');

/** A simplified `wpautop`: WordPress turns blank-line separated text into paragraphs when it renders. */
function autop(text) {
	return text
		.replace(/\r\n?/g, '\n')
		.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n\n')
		.split(/\n\s*\n/)
		.map((chunk) => chunk.trim())
		.filter(Boolean)
		.map((chunk) => (hasBlock.test(chunk) ? chunk : `<p>${chunk.replace(/\n/g, '<br />\n')}</p>`))
		.join('\n\n');
}

const decodeCode = (code) =>
	he.decode(code.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(?:p|code)[^>]*>/gi, '')).replace(/^\n+|\n+$/g, '');

function fence(code, lang = '') {
	const ticks = code.includes('```') ? '~~~~' : '```';
	return `${ticks}${lang}\n${code}\n${ticks}`;
}

async function tedLink(id) {
	try {
		const res = await fetch(`https://www.ted.com/talks/view/id/${id}`, { redirect: 'manual' });
		const location = res.headers.get('location');
		if (location) return `<p><a href="${new URL(location, 'https://www.ted.com').href}">TED talk</a></p>`;
	} catch {}
	issues.tedMissing.push(id);
	return `<p>TED talk (id ${id})</p>`;
}

/** SoundCloud track links from the old embeds are API addresses; link to the artist's profile instead. */
async function soundcloudLink(url) {
	if (!url.includes('api.soundcloud.com')) return `<a href="${url}">Listen on SoundCloud</a>`;
	try {
		const res = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`);
		if (res.ok) {
			const info = await res.json();
			issues.soundcloud.push(`${info.title} -> ${info.author_url}`);
			return `<a href="${info.author_url}">Listen on SoundCloud: ${he.escape(info.title)}</a>`;
		}
	} catch {}
	issues.soundcloud.push(url);
	return `<a href="${url}">Listen on SoundCloud</a>`;
}

const attr = (text, name) => text.match(new RegExp(`${name}="([^"]*)"`))?.[1];

async function prepare(content, notes) {
	const codeBlocks = [];
	const stash = (markdown) => {
		codeBlocks.push(markdown);
		return ` CODEBLOCK${codeBlocks.length - 1}PLACEHOLDER `;
	};
	let text = content.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, '');
	text = text.replace(/\[code([^\]]*)\]([\s\S]*?)\[\/code\]/g, (_, a, code) => stash(fence(decodeCode(code), attr(a, 'language') ?? '')));
	text = text.replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/gi, (_, a, code) => stash(fence(decodeCode(code), a.match(/brush:\s*(\w+)/)?.[1] ?? '')));
	text = text.replace(/\[caption[^\]]*\]\s*((?:<a [^>]*>)?\s*<img[^>]*>\s*(?:<\/a>)?)\s*([\s\S]*?)\s*\[\/caption\]/g, (_, img, caption) => `\n\n<p>${img}</p>\n\n${caption.trim() ? `<p><em>${caption.trim()}</em></p>` : ''}\n\n`)
	text = text.replace(/\[\/?caption[^\]]*\]/g, '').replace(/\[\/audio\]/g, '');
	text = text.replace(/\[audio\s+[^\]]*?(?:mp3|src)="([^"]+)"[^\]]*\]/g, '<audio controls src="$1"></audio>');
	text = text.replace(/\[embed[^\]]*\]\s*(\S+?)\s*\[\/embed\]/g, (_, url) => (youtubeId(url) ? `<iframe src="https://www.youtube.com/embed/${youtubeId(url)}"></iframe>` : `<p><a href="${url}">${url}</a></p>`));
	text = text.replace(/^\s*https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?\S*|youtu\.be\/\S+)\s*$/gm, (url) => (youtubeId(url) ? `<iframe src="https://www.youtube.com/embed/${youtubeId(url)}"></iframe>` : url));
	text = text.replace(/^\s*(https?:\/\/soundcloud\.com\/[\w-]+\/[\w-]+)\s*$/gm, '<p><a href="$1">Listen on SoundCloud</a></p>');
	for (const m of [...text.matchAll(/\[soundcloud[^\]]*?url="([^"]+)"[^\]]*\]/g)]) text = text.replace(m[0], `<p>${await soundcloudLink(decodeURIComponent(m[1]))}</p>`);
	const teds = [...text.matchAll(/\[ted id=(\d+)\]/g)];
	for (const m of teds) text = text.replace(m[0], await tedLink(m[1]));
	text = autop(text);
	for (const m of text.matchAll(/\[(?!\s)[\w-]+(?: [^\]]*)?\]/g)) if (/^\[(gallery|playlist|video|vimeo|youtube|wpvideo|gist|tweet|twitter)\b/.test(m[0])) notes.add(`unknown shortcode ${m[0]}`);
	return { html: text, codeBlocks };
}

// --------------------------------------------------------- DOM transformations

async function transform(html, post, slug, year, notes) {
	const doc = domino.createDocument(`<body>${html}</body>`);
	const dir = path.join(BLOG_DIR, year, slug);
	const used = new Map(); // file name -> source url, so two images never overwrite each other
	const tokens = new Map();

	const token = (markdownBlock) => {
		const key = `EMBEDTOKEN${tokens.size}PLACEHOLDER`;
		tokens.set(key, markdownBlock);
		const p = doc.createElement('p');
		p.textContent = key;
		return p;
	};
	const link = (href, text) => {
		const p = doc.createElement('p');
		const a = doc.createElement('a');
		a.setAttribute('href', href);
		a.textContent = text;
		p.appendChild(a);
		return p;
	};
	const swap = (node, replacement) => node.parentNode.replaceChild(replacement, node);

	// in-page links (`#intro`) must point at the ids Markdown gives the headings
	const headingSlug = (text) => text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-');
	const headingIds = new Map();
	for (const h of Array.from(doc.body.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'))) headingIds.set(h.getAttribute('id'), headingSlug(h.textContent));
	for (const a of Array.from(doc.body.querySelectorAll('a[href^="#"]'))) {
		const id = a.getAttribute('href').slice(1);
		if (headingIds.has(id)) a.setAttribute('href', `#${headingIds.get(id)}`);
	}

	// images (with their link to the full-size file, if any)
	for (const img of Array.from(doc.body.querySelectorAll('img'))) {
		const parent = img.parentNode;
		let src = (img.getAttribute('src') ?? '').trim();
		let full = src;
		const linked = parent.nodeName === 'A' && Array.from(parent.childNodes).filter((n) => n.nodeType !== 3 || n.textContent.trim()).length === 1;
		const href = linked ? (parent.getAttribute('href') ?? '') : '';
		if (linked && UPLOAD.test(href) && IMAGE.test(href)) full = href;
		else if (UPLOAD.test(src)) full = stripSize(src);
		const m = full.startsWith('http') || full.startsWith('//') ? full.match(UPLOAD) : null;
		if (m) {
			let file = await quietDownload(full);
			let name = m[3];
			if (!file && full !== src) {
				file = await download(src);
				name = src.match(UPLOAD)?.[3] ?? name;
			} else if (!file) issues.failed.push(`${normalize(full)} (not found)`);
			if (file) {
				name = safeName(name);
				if (used.has(name) && used.get(name) !== file) name = `${path.parse(name).name}-${used.size}${path.extname(name)}`;
				used.set(name, file);
				place(file, path.join(dir, name));
				img.setAttribute('src', `./${slug}/${name}`);
			}
		} else if (src.startsWith('//')) img.setAttribute('src', `https:${src}`);
		if (linked && UPLOAD.test(href) && IMAGE.test(href)) swap(parent, img);
	}

	// links
	for (const a of Array.from(doc.body.querySelectorAll('a[href]'))) {
		const href = a.getAttribute('href').trim();
		let url;
		try {
			url = new URL(href, `https://${BLOG_HOST}/`);
		} catch {
			continue;
		}
		if (url.host !== BLOG_HOST || /^(#|mailto:|tel:|javascript:)/.test(href)) continue;
		const hash = url.hash;
		if (UPLOAD.test(url.href)) {
			const local = await publicFile(url.href);
			if (typeof local === 'string') a.setAttribute('href', local);
			else if (local === TOO_BIG) a.appendChild(doc.createTextNode(' (FIXME: FILE TOO BIG)'));
			continue;
		}
		const q = url.searchParams;
		if (q.has('p') || q.has('page_id')) {
			const id = q.get('p') ?? q.get('page_id');
			if (idToSlug.has(id)) a.setAttribute('href', `/blog/${idToSlug.get(id)}/${hash}`);
			else issues.unresolvedLinks.add(`${href} (in "${post.title}")`);
		} else if (q.has('attachment_id') && attachments.has(q.get('attachment_id')) && UPLOAD.test(attachments.get(q.get('attachment_id')))) {
			const local = await publicFile(attachments.get(q.get('attachment_id')));
			if (typeof local === 'string') a.setAttribute('href', local);
		} else if (q.has('tag') && tagByNicename.has(q.get('tag'))) {
			a.setAttribute('href', `/tags/${tagByNicename.get(q.get('tag')).trim().toLowerCase().replace(/\s+/g, '-')}/`);
		} else if (url.pathname === '/' && [...q.keys()].length === 0) a.setAttribute('href', `/${hash}`);
		else {
			const last = url.pathname.split('/').filter(Boolean).pop();
			const bySlug = posts.find((p) => p.slug === last);
			if (bySlug) a.setAttribute('href', `/blog/${idToSlug.get(bySlug.id)}/${hash}`);
			else {
				const local = await legacyFile(url);
				if (local) a.setAttribute('href', local);
				else issues.unresolvedLinks.add(`${href} (in "${post.title}")`);
			}
		}
	}

	// audio and video files
	for (const el of Array.from(doc.body.querySelectorAll('audio, video, source'))) {
		const src = el.getAttribute('src');
		if (src && UPLOAD.test(normalize(src))) {
			const local = await publicFile(normalize(src));
			if (local === TOO_BIG && el.nodeName !== 'SOURCE') {
				const p = doc.createElement('p');
				p.textContent = `FIXME: ${el.nodeName === 'VIDEO' ? 'VIDEO' : 'AUDIO'} TOO BIG`;
				swap(el, p);
				notes.add(`FIXME: ${el.nodeName.toLowerCase()} too big`);
				continue;
			}
			if (typeof local === 'string') el.setAttribute('src', local);
		}
		if (el.nodeName !== 'SOURCE') el.setAttribute('controls', '');
	}

	// embeds
	for (const el of Array.from(doc.body.querySelectorAll('iframe'))) {
		const src = el.getAttribute('src') ?? '';
		const id = youtubeId(src);
		if (id) swap(el, token(await youtubeBlock(id)));
		else if (src.includes('soundcloud.com')) {
			const target = new URL(src.startsWith('//') ? `https:${src}` : src).searchParams.get('url');
			const holder = doc.createElement('p');
			holder.innerHTML = await soundcloudLink(target ?? src);
			swap(el, holder);
		} else if (src.includes('facebook.com/plugins')) {
			const target = new URL(src.startsWith('//') ? `https:${src}` : src).searchParams.get('href');
			swap(el, link(target ?? src, 'Watch on Facebook'));
		} else if (src.includes('sports-tracker.com')) swap(el, link(src, 'View on Sports Tracker'));
		else {
			notes.add(`iframe left as link: ${src}`);
			swap(el, link(src, new URL(src.startsWith('//') ? `https:${src}` : src).host));
		}
	}
	for (const el of Array.from(doc.body.querySelectorAll('object, embed'))) {
		if (!el.parentNode) continue;
		const text = el.outerHTML;
		const id = youtubeId(text);
		const audio = text.match(/audioUrl=([^"&\s]+)/)?.[1];
		if (id) swap(el, token(await youtubeBlock(id)));
		else if (audio) swap(el, link(decodeURIComponent(audio), 'Listen to the audio'));
		else {
			notes.add('removed an unknown <object>/<embed>');
			el.parentNode.removeChild(el);
		}
	}
	// Markdown tables need a header row; WordPress tables often have none, so the first row becomes it.
	for (const table of Array.from(doc.body.querySelectorAll('table'))) {
		const first = table.querySelector('tr');
		if (!first || first.querySelector('th')) continue;
		for (const td of Array.from(first.querySelectorAll('td'))) {
			const th = doc.createElement('th');
			th.innerHTML = td.innerHTML;
			td.parentNode.replaceChild(th, td);
		}
	}
	for (const el of Array.from(doc.body.querySelectorAll('script'))) {
		notes.add('removed a <script>');
		el.parentNode.removeChild(el);
	}
	return { html: doc.body.innerHTML, tokens };
}

// ------------------------------------------------------------------ Markdown

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*' });
turndown.use(gfm);
turndown.keep(['audio', 'video']);
turndown.remove(['style']);
turndown.addRule('strikethrough', { filter: ['del', 's', 'strike'], replacement: (content) => `~~${content}~~` });
turndown.addRule('figcaption', { filter: 'figcaption', replacement: (content) => `\n\n*${content.trim()}*\n\n` });

const yaml = (text) => `'${text.replace(/'/g, "''")}'`;

async function convert(post, notes) {
	currentPost = post;
	const year = post.date.slice(0, 4);
	const slug = idToSlug.get(post.id);
	const dir = path.join(BLOG_DIR, year, slug);
	if (manifest[post.id]) fs.rmSync(path.join(ROOT, path.dirname(manifest[post.id]), slug), { recursive: true, force: true });
	const { html, codeBlocks } = await prepare(post.content, notes);
	const { html: dom, tokens } = await transform(html, post, slug, year, notes);
	let body = turndown.turndown(dom).replace(/\u00a0/g, ' ');
	for (const [key, block] of tokens) body = body.replace(key, () => block);
	codeBlocks.forEach((block, i) => {
		body = body.replace(new RegExp(`^([ \\t]*)([^\\n]*?)[ \\t]*CODEBLOCK${i}PLACEHOLDER[ \\t]*`, 'm'), (_, lead, text) => {
			const marker = text.match(/^(?:\d+\.|[-*+])\s+/);
			const indent = lead + ' '.repeat(marker ? marker[0].length : 0);
			const lines = block.split('\n').map((line) => (line ? indent + line : line)).join('\n');
			return `${text.trim() ? `${lead}${text}\n\n` : ''}${lines}\n`;
		});
	});
	body = body.replace(/\n{3,}/g, '\n\n').trim();
	if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);

	const tags = [...new Set([...post.categories.filter((c) => c.domain === 'post_tag').map((c) => c.name), ...post.categories.filter((c) => c.nicename === 'spotlight').map(() => 'Spotlight')])];
	const date = new Date(post.date.replace(' ', 'T'));
	const excerpt = he.decode(post.excerpt.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
	const front = [
		'---',
		`title: ${yaml(post.title)}`,
		...(excerpt ? [`description: ${yaml(excerpt)}`] : []),
		`pubDate: '${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')} ${date.getFullYear()}'`,
		...(tags.length ? [`tags: [${tags.map(yaml).join(', ')}]`] : []),
		'---',
	].join('\n');
	const file = path.join(BLOG_DIR, year, `${slug}.md`);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, `${front}\n\n${body}\n`);
	manifest[post.id] = path.relative(ROOT, file);
}

// ---------------------------------------------------------------------- run

function sampleIds() {
	const features = [/\[code/, /\[embed\]/, /<iframe[^>]*youtube/, /\[audio|<audio/, /soundcloud/, /facebook\.com\/plugins/, /sports-tracker/, /<object|<embed/, /<table/, /<!-- wp:/, /\[ted/, /\.pdf/, /blog\.chschmid\.com\/\?p=\d+/, /\[caption/, /<video/, /<figure/, /<h2/];
	const chosen = new Set();
	for (const f of features) {
		const hit = posts.find((p) => !p.skip && f.test(p.content) && !chosen.has(p.id));
		if (hit) chosen.add(hit.id);
	}
	chosen.add(posts.filter((p) => !p.skip).at(-1).id);
	return chosen;
}

let pagePost = null;
if (pageId) {
	const html = await (await fetch(`https://${BLOG_HOST}/?page_id=${pageId}`)).text();
	let content = html.match(/<div class="entry-content-page">([\s\S]*?)(?:<\/div><!-- \.entry-content -->|<\/div><!-- #content -->)/)?.[1];
	if (!content) throw new Error(`could not find the content of page ${pageId}`);
	if (option('--drop')) content = content?.replace(new RegExp(option('--drop'), 'g'), '');
	pagePost = {
		id: `page-${pageId}`,
		title: option('--title'),
		slug: option('--slug'),
		date: option('--date'),
		content: content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, ''),
		excerpt: '',
		categories: (option('--tags') ?? '').split(',').filter(Boolean).map((name) => ({ domain: 'post_tag', nicename: name, name })),
	};
	idToSlug.set(pagePost.id, pagePost.slug);
}

const selected = onlyIds ?? (sample ? sampleIds() : null);
const todo = pagePost ? [pagePost] : posts.filter((p) => !p.skip && (!selected || selected.has(p.id)));
console.log(`${posts.length} posts in the export, ${skipped.length} already imported by hand, converting ${todo.length}`);

const notesByPost = [];
let done = 0;
for (const post of todo) {
	const notes = new Set();
	try {
		await convert(post, notes);
	} catch (error) {
		notes.add(`FAILED: ${error.stack}`);
	}
	done++;
	console.log(`[${done}/${todo.length}] ${post.date.slice(0, 10)} ${post.slug}${notes.size ? `  (${[...notes].length} note${notes.size > 1 ? 's' : ''})` : ''}`);
	if (notes.size) notesByPost.push(`- **${post.title}** (${post.id}, \`${post.slug}\`): ${[...notes].join('; ')}`);
	fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
}

const list = (items) => (items.length ? [...items].map((i) => `- ${i}`).join('\n') : '- none');
fs.writeFileSync(
	pagePost ? REPORT.replace('report.md', 'report-page.md') : REPORT,
	`# WordPress import report

Converted ${todo.length} of ${posts.length} posts. ${downloaded} files downloaded, ${copied} files placed.

## Skipped (already imported by hand)
${list(skipped)}

## Downloads that failed
${list(issues.failed)}

## Internal links that could not be resolved
${list(issues.unresolvedLinks)}

## YouTube videos that are no longer available (left as plain links)
${list(issues.unavailableVideos)}

## TED talks whose address could not be found
${list(issues.tedMissing)}

## Files over 24 MB (not copied, a FIXME is left in the post)
${list(issues.big)}

## SoundCloud embeds (replaced by a link to the artist's profile)
${list(issues.soundcloud)}

## Per-post notes
${list(notesByPost.map((n) => n.replace(/^- /, '')))}
`,
);
console.log(`Done. ${downloaded} downloaded, ${issues.failed.length} failed. Report: import/report.md`);
