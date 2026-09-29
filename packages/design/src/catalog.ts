export {
  PLATFORM_SIZES,
  platformSizeSchema,
  templateFamilySchema,
  brandKitSchema,
  designContentSchema,
  renderInputSchema,
} from "./types.js";
export type {
  BrandKitInput,
  DesignContent,
  TemplateFamily,
  PlatformSize,
  RenderInput,
} from "./types.js";

export const TEMPLATE_CATALOG: {
  id: import("./types.js").TemplateFamily;
  name: string;
  bestFor: string;
}[] = [
  { id: "minimal", name: "Minimal", bestFor: "Clean announcements" },
  { id: "bold", name: "Bold", bestFor: "High-impact hooks" },
  { id: "editorial", name: "Editorial", bestFor: "Thought leadership" },
  { id: "corporate", name: "Corporate", bestFor: "B2B / LinkedIn" },
  { id: "playful", name: "Playful", bestFor: "Community & lifestyle" },
  { id: "luxury", name: "Luxury", bestFor: "Premium brands" },
  { id: "quote", name: "Quote", bestFor: "POV & manifesto lines" },
  { id: "stat", name: "Stat", bestFor: "Proof & metrics" },
  { id: "listicle", name: "Listicle", bestFor: "Carousel lessons" },
  { id: "tip", name: "Tip", bestFor: "Educational single posts" },
];
