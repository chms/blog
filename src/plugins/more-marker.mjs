import { defineHastPlugin } from 'satteri';

const marker = {
	type: 'element',
	tagName: 'div',
	properties: { className: ['more-marker'] },
	children: [],
};

/**
 * Turns a WordPress-style `<!--more-->` comment into `<div class="more-marker">`,
 * so list pages can hide everything after it behind a "Read more" link.
 */
export default defineHastPlugin({
	name: 'more-marker',
	comment(node, ctx) {
		if (node.value.trim() === 'more') ctx.replaceNode(node, marker);
	},
	raw(node, ctx) {
		if (/^<!--\s*more\s*-->$/.test(node.value.trim())) ctx.replaceNode(node, marker);
	},
});
