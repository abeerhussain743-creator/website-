import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { loadFonts } from "./fonts.js";
import { buildTemplateElement } from "./templates.js";
import {
  PLATFORM_SIZES,
  renderInputSchema,
  type RenderInput,
  type TemplateFamily,
} from "./types.js";

export async function renderPostPng(raw: RenderInput): Promise<{
  png: Buffer;
  width: number;
  height: number;
  family: TemplateFamily;
  svg: string;
}> {
  const input = renderInputSchema.parse(raw);
  const size = PLATFORM_SIZES[input.size];
  const fonts = await loadFonts();
  const element = buildTemplateElement({
    family: input.family,
    width: size.width,
    height: size.height,
    brandKit: input.brandKit,
    content: input.content,
  });

  const svg = await satori(element as never, {
    width: size.width,
    height: size.height,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight as 400 | 700,
      style: "normal" as const,
    })),
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size.width },
  });
  const png = Buffer.from(resvg.render().asPng());

  return {
    png,
    width: size.width,
    height: size.height,
    family: input.family,
    svg,
  };
}
