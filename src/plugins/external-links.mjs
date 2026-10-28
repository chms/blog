import { defineHastPlugin } from 'satteri';

/**
 * Opens links to other sites in a new tab. Relative links and links to `site`
 * stay in the same tab.
 */
export default function externalLinks(site) {
	const ownHost = new URL(site).host;
	return defineHastPlugin({
		name: 'external-links',
		element: {
			filter: ['a'],
			visit(node, ctx) {
				const href = node.properties?.href;
				if (typeof href !== 'string' || !/^(https?:)?\/\//.test(href)) return;
				if (new URL(href, site).host === ownHost) return;
				ctx.setProperty(node, 'target', '_blank');
				ctx.setProperty(node, 'rel', 'noopener');
			},
		},
	});
}
