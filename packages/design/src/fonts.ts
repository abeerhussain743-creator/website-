import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type FontCache = { name: string; data: ArrayBuffer; weight: number }[];

let cache: FontCache | null = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadFromDisk(): Promise<FontCache | null> {
  try {
    const fontsDir = path.resolve(__dirname, "../fonts");
    const regular = await readFile(path.join(fontsDir, "Inter-Regular.ttf"));
    const bold = await readFile(path.join(fontsDir, "Inter-Bold.ttf"));
    return [
      {
        name: "Inter",
        data: regular.buffer.slice(
          regular.byteOffset,
          regular.byteOffset + regular.byteLength,
        ),
        weight: 400,
      },
      {
        name: "Inter",
        data: bold.buffer.slice(
          bold.byteOffset,
          bold.byteOffset + bold.byteLength,
        ),
        weight: 700,
      },
    ];
  } catch {
    return null;
  }
}

async function fetchGoogleFont(
  family: string,
  weight: number,
): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&display=swap`,
    {
      headers: {
        // Request TTF/OTF capable user agent
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    },
  ).then((r) => r.text());
  const match = css.match(/src: url\(([^)]+)\)/);
  if (!match?.[1]) {
    throw new Error(`Could not resolve font URL for ${family} ${weight}`);
  }
  const res = await fetch(match[1]);
  if (!res.ok) throw new Error(`Font download failed: ${family}`);
  return res.arrayBuffer();
}

export async function loadFonts(): Promise<FontCache> {
  if (cache) return cache;
  const disk = await loadFromDisk();
  if (disk) {
    cache = disk;
    return cache;
  }

  try {
    const [regular, bold] = await Promise.all([
      fetchGoogleFont("Inter", 400),
      fetchGoogleFont("Inter", 700),
    ]);
    cache = [
      { name: "Inter", data: regular, weight: 400 },
      { name: "Inter", data: bold, weight: 700 },
    ];
    return cache;
  } catch (err) {
    throw new Error(
      `Unable to load fonts for design rendering. Place Inter-Regular.ttf and Inter-Bold.ttf in packages/design/fonts. ${String(err)}`,
    );
  }
}
