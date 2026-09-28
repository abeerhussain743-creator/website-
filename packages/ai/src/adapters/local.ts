import { generatePostLocal } from "../local-engine.js";
import { generateBrandDna, type BrandDnaDocument } from "../brand-dna.js";
import type { BrandContext, GeneratePostInput } from "../schemas.js";
import type { WebsiteSignals } from "../website-ingest.js";
import type { LlmAdapter, LlmCost, LlmGenerateResult } from "./llm.js";

function applyFeedback(
  post: ReturnType<typeof generatePostLocal>,
  feedback?: string,
) {
  if (!feedback?.trim()) return post;
  const note = feedback.trim().slice(0, 240);
  const caption = `${post.caption}\n\n— Revision note applied: ${note}`;
  const hook = post.selectedHook.includes("Revision")
    ? post.selectedHook
    : `${post.selectedHook.replace(/\.$/, "")}.`;
  return {
    ...post,
    selectedHook: hook,
    caption,
    provider: "local-creative-engine+feedback",
  };
}

function mergeWebsiteIntoDna(
  dna: BrandDnaDocument,
  website?: WebsiteSignals,
): BrandDnaDocument {
  if (!website) return dna;
  const extraDo = website.headings.slice(0, 2).map((h) => `Echo site theme: ${h}`);
  const keywords = website.keywords.slice(0, 5);
  return {
    ...dna,
    doList: [...dna.doList, ...extraDo].slice(0, 10),
    audiencePersona: {
      ...dna.audiencePersona,
      summary:
        website.description ||
        website.aboutSnippet ||
        dna.audiencePersona.summary,
    },
    provenHooks: keywords.length
      ? keywords.map((k) => `People search for “${k}” — lead with that language.`)
      : dna.provenHooks,
    rawDocument: [
      dna.rawDocument,
      "",
      "## Website signals",
      `URL: ${website.url}`,
      `Title: ${website.title || "—"}`,
      `Description: ${website.description || website.aboutSnippet || "—"}`,
      `Source: ${website.source}`,
    ].join("\n"),
  };
}

export class LocalLlmAdapter implements LlmAdapter {
  readonly name = "local";

  async generatePost(input: GeneratePostInput): Promise<LlmGenerateResult> {
    const base = generatePostLocal(input);
    const post = applyFeedback(base, input.feedback);
    const cost: LlmCost = {
      model: "local-creative-engine",
      provider: "local",
      inputTokens: 0,
      outputTokens: Math.ceil(post.caption.length / 4),
      costUsd: 0,
    };
    return { post, cost };
  }

  async generateBrandDna(input: {
    brand: BrandContext;
    website?: WebsiteSignals;
  }) {
    const dna = mergeWebsiteIntoDna(generateBrandDna(input.brand), input.website);
    return {
      dna,
      cost: {
        model: "local-brand-dna",
        provider: "local",
        inputTokens: 0,
        outputTokens: Math.ceil((dna.rawDocument?.length ?? 0) / 4),
        costUsd: 0,
      } satisfies LlmCost,
    };
  }
}
