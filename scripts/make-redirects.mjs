#!/usr/bin/env node
// Writes `redirects/wordpress-redirects.csv`: the addresses of the old WordPress blog and where they
// live now. Needs a finished build (`npm run build`) to check that every target exists.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HOST = 'blog.chschmid.com';
const xml = fs.readFileSync(path.join(ROOT, 'import/wordpress-export.xml'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'import/manifest.json'), 'utf8'));
const field = (item, tag) => {
	const m = item.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`));
	return m ? (m[1] ?? m[2] ?? '') : '';
};
const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
const exists = (p) => fs.existsSync(path.join(ROOT, 'dist', p.replace(/^\//, ''), p.endsWith('/') ? 'index.html' : ''));
const tagSlug = (tag) => tag.trim().toLowerCase().replace(/\s+/g, '-');

// titles of the files that were not created by the import script (the first posts, done by hand)
const slugByTitle = new Map();
(function scan(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) scan(full);
		else if (/\.md$/.test(entry.name)) {
			const title = fs.readFileSync(full, 'utf8').match(/^title:\s*'(.*)'\s*$/m)?.[1]?.replace(/''/g, "'");
			if (title) slugByTitle.set(title, entry.name.replace(/\.md$/, ''));
		}
	}
})(path.join(ROOT, 'src/content/blog'));

const rows = [];
const problems = [];
const add = (old, target, kind) => rows.push({ old: `${HOST}${old}`, target, kind });

// posts: /?p=ID
const tags = new Map();
for (const item of items) {
	if (field(item, 'wp:post_type') !== 'post' || field(item, 'wp:status') !== 'publish') continue;
	const id = field(item, 'wp:post_id');
	const title = field(item, 'title').trim();
	const slug = manifest[id] ? path.basename(manifest[id], '.md') : (slugByTitle.get(title) ?? field(item, 'wp:post_name'));
	const target = `/blog/${slug}/`;
	if (!exists(target)) problems.push(`post ${id} "${title}": ${target} is not in the build`);
	add(`/?p=${id}`, target, 'post');
	for (const m of item.matchAll(/<category domain="post_tag" nicename="([^"]*)">(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/category>/g)) tags.set(m[1], m[2] ?? m[3]);
}

// pages that became posts or pages, and the ones that are gone
const pages = { 2: '/about/', 395: '/projects/', 959: '/archives/', 1953: '/projects/music-for-brass-instruments/' };
for (const [key, file] of Object.entries(manifest)) if (key.startsWith('page-')) pages[key.slice(5)] = `/blog/${path.basename(file, '.md')}/`;
for (const id of ['1155', '1203', '2938']) pages[id] = '/projects/'; // no equivalent yet, the Projects page is the closest
for (const [id, target] of Object.entries(pages)) {
	if (!exists(target)) problems.push(`page ${id}: ${target} is not in the build`);
	add(`/?page_id=${id}`, target, ['1155', '1203', '2938'].includes(id) ? 'page (no equivalent yet)' : 'page');
}

// tags
for (const [nicename, name] of tags) {
	const target = `/tags/${tagSlug(name)}/`;
	if (!exists(target)) problems.push(`tag ${nicename}: ${target} is not in the build`);
	add(`/?tag=${nicename}`, target, 'tag');
}

// feed, search
for (const old of ['/?feed=rss2', '/?feed=rss', '/?feed=atom', '/feed/', '/feed', '/comments/feed/']) add(old, '/rss.xml', 'feed');
add('/?s=', '/archives/', 'search');

// Files in public/files/<year>/<month>/ came from WordPress' upload folder. The import cleaned odd
// characters out of some names, so the original name is looked up in the download cache.
const safeName = (name) => decodeURIComponent(name).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
const originalName = new Map();
const cacheDir = path.join(ROOT, 'import/cache');
for (const file of fs.existsSync(cacheDir) ? fs.readdirSync(cacheDir) : []) {
	const name = file.replace(/^[0-9a-f]{10}-/, '');
	originalName.set(safeName(name), name);
}
let images = 0;
for (const item of items) {
	const url = field(item, 'wp:attachment_url');
	if (field(item, 'wp:post_type') === 'attachment' && /\.(jpe?g|png|gif|webp|avif)$/i.test(url)) images++;
}
const filesDir = path.join(ROOT, 'public/files');
for (const year of fs.readdirSync(filesDir).filter((y) => /^\d{4}$/.test(y))) {
	for (const month of fs.readdirSync(path.join(filesDir, year))) {
		for (const name of fs.readdirSync(path.join(filesDir, year, month))) {
			add(`/wp-content/uploads/${year}/${month}/${originalName.get(name) ?? name}`, `/files/${year}/${month}/${name}`, 'file');
		}
	}
}

// files from the old blog outside of WordPress' upload folder
(function legacy(dir) {
	for (const entry of fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) legacy(full);
		else {
			const rel = path.relative(path.join(ROOT, 'public/files/legacy'), full).split(path.sep).join('/');
			add(`/${rel}`, `/files/legacy/${rel}`, 'file');
		}
	}
})(path.join(ROOT, 'public/files/legacy'));

const csv = ['old_url,new_path,kind', ...rows.map((r) => `${r.old},${r.target},${r.kind}`)].join('\n');
fs.mkdirSync(path.join(ROOT, 'redirects'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'redirects/wordpress-redirects.csv'), `${csv}\n`);

// 1) plain paths: Cloudflare Pages' `_redirects` file
const withQuery = rows.filter((r) => r.old.includes('?'));
const plain = rows.filter((r) => !r.old.includes('?'));
fs.writeFileSync(
	path.join(ROOT, 'public/_redirects'),
	`# Generated by scripts/make-redirects.mjs: addresses of the old WordPress blog\n${plain.map((r) => `${r.old.replace(HOST, '')} ${r.target} 301`).join('\n')}\n`,
);

// 2) addresses like /?p=12: a Pages Function for the home page (`_redirects` ignores the query string)
const table = {};
for (const r of withQuery) {
	const [, key, value] = r.old.match(/\?([^=]+)=(.*)$/);
	if (key === 's') table.s = r.target;
	else (table[key] ??= {})[value] = r.target;
}
fs.mkdirSync(path.join(ROOT, 'functions'), { recursive: true });
fs.writeFileSync(
	path.join(ROOT, 'functions/old-wordpress-urls.js'),
	`// Generated by scripts/make-redirects.mjs: query string addresses of the old WordPress blog.\nexport const redirects = ${JSON.stringify(table, null, '\t')};\n`,
);
fs.writeFileSync(path.join(ROOT, 'public/_routes.json'), `${JSON.stringify({ version: 1, include: ['/'], exclude: [] }, null, 2)}\n`);
const counts = rows.reduce((c, r) => ((c[r.kind] = (c[r.kind] ?? 0) + 1), c), {});
console.log(`${rows.length} redirects written to redirects/wordpress-redirects.csv`, counts);
console.log(`${images} image attachments are not redirected (the images live inside the build as optimized files)`);
if (problems.length) console.log('Problems:\n' + problems.map((p) => `- ${p}`).join('\n'));
