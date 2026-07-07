import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const logoId = process.argv[2] || 'default';
const svgPath = resolve(root, 'public', 'logos', `${logoId}.svg`);
const fallbackPath = resolve(root, 'public', 'icon.svg');

let svg;
try { svg = readFileSync(svgPath); } catch {
  try { svg = readFileSync(fallbackPath); console.log(`Logo "${logoId}" not found, using fallback`); } catch {
    console.log('No logo SVG found, generating placeholder');
    svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="#F2EDE2"/><path d="M128 32 L128 32 Q192 96 192 160 Q192 208 128 224 Q64 208 64 160 Q64 96 128 32Z" fill="#23306B" opacity="0.9"/><circle cx="128" cy="128" r="32" fill="#FF5DA2"/></svg>');
  }
}

const sizes = [32, 128, 256, 512, 1024];
const outDir = resolve(root, 'src-tauri', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(resolve(outDir, `${size}x${size}.png`));
}

await sharp(svg).resize(256, 256).png().toFile(resolve(outDir, 'icon.png'));
await sharp(svg).resize(256, 256).png().toFile(resolve(outDir, 'icon.ico'));
console.log(`Icons generated from "${logoId}" in src-tauri/icons/`);
