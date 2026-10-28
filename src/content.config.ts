import fs from 'node:fs';
import path from 'node:path';
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const BLOG_DIR = './src/content/blog';

/**
 * The URL of a post is its file name (`/blog/<id>/`), without the year folder. When two posts share
 * a file name the older one keeps it and the newer ones get `-2`, `-3`, ... (the way WordPress does).
 */
let blogIds = new Map<string, string>();
function idFor(entry: string): string {
	if (!blogIds.has(entry)) blogIds = computeBlogIds();
	return blogIds.get(entry) ?? path.basename(entry).replace(/\.(md|mdx)$/, '');
}

function computeBlogIds() {
	const posts: { entry: string; name: string; date: number }[] = [];
	const walk = (dir: string) => {
		for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, item.name);
			if (item.isDirectory()) walk(full);
			else if (/\.(md|mdx)$/.test(item.name)) {
				const date = fs.readFileSync(full, 'utf8').match(/^pubDate:\s*['"]?(.+?)['"]?\s*$/m)?.[1];
				posts.push({
					entry: path.relative(BLOG_DIR, full).split(path.sep).join('/'),
					name: item.name.replace(/\.(md|mdx)$/, ''),
					date: Date.parse(date ?? '') || 0,
				});
			}
		}
	};
	walk(BLOG_DIR);
	posts.sort((a, b) => a.date - b.date || a.entry.localeCompare(b.entry));
	const taken = new Set<string>();
	const ids = new Map<string, string>();
	for (const post of posts) {
		let id = post.name;
		for (let n = 2; taken.has(id); n++) id = `${post.name}-${n}`;
		taken.add(id);
		ids.set(post.entry, id);
	}
	return ids;
}

const blog = defineCollection({
	// Load Markdown and MDX files in `src/content/blog/`, kept in one folder per year.
	loader: glob({
		base: './src/content/blog',
		pattern: '**/*.{md,mdx}',
		generateId: ({ entry }) => idFor(entry),
	}),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			// Optional: a plain-text summary of the post is used when it is missing.
			description: z.string().optional(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			tags: z.array(z.string()).default([]),
		}),
});

// Standalone pages such as "About", one Markdown file each in `src/content/pages/`.
// Pages in a sub-folder (`projects/…`) live under that page's address.
const pages = defineCollection({
	loader: glob({ base: './src/content/pages', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
	}),
});

export const collections = { blog, pages };
