import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Derives every brand asset the app renders from the single source lockup
 * `public/logo-black.png`.
 *
 * The supplied white lockup is only 772px wide, so re-tinting the alpha mask of
 * the 6144px black one keeps both themes equally crisp.
 *
 * Run with `npm run brand:assets` after replacing the source logo.
 */

const SOURCE = path.join(process.cwd(), "public", "logo-black.png");
const BRAND_DIR = path.join(process.cwd(), "public", "brand");
const APP_DIR = path.join(process.cwd(), "app");

/** Off-white of the supplied inverted lockup, reused when re-tinting. */
const INK_LIGHT = { r: 244, g: 249, b: 255 };

/** Width of the gear glyph inside the trimmed lockup, before the wordmark gap. */
const MARK_WIDTH_RATIO = 2339 / 5639;

const WORDMARK_WIDTH = 1800;
const MARK_SIZE = 512;
const ICO_SIZES = [16, 32, 48];

type Ink = { r: number; g: number; b: number };

/** Repaints a transparent PNG in a flat colour, keeping its alpha mask. */
async function tint(source: Buffer, ink: Ink): Promise<Buffer> {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    data[i] = ink.r;
    data[i + 1] = ink.g;
    data[i + 2] = ink.b;
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/** Centres artwork on a transparent square with breathing room on every side. */
async function squarePad(source: Buffer, size: number): Promise<Buffer> {
  const inner = Math.round(size * 0.84);
  return sharp(source)
    .resize(inner, inner, { fit: "contain", background: "#00000000" })
    .extend({
      top: Math.floor((size - inner) / 2),
      bottom: Math.ceil((size - inner) / 2),
      left: Math.floor((size - inner) / 2),
      right: Math.ceil((size - inner) / 2),
      background: "#00000000",
    })
    .png()
    .toBuffer();
}

/**
 * White circular card with the mark centred. Transparent corners so the
 * browser-tab favicon reads as a round holder, not a square tile.
 */
async function circularWhiteCard(source: Buffer, size: number): Promise<Buffer> {
  const onWhite = await sharp(source)
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .png()
    .toBuffer();

  const mask = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
        `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff"/>` +
        `</svg>`
    )
  )
    .png()
    .toBuffer();

  return sharp(onWhite)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/**
 * One favicon frame as a circular white card. Re-encoding from raw pixels is
 * required so PNG-in-ICO frames stay RGBA (transparent corners outside the disc).
 */
async function icoFrame(source: Buffer, side: number): Promise<Buffer> {
  const pixels = await sharp(source)
    .resize(side, side)
    .ensureAlpha()
    .raw()
    .toBuffer();

  return sharp(pixels, { raw: { width: side, height: side, channels: 4 } })
    .png()
    .toBuffer();
}

/** Packs PNG frames into an .ico container so `/favicon.ico` keeps resolving. */
function buildIco(frames: Buffer[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  const directory = Buffer.alloc(16 * frames.length);
  let offset = header.length + directory.length;

  frames.forEach((frame, index) => {
    const entry = index * 16;
    const side = ICO_SIZES[index];
    directory.writeUInt8(side === 256 ? 0 : side, entry);
    directory.writeUInt8(side === 256 ? 0 : side, entry + 1);
    directory.writeUInt8(0, entry + 2);
    directory.writeUInt8(0, entry + 3);
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(frame.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });

  return Buffer.concat([header, directory, ...frames]);
}

async function write(target: string, buffer: Buffer) {
  await writeFile(target, buffer);
  const { width, height } = await sharp(buffer).metadata();
  console.log(
    `  ${path.relative(process.cwd(), target)} — ${width}x${height}, ${(buffer.length / 1024).toFixed(1)} KB`
  );
}

async function main() {
  await mkdir(BRAND_DIR, { recursive: true });

  const lockup = await sharp(SOURCE)
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });

  const { width, height } = lockup.info;
  const mark = await sharp(lockup.data)
    .extract({
      left: 0,
      top: 0,
      width: Math.round(width * MARK_WIDTH_RATIO),
      height,
    })
    .trim({ threshold: 1 })
    .toBuffer();

  console.log("Brand assets:");

  const wordmarkDark = await sharp(lockup.data)
    .resize({ width: WORDMARK_WIDTH })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await write(path.join(BRAND_DIR, "wordmark-dark.png"), wordmarkDark);

  const wordmarkLight = await sharp(await tint(lockup.data, INK_LIGHT))
    .resize({ width: WORDMARK_WIDTH })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await write(path.join(BRAND_DIR, "wordmark-light.png"), wordmarkLight);

  await write(
    path.join(BRAND_DIR, "mark-dark.png"),
    await squarePad(mark, MARK_SIZE)
  );
  await write(
    path.join(BRAND_DIR, "mark-light.png"),
    await squarePad(await tint(mark, INK_LIGHT), MARK_SIZE)
  );

  // Favicon / tab icon: same mark on a circular white card (transparent corners).
  // Apple touch icon stays a square white tile — iOS applies its own squircle mask.
  const iconMark = await squarePad(mark, 512);
  const circularIcon = await circularWhiteCard(iconMark, 512);
  await write(path.join(APP_DIR, "icon.png"), circularIcon);
  await write(
    path.join(APP_DIR, "apple-icon.png"),
    await sharp(iconMark)
      .resize(180, 180)
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer()
  );

  await writeFile(
    path.join(APP_DIR, "favicon.ico"),
    buildIco(
      await Promise.all(ICO_SIZES.map((side) => icoFrame(circularIcon, side)))
    )
  );
  console.log("  app/favicon.ico — 16/32/48");

  await write(
    path.join(APP_DIR, "opengraph-image.png"),
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 4,
        background: "#ffffff",
      },
    })
      .composite([
        {
          input: await sharp(lockup.data).resize({ width: 760 }).toBuffer(),
          gravity: "centre",
        },
      ])
      .png()
      .toBuffer()
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
