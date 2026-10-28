// Cloudflare Pages Function, only runs for the home page ("/", see public/_routes.json).
// Addresses of the old WordPress blog such as /?p=2029 are redirected to the new address,
// everything else gets the normal home page.
import { redirects } from './old-wordpress-urls.js';

export function onRequest(context) {
	const url = new URL(context.request.url);
	for (const [key, value] of url.searchParams) {
		const table = redirects[key];
		const target = typeof table === 'string' ? table : table?.[value];
		if (target) return Response.redirect(new URL(target, url).href, 301);
	}
	return context.next();
}
