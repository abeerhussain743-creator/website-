/** Phase 6: Satori template rendering → PNG. */
export interface DesignRenderer {
  render(input: {
    templateId: string;
    brandKit: unknown;
    slides: unknown[];
  }): Promise<{ png: Uint8Array }>;
}

export function assertPhase6(): never {
  throw new Error("@postpilot/design is not implemented until Phase 6");
}
