// Cloudflare Worker in front of the static files (see wrangler.jsonc: it only runs for "/").
// Addresses of the old WordPress blog such as /?p=2029 are redirected to the new address,
// everything else gets the normal home page.
import { redirects } from './old-wordpress-urls.js';

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		for (const [key, value] of url.searchParams) {
			const table = redirects[key];
			const target = typeof table === 'string' ? table : table?.[value];
			if (target) return Response.redirect(new URL(target, url).href, 301);
		}
		return env.ASSETS.fetch(request);
	},
};
