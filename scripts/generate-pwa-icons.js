const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SVG_PATH = path.join(ROOT, "public/logo-bianco.svg");
const OUT_DIR = path.join(ROOT, "public/icons");
const BACKGROUND = { r: 22, g: 29, b: 42, alpha: 1 };

async function renderIcon(size, { maskable = false } = {}) {
  const svg = fs.readFileSync(SVG_PATH);
  const padRatio = maskable ? 0.22 : 0.14;
  const padding = Math.round(size * padRatio);
  const inner = Math.max(1, size - padding * 2);
  const logo = await sharp(svg, { density: 384 })
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const jobs = [
    { file: "icon-192.png", size: 192 },
    { file: "icon-512.png", size: 512 },
    { file: "icon-192-maskable.png", size: 192, maskable: true },
    { file: "icon-512-maskable.png", size: 512, maskable: true },
    { file: "apple-touch-icon.png", size: 180 },
  ];

  for (const job of jobs) {
    const image = await renderIcon(job.size, { maskable: job.maskable });
    const dest = path.join(OUT_DIR, job.file);
    await image.toFile(dest);
    console.log("wrote", dest);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
