import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Templates() {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    api.get('/templates').then(({ data }) => setTemplates(data.templates || []));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-700">Proposal Templates</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Choose a visual system that matches the buyer — then customize in the editor.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {templates.map((tpl) => (
          <div key={tpl.key || tpl._id} className="rounded-3xl border border-[var(--color-line)] bg-white/80 overflow-hidden">
            <div className="h-28" style={{ background: `linear-gradient(135deg, ${tpl.previewAccent || '#0F766E'}, #0b1f2a)` }} />
            <div className="p-5">
              <div className="font-display text-2xl font-700">{tpl.name}</div>
              <p className="mt-2 text-sm text-[var(--color-ink-soft)]">{tpl.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
