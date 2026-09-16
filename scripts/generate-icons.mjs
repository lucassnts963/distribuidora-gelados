// Gera os ícones PWA (public/icons/*.png) a partir de um SVG simples.
// Rodar uma vez (`node scripts/generate-icons.mjs`) sempre que o desenho mudar;
// os PNGs gerados ficam versionados, não é build step do app.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const BRAND = "#f05d06";

const box = (opacityLeft, opacityRight) => `
  <polygon points="256,116 376,186 256,256 136,186" fill="#ffffff"/>
  <polygon points="136,186 256,256 256,396 136,326" fill="#ffffff" fill-opacity="${opacityLeft}"/>
  <polygon points="256,256 376,186 376,326 256,396" fill="#ffffff" fill-opacity="${opacityRight}"/>
`;

function icon({ pad = 0 } = {}) {
  const s = 512;
  const r = pad ? 0 : 96; // maskable (pad>0) preenche o quadrado todo, sem cantos arredondados
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" rx="${r}" fill="${BRAND}"/>
    <g transform="translate(0 ${pad ? 18 : 0}) scale(${pad ? 0.82 : 1})" transform-origin="256 256">
      ${box(0.75, 0.9)}
    </g>
  </svg>`;
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { name: "icon-192.png", size: 192, svg: icon() },
  { name: "icon-512.png", size: 512, svg: icon() },
  { name: "icon-maskable-512.png", size: 512, svg: icon({ pad: 1 }) },
  { name: "apple-touch-icon.png", size: 180, svg: icon() },
];

for (const job of jobs) {
  const out = await sharp(Buffer.from(job.svg)).resize(job.size, job.size).png().toBuffer();
  writeFileSync(`public/icons/${job.name}`, out);
  console.log("gerado", job.name);
}
