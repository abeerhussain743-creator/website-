import type { BrandKitInput, DesignContent, TemplateFamily } from "./types.js";

type El = {
  type: string;
  props: Record<string, unknown>;
};

function h(
  type: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
): El {
  const flat = children
    .flat()
    .filter((c) => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: {
      ...(props ?? {}),
      children: flat.length === 1 ? flat[0] : flat,
    },
  };
}

function contrastText(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#FFFFFF";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? "#14212B" : "#FAF7F2";
}

export function buildTemplateElement(input: {
  family: TemplateFamily;
  width: number;
  height: number;
  brandKit: BrandKitInput;
  content: DesignContent;
}): El {
  const { family, width, height, brandKit, content } = input;
  const primary = brandKit.primaryColor;
  const accent = brandKit.accentColor;
  const secondary = brandKit.secondaryColor;
  const bg = brandKit.backgroundColor;
  const text = brandKit.textColor;
  const pad = Math.round(width * 0.08);

  const slide =
    content.slides && content.slideIndex != null
      ? content.slides[content.slideIndex]
      : undefined;
  const headline = slide?.title ?? content.headline;
  const body = slide?.body ?? content.body ?? content.subhead ?? "";
  const emphasis = slide?.emphasis;

  if (family === "bold") {
    return h(
      "div",
      {
        style: {
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: `linear-gradient(155deg, ${primary} 0%, #0B1313 70%)`,
          color: contrastText(primary),
          padding: pad,
          fontFamily: "Inter",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.028),
              letterSpacing: 4,
              textTransform: "uppercase",
              opacity: 0.8,
            },
          },
          content.badge || content.businessName,
        ),
        h(
          "div",
          {
            style: {
              width: Math.round(width * 0.08),
              height: Math.round(width * 0.08),
              borderRadius: 999,
              background: accent,
            },
          },
          "",
        ),
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 24 } },
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.092),
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: "92%",
            },
          },
          headline,
        ),
        body
          ? h(
              "div",
              {
                style: {
                  fontSize: Math.round(width * 0.036),
                  lineHeight: 1.35,
                  opacity: 0.88,
                  maxWidth: "85%",
                },
              },
              body,
            )
          : null,
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          },
        },
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.03),
              fontWeight: 700,
              color: accent,
            },
          },
          content.cta || "Save this",
        ),
        h(
          "div",
          { style: { fontSize: Math.round(width * 0.026), opacity: 0.7 } },
          content.businessName,
        ),
      ),
    );
  }

  if (family === "quote" || family === "editorial") {
    return h(
      "div",
      {
        style: {
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: bg,
          color: text,
          padding: pad,
          fontFamily: "Inter",
        },
      },
      h(
        "div",
        {
          style: {
            width: Math.round(width * 0.12),
            height: 6,
            background: accent,
            marginBottom: 36,
          },
        },
        "",
      ),
      h(
        "div",
        {
          style: {
            fontSize: Math.round(width * 0.078),
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: -1.5,
            maxWidth: "94%",
          },
        },
        `“${headline}”`,
      ),
      body
        ? h(
            "div",
            {
              style: {
                marginTop: 28,
                fontSize: Math.round(width * 0.032),
                lineHeight: 1.4,
                opacity: 0.75,
                maxWidth: "80%",
              },
            },
            body,
          )
        : null,
      h(
        "div",
        {
          style: {
            marginTop: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          },
        },
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.028),
              fontWeight: 700,
              letterSpacing: 1,
            },
          },
          content.businessName.toUpperCase(),
        ),
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.025),
              color: primary,
            },
          },
          content.subhead || "Brand POV",
        ),
      ),
    );
  }

  if (family === "stat") {
    return h(
      "div",
      {
        style: {
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: secondary,
          color: text,
          padding: pad,
          fontFamily: "Inter",
        },
      },
      h(
        "div",
        {
          style: {
            fontSize: Math.round(width * 0.026),
            letterSpacing: 3,
            textTransform: "uppercase",
            color: primary,
          },
        },
        content.badge || "Proof point",
      ),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 12 } },
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.18),
              fontWeight: 700,
              lineHeight: 0.95,
              color: primary,
              letterSpacing: -4,
            },
          },
          content.statValue || "3×",
        ),
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.045),
              fontWeight: 700,
              maxWidth: "90%",
              lineHeight: 1.15,
            },
          },
          content.statLabel || headline,
        ),
        body
          ? h(
              "div",
              {
                style: {
                  marginTop: 12,
                  fontSize: Math.round(width * 0.03),
                  opacity: 0.75,
                  maxWidth: "85%",
                },
              },
              body,
            )
          : null,
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            borderTop: `2px solid ${primary}22`,
            paddingTop: 24,
          },
        },
        h("div", { style: { fontWeight: 700 } }, content.businessName),
        h("div", { style: { color: accent, fontWeight: 700 } }, content.cta || "Learn why"),
      ),
    );
  }

  if (family === "luxury") {
    return h(
      "div",
      {
        style: {
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: `linear-gradient(180deg, ${primary} 0%, #070B0B 100%)`,
          color: secondary,
          padding: pad,
          fontFamily: "Inter",
        },
      },
      h(
        "div",
        {
          style: {
            position: "absolute",
            top: pad,
            left: pad,
            fontSize: Math.round(width * 0.025),
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: 0.7,
          },
        },
        content.businessName,
      ),
      h(
        "div",
        {
          style: {
            fontSize: Math.round(width * 0.07),
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1,
            maxWidth: "92%",
          },
        },
        headline,
      ),
      h(
        "div",
        {
          style: {
            marginTop: 20,
            width: 64,
            height: 2,
            background: accent,
          },
        },
        "",
      ),
      body
        ? h(
            "div",
            {
              style: {
                marginTop: 20,
                fontSize: Math.round(width * 0.03),
                opacity: 0.85,
                maxWidth: "80%",
                lineHeight: 1.4,
              },
            },
            body,
          )
        : null,
    );
  }

  if (family === "tip" || family === "listicle") {
    return h(
      "div",
      {
        style: {
          width,
          height,
          display: "flex",
          flexDirection: "column",
          background: bg,
          color: text,
          padding: pad,
          fontFamily: "Inter",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          },
        },
        h(
          "div",
          {
            style: {
              width: Math.round(width * 0.12),
              height: Math.round(width * 0.12),
              borderRadius: 20,
              background: accent,
              color: contrastText(accent),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: Math.round(width * 0.045),
              fontWeight: 700,
            },
          },
          emphasis || "TIP",
        ),
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.028),
              letterSpacing: 2,
              textTransform: "uppercase",
              color: primary,
              fontWeight: 700,
            },
          },
          family === "listicle" ? "Carousel lesson" : "Field tip",
        ),
      ),
      h(
        "div",
        {
          style: {
            fontSize: Math.round(width * 0.072),
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            marginBottom: 24,
          },
        },
        headline,
      ),
      body
        ? h(
            "div",
            {
              style: {
                fontSize: Math.round(width * 0.034),
                lineHeight: 1.4,
                opacity: 0.8,
                maxWidth: "92%",
              },
            },
            body,
          )
        : null,
      h(
        "div",
        {
          style: {
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${primary}22`,
            paddingTop: 22,
          },
        },
        h("div", { style: { fontWeight: 700 } }, content.businessName),
        h(
          "div",
          { style: { color: accent, fontWeight: 700, fontSize: Math.round(width * 0.028) } },
          content.cta || "Swipe for more →",
        ),
      ),
    );
  }

  if (family === "playful") {
    return h(
      "div",
      {
        style: {
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: accent,
          color: contrastText(accent),
          padding: pad,
          fontFamily: "Inter",
        },
      },
      h(
        "div",
        {
          style: {
            background: bg,
            color: text,
            borderRadius: 28,
            padding: Math.round(pad * 0.85),
            display: "flex",
            flexDirection: "column",
            gap: 18,
            width: "100%",
          },
        },
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.026),
              fontWeight: 700,
              color: primary,
              textTransform: "uppercase",
              letterSpacing: 2,
            },
          },
          content.badge || "Today's energy",
        ),
        h(
          "div",
          {
            style: {
              fontSize: Math.round(width * 0.07),
              fontWeight: 700,
              lineHeight: 1.1,
            },
          },
          headline,
        ),
        body
          ? h(
              "div",
              {
                style: {
                  fontSize: Math.round(width * 0.032),
                  lineHeight: 1.35,
                  opacity: 0.8,
                },
              },
              body,
            )
          : null,
        h(
          "div",
          {
            style: {
              marginTop: 8,
              fontSize: Math.round(width * 0.028),
              fontWeight: 700,
            },
          },
          content.businessName,
        ),
      ),
    );
  }

  // minimal + corporate default
  return h(
    "div",
    {
      style: {
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: bg,
        color: text,
        padding: pad,
        fontFamily: "Inter",
        border: family === "corporate" ? `16px solid ${primary}` : undefined,
      },
    },
    h(
      "div",
      {
        style: {
          fontSize: Math.round(width * 0.028),
          fontWeight: 700,
          color: primary,
          letterSpacing: 2,
          textTransform: "uppercase",
        },
      },
      content.businessName,
    ),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 20 } },
      h(
        "div",
        {
          style: {
            fontSize: Math.round(width * 0.08),
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -1.5,
            maxWidth: "95%",
          },
        },
        headline,
      ),
      body
        ? h(
            "div",
            {
              style: {
                fontSize: Math.round(width * 0.034),
                lineHeight: 1.4,
                opacity: 0.78,
                maxWidth: "88%",
              },
            },
            body,
          )
        : null,
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 14,
        },
      },
      h(
        "div",
        {
          style: {
            width: 18,
            height: 18,
            borderRadius: 999,
            background: accent,
          },
        },
        "",
      ),
      h(
        "div",
        {
          style: {
            fontSize: Math.round(width * 0.03),
            fontWeight: 700,
          },
        },
        content.cta || content.subhead || "Made with PostPilot",
      ),
    ),
  );
}
