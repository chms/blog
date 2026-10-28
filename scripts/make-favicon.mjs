#!/usr/bin/env node
// Builds `public/favicon.ico` (16, 32 and 48 px, PNG-compressed) from `public/favicon.svg`,
// centering the artwork in a square.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const svg = fs.readFileSync(path.join(root, 'public/favicon.svg'));
const sizes = [16, 32, 48];

const images = await Promise.all(
	sizes.map((size) =>
		sharp(svg, { density: 400 })
			.resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.png()
			.toBuffer(),
	),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(images.length, 4);
let offset = header.length + 16 * images.length;
const entries = images.map((png, i) => {
	const entry = Buffer.alloc(16);
	entry.writeUInt8(sizes[i], 0);
	entry.writeUInt8(sizes[i], 1);
	entry.writeUInt16LE(1, 4); // color planes
	entry.writeUInt16LE(32, 6); // bits per pixel
	entry.writeUInt32LE(png.length, 8);
	entry.writeUInt32LE(offset, 12);
	offset += png.length;
	return entry;
});
fs.writeFileSync(path.join(root, 'public/favicon.ico'), Buffer.concat([header, ...entries, ...images]));
console.log(`public/favicon.ico written (${sizes.join(', ')} px)`);
