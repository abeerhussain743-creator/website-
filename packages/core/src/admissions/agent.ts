export type KnowledgeEntry = {
  id: string;
  category: string;
  title: string;
  body: string;
};

export type AdmissionsReply = {
  text: string;
  sources: string[];
  handoff: boolean;
  suggestedAction?: "book_visit" | "create_task" | "none";
};

const HANDOFF_PATTERNS =
  /\b(human|person|agent|staff|principal|talk to|call me|insan|insan se|baat kar|شکایت)\b/i;

const FRUSTRATION =
  /\b(useless|idiot|angry|fraud|scam|bewakoof|bakwas|ghalat|غلط|بیوقوف)\b/i;

const FEE_ASK =
  /\b(fee|fees|tuition|charges|kitni|price|cost|فیس|رقم)\b/i;

/**
 * Grounded admissions reply — never invents fees.
 * Only uses knowledge base entries; otherwise hands off.
 */
export function craftAdmissionsReply(input: {
  message: string;
  knowledge: KnowledgeEntry[];
  languageHint?: "UR" | "ROMAN_UR" | "EN";
}): AdmissionsReply {
  const msg = input.message.trim();
  if (!msg) {
    return {
      text: "Assalam o alaikum. How can we help with admissions today?",
      sources: [],
      handoff: false,
      suggestedAction: "none",
    };
  }

  if (HANDOFF_PATTERNS.test(msg) || FRUSTRATION.test(msg)) {
    return {
      text:
        input.languageHint === "UR"
          ? "جی ضرور — ایک سٹاف ممبر جلد جواب دے گا۔"
          : "Sure — a staff member will reply shortly.",
      sources: [],
      handoff: true,
      suggestedAction: "create_task",
    };
  }

  const scored = input.knowledge
    .map((k) => ({
      k,
      score: scoreOverlap(msg, `${k.title} ${k.body} ${k.category}`),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (FEE_ASK.test(msg)) {
    const feeEntries = scored.filter((s) =>
      /fee|tuition|charges|فیس/i.test(`${s.k.category} ${s.k.title} ${s.k.body}`),
    );
    const classMention = msg.match(/class\s*(\d+)/i)?.[1];
    const matchedFee = feeEntries.find((s) => {
      if (!classMention) return true;
      return new RegExp(`class\\s*${classMention}\\b`, "i").test(
        `${s.k.title} ${s.k.body}`,
      );
    });
    if (!matchedFee) {
      return {
        text:
          "I don't have the exact fee in our knowledge base. A staff member will confirm the current fee for you.",
        sources: [],
        handoff: true,
        suggestedAction: "create_task",
      };
    }
    const top = matchedFee.k;
    return {
      text: `${top.body}\n\nWould you like to book a campus visit?`,
      sources: [top.id],
      handoff: false,
      suggestedAction: "book_visit",
    };
  }

  if (scored.length === 0) {
    return {
      text: "Thank you for your message. A staff member will follow up with accurate details shortly.",
      sources: [],
      handoff: true,
      suggestedAction: "create_task",
    };
  }

  const top = scored[0]!.k;
  return {
    text: `${top.body}\n\nIf you'd like, I can book a visit or demo for you.`,
    sources: [top.id],
    handoff: false,
    suggestedAction: /visit|demo|tour|آؤ|demo/i.test(msg)
      ? "book_visit"
      : "none",
  };
}

function scoreOverlap(message: string, corpus: string): number {
  const tokens = message
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06ff]+/)
    .filter((t) => t.length > 2);
  const hay = corpus.toLowerCase();
  return tokens.reduce((n, t) => (hay.includes(t) ? n + 1 : n), 0);
}

export const ADMISSIONS_PROMPT_VERSION = "admissions-v1";
