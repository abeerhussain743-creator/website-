import Link from "next/link";
import { prisma } from "@shopdata/db";
import { DeleteMappingButton } from "@/components/delete-mapping-button";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const [mappings, templates] = await Promise.all([
    prisma.fieldMapping
      .findMany({
        orderBy: { updatedAt: "desc" },
        include: { store: true },
        take: 100,
      })
      .catch(() => []),
    prisma.template
      .findMany({
        orderBy: { updatedAt: "desc" },
        include: { store: true },
        take: 100,
      })
      .catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold">Templates</h1>
        <p className="mt-1 text-ink-500">
          Saved field mappings and column templates for faster product imports.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Field mappings</h2>
          <Link
            href="/app/imports"
            className="text-sm font-medium text-accent hover:underline"
          >
            Save from Import →
          </Link>
        </div>

        {mappings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-200 bg-sand-50 px-4 py-8 text-center text-sm text-ink-500">
            No saved mappings yet. Map columns in an import and click{" "}
            <strong>Save mapping</strong>.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white/80 shadow-soft">
            {mappings.map((m) => {
              const entries = Array.isArray(m.mappings)
                ? (m.mappings as Array<{
                    sourceColumn?: string;
                    targetField?: string | null;
                  }>)
                : [];
              const mapped = entries.filter((e) => e.targetField).length;
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-ink-500">
                      {m.dataset} · {mapped}/{entries.length} columns mapped ·{" "}
                      {m.store?.name ?? m.store?.shopDomain ?? "org-wide"} ·{" "}
                      {m.updatedAt.toLocaleString()}
                    </div>
                  </div>
                  <DeleteMappingButton id={m.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Column templates</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-ink-500">
            Column snapshots are created automatically when you save a mapping
            with detected headers.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white/80 shadow-soft">
            {templates.map((t) => {
              const cols = Array.isArray(t.columns)
                ? (t.columns as string[])
                : [];
              return (
                <li key={t.id} className="px-4 py-3">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-ink-500">
                    {t.dataset} · {cols.length} columns ·{" "}
                    {t.store?.name ?? t.store?.shopDomain ?? "org-wide"}
                  </div>
                  <div className="mt-1 truncate text-xs text-ink-400">
                    {cols.join(", ")}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
