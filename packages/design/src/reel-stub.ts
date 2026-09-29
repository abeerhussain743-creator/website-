/**
 * Remotion-style reel stub — produces a storyboard JSON + optional SVG frames.
 * Full Remotion composition lands when video rendering is enabled in deploy.
 */
export type ReelStoryboard = {
  provider: "remotion-stub";
  durationSec: number;
  fps: number;
  width: number;
  height: number;
  scenes: Array<{
    atSec: number;
    durationSec: number;
    onScreenText: string;
    visual: string;
  }>;
  voiceover?: string;
};

export function buildReelStoryboard(input: {
  businessName: string;
  hook: string;
  scenes?: string[];
  onScreenText?: string[];
  voiceover?: string;
  brandColors?: string[];
}): ReelStoryboard {
  const scenes = input.scenes?.length
    ? input.scenes
    : [
        "Open on branded color field + hook text",
        "Cut to product/atmosphere detail",
        "Show tip cards on-screen",
        "End on logo + CTA",
      ];
  const texts = input.onScreenText?.length
    ? input.onScreenText
    : [input.hook, input.businessName, "Save this"];

  return {
    provider: "remotion-stub",
    durationSec: Math.max(8, scenes.length * 2.5),
    fps: 30,
    width: 1080,
    height: 1920,
    voiceover: input.voiceover,
    scenes: scenes.map((visual, i) => ({
      atSec: i * 2.5,
      durationSec: 2.5,
      onScreenText: texts[i % texts.length]!,
      visual: `${visual} · palette ${input.brandColors?.join(" / ") ?? "brand"}`,
    })),
  };
}

export function storyboardToSvgFrames(board: ReelStoryboard): string[] {
  return board.scenes.map((s, i) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${board.width}" height="${board.height}" viewBox="0 0 ${board.width} ${board.height}">
  <rect width="100%" height="100%" fill="#0F3D3E"/>
  <text x="80" y="40%" fill="#FAF7F2" font-family="Georgia, serif" font-size="64">${escapeXml(s.onScreenText.slice(0, 42))}</text>
  <text x="80" y="48%" fill="#E8D5B7" font-family="system-ui" font-size="28">${escapeXml(s.visual.slice(0, 60))}</text>
  <text x="80" y="90%" fill="#FAF7F2" opacity="0.5" font-family="system-ui" font-size="22">frame ${i + 1} · remotion-stub</text>
</svg>`;
  });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
