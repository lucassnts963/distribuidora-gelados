// Gera os ícones PWA (public/icons/*.png) a partir do símbolo da marca Giro
// (três arcos em rotação — ver brand/giro-identity.html). Rodar de novo
// (`node scripts/generate-icons.mjs`) sempre que o desenho mudar; os PNGs
// gerados ficam versionados, não é build step do app.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const ORANGE = "#F05D06";

const mark = `
  <path d="M180,100 A80,80 0 0 1 86.11,178.78" fill="none" stroke="#ffffff" stroke-width="17" stroke-linecap="round" opacity="0.95"/>
  <path d="M60,169.28 A80,80 0 0 1 38.72,48.58" fill="none" stroke="#ffffff" stroke-width="17" stroke-linecap="round" opacity="0.75"/>
  <path d="M60,30.72 A80,80 0 0 1 175.18,72.64" fill="none" stroke="#ffffff" stroke-width="17" stroke-linecap="round" opacity="0.55"/>
  <circle cx="180" cy="100" r="12" fill="#ffffff"/>
  <circle cx="60" cy="169.28" r="12" fill="#ffffff" opacity="0.85"/>
  <circle cx="60" cy="30.72" r="12" fill="#ffffff" opacity="0.7"/>
`;

function icon({ maskable = false } = {}) {
  const s = 512;
  const r = maskable ? 0 : 96; // maskable preenche o quadrado todo, sem cantos arredondados
  const spanFrac = maskable ? 0.52 : 0.62; // maskable precisa de mais margem (crop circular do SO)
  const span = s * spanFrac;
  const offset = (s - span) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" rx="${r}" fill="${ORANGE}"/>
    <svg x="${offset}" y="${offset}" width="${span}" height="${span}" viewBox="0 0 200 200">${mark}</svg>
  </svg>`;
}

mkdirSync("public/icons", { recursive: true });

const jobs = [
  { name: "icon-192.png", size: 192, svg: icon() },
  { name: "icon-512.png", size: 512, svg: icon() },
  { name: "icon-maskable-512.png", size: 512, svg: icon({ maskable: true }) },
  { name: "apple-touch-icon.png", size: 180, svg: icon() },
];

for (const job of jobs) {
  const out = await sharp(Buffer.from(job.svg)).resize(job.size, job.size).png().toBuffer();
  writeFileSync(`public/icons/${job.name}`, out);
  console.log("gerado", job.name);
}
