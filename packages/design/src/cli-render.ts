import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { renderPostPng } from "./render.js";
import { renderInputSchema } from "./types.js";

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    console.error("Usage: node cli-render.js <input.json> <output.png>");
    process.exit(1);
  }
  const raw = JSON.parse(await readFile(inputPath, "utf8"));
  const input = renderInputSchema.parse(raw);
  const result = await renderPostPng(input);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.png);
  process.stdout.write(
    JSON.stringify({
      width: result.width,
      height: result.height,
      family: result.family,
      byteSize: result.png.byteLength,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
