import { createRequire } from 'node:module';
import { defineHastPlugin } from 'satteri';

const require = createRequire(import.meta.url);

// Iconify icon sets (`@iconify-json/<prefix>`) are loaded on first use, so any installed set works.
const sets = new Map();
function iconSet(prefix) {
	if (!sets.has(prefix)) {
		try {
			sets.set(prefix, require(`@iconify-json/${prefix}/icons.json`));
		} catch {
			sets.set(prefix, null);
		}
	}
	return sets.get(prefix);
}

/** The inline SVG of an icon, or `undefined` when the set or the icon does not exist. */
function svgFor(prefix, name, size) {
	const set = iconSet(prefix);
	if (!set) return;
	// An alias points at another icon and may override some of its fields.
	let icon = set.icons[name];
	if (!icon && set.aliases?.[name]) {
		const { parent, ...overrides } = set.aliases[name];
		icon = set.icons[parent] && { ...set.icons[parent], ...overrides };
	}
	if (!icon) return;
	const dimension = (key) => icon[key] ?? set[key] ?? 24;
	const style = size ? ` style="width:${size};height:${size}"` : '';
	return `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension('width')} ${dimension('height')}"${style} aria-hidden="true" focusable="false">${icon.body}</svg>`;
}

/**
 * Turns `:mdi-nas:` into the inline SVG of that icon, taken from the Iconify set `@iconify-json/mdi`.
 * Any installed set works the same way (`:simple-icons-proton:`). An optional size follows an `=`:
 * `:mdi-nas=4:` is 4em, `:mdi-nas=2.5rem:` and `:mdi-nas=48px:` set the unit. Code is left alone.
 */
export default defineHastPlugin({
	name: 'icons',
	text(node, ctx) {
		if (!node.value.includes(':')) return;
		for (let parent = ctx.parent(node); parent; parent = ctx.parent(parent)) {
			if (parent.type === 'element' && (parent.tagName === 'code' || parent.tagName === 'pre')) return;
		}
		const parts = node.value.split(/:([a-z][a-z0-9]*(?:-[a-z0-9]+)+)(?:=(\d+(?:\.\d+)?(?:em|rem|px)?))?:/);
		if (parts.length === 1) return;
		const nodes = [];
		for (let i = 0; i < parts.length; i += 3) {
			if (parts[i]) nodes.push({ type: 'text', value: parts[i] });
			const part = parts[i + 1];
			if (!part) continue;
			const size = parts[i + 2] && (/\d$/.test(parts[i + 2]) ? `${parts[i + 2]}em` : parts[i + 2]);
			// A set prefix has one or more words (`mdi`, `simple-icons`); try the shortest first.
			const words = part.split('-');
			let svg;
			for (let n = 1; n < words.length && !svg; n++) {
				svg = svgFor(words.slice(0, n).join('-'), words.slice(n).join('-'), size);
			}
			if (svg) nodes.push({ type: 'raw', value: svg });
			else if (iconSet(words[0])) throw new Error(`Unknown icon :${part}: in ${ctx.fileURL?.pathname ?? 'a post'}`);
			else nodes.push({ type: 'text', value: `:${part}${parts[i + 2] ? `=${parts[i + 2]}` : ''}:` }); // not an icon, keep the text as written
		}
		ctx.replaceNode(node, nodes);
	},
});
