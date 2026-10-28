/** Plain-text summary of Markdown, used when a post has no `description`. */
export function plainExcerpt(markdown: string, max = 160): string {
	const text = markdown
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/<[^>]+>/g, ' ')
		.replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
		.replace(/[*_`~]+/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	if (text.length <= max) return text;
	const cut = text.slice(0, max);
	return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : max).trimEnd()}…`;
}
