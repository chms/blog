// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import externalLinks from './src/plugins/external-links.mjs';
import moreMarker from './src/plugins/more-marker.mjs';

const site = 'https://example.com';

// https://astro.build/config
export default defineConfig({
	site,
	integrations: [mdx(), sitemap()],
	markdown: {
		processor: satteri({ hastPlugins: [moreMarker, externalLinks(site)] }),
	},
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Domitian',
			cssVariable: '--font-domitian',
			fallbacks: ['serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/Domitian-Roman.woff2'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/Domitian-Italic.woff2'],
						weight: 400,
						style: 'italic',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/Domitian-Bold.woff2'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/Domitian-BoldItalic.woff2'],
						weight: 700,
						style: 'italic',
						display: 'swap',
					},
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'Jost',
			cssVariable: '--font-jost',
			fallbacks: ['sans-serif'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/Jost-VF.woff2'],
						weight: '100 900',
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
		{
			provider: fontProviders.local(),
			name: 'Ubuntu Sans Mono',
			cssVariable: '--font-ubuntu-sans-mono',
			fallbacks: ['monospace'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/UbuntuSansMono-VariableFont_wght.woff2'],
						weight: '400 700',
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/UbuntuSansMono-Italic-VariableFont_wght.woff2'],
						weight: '400 700',
						style: 'italic',
						display: 'swap',
					},
				],
			},
		},
	],
});
