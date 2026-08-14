import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileAudio, FileText, ClipboardPaste, Video } from 'lucide-react';
import api from '../api/client';

const DEMO_TRANSCRIPT = `Alex Morgan: Thanks for jumping on, Jordan. What's the goal for the store?
Jordan Blake: We need a conversion-ready e-commerce website before peak season. The current store looks dated, mobile checkout is painful, and inventory lives in spreadsheets.
Alex: Ideal scope?
Jordan: Catalog CMS, Stripe checkout, abandoned-cart email, analytics, and inventory sync if possible. Budget around ten to fifteen thousand, eight to ten weeks.
Alex: Who decides?
Jordan: I'm the founder and can greenlight this. Urgency is high.`;

const tabs = [
  { id: 'recording', label: 'Upload recording', icon: FileAudio, hint: 'MP3 / MP4 / WAV' },
  { id: 'transcript_file', label: 'Upload transcript', icon: FileText, hint: 'TXT / DOCX / PDF' },
  { id: 'paste', label: 'Paste transcript', icon: ClipboardPaste, hint: 'Quickest for demos' },
  { id: 'integration', label: 'Meeting platform', icon: Video, hint: 'Zoom / Meet (simulated)' },
];

export default function UploadCall() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('paste');
  const [form, setForm] = useState({
    companyName: 'Harbor & Co',
    contactName: 'Jordan Blake',
    contactEmail: 'jordan@harborco.example',
    contactTitle: 'Founder',
    title: 'Harbor & Co e-commerce discovery',
    transcript: DEMO_TRANSCRIPT,
    sourceLabel: '',
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let callId;
      if ((tab === 'recording' || tab === 'transcript_file') && file) {
        const body = new FormData();
        body.append('file', file);
        body.append('companyName', form.companyName);
        body.append('contactName', form.contactName);
        body.append('contactEmail', form.contactEmail);
        body.append('contactTitle', form.contactTitle);
        body.append('title', form.title);
        body.append('source', tab);
        if (form.transcript) body.append('transcript', form.transcript);
        // For audio demos without real transcription, ensure transcript exists
        if (tab === 'recording' && !form.transcript) {
          body.append('transcript', DEMO_TRANSCRIPT);
        }
        const { data } = await api.post('/calls/upload', body);
        callId = data.call._id;
      } else {
        const { data } = await api.post('/calls', {
          ...form,
          source: tab,
          sourceLabel:
            form.sourceLabel ||
            (tab === 'integration' ? 'Zoom (simulated)' : tab === 'paste' ? 'Pasted transcript' : tab),
          analyze: true,
          transcript: form.transcript || DEMO_TRANSCRIPT,
        });
        callId = data.call._id;
      }
      navigate(`/app/calls/${callId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-4xl font-700">Upload sales call</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Bring in a recording, transcript, paste, or simulated meeting import — AI handles the rest.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map(({ id, label, icon: Icon, hint }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              tab === id
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-[var(--color-line)] bg-white/75 hover:bg-teal-50'
            }`}
          >
            <Icon size={18} />
            <div className="mt-3 font-medium">{label}</div>
            <div className={`mt-1 text-xs ${tab === id ? 'text-teal-100' : 'text-[var(--color-ink-soft)]'}`}>{hint}</div>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="rounded-3xl border border-[var(--color-line)] bg-white/80 p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['companyName', 'Company'],
            ['contactName', 'Decision maker'],
            ['contactEmail', 'Email'],
            ['contactTitle', 'Title'],
            ['title', 'Call title'],
          ].map(([key, label]) => (
            <label key={key} className={`block ${key === 'title' ? 'sm:col-span-2' : ''}`}>
              <span className="text-sm">{label}</span>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 outline-none focus:border-teal-600"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                required={key !== 'contactEmail' && key !== 'contactTitle'}
              />
            </label>
          ))}
        </div>

        {(tab === 'recording' || tab === 'transcript_file') && (
          <label className="block">
            <span className="text-sm">File</span>
            <input
              type="file"
              accept={tab === 'recording' ? 'audio/*,video/*' : '.txt,.pdf,.doc,.docx,text/plain'}
              className="mt-1 block w-full text-sm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {tab === 'recording' && (
              <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
                Portfolio mode: audio uploads use the demo transcript for AI analysis (wire Whisper/Deepgram in production).
              </p>
            )}
          </label>
        )}

        {tab === 'integration' && (
          <label className="block">
            <span className="text-sm">Meeting link / platform</span>
            <input
              className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5"
              placeholder="https://zoom.us/j/…"
              value={form.sourceLabel}
              onChange={(e) => set('sourceLabel', e.target.value)}
            />
          </label>
        )}

        <label className="block">
          <span className="text-sm">Transcript</span>
          <textarea
            className="mt-1 min-h-48 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 outline-none focus:border-teal-600"
            value={form.transcript}
            onChange={(e) => set('transcript', e.target.value)}
            required={tab === 'paste' || tab === 'integration'}
          />
        </label>

        {error && <div className="text-sm text-rose-700">{error}</div>}

        <button
          disabled={loading}
          className="rounded-xl bg-[var(--color-ink)] px-5 py-3 font-medium text-white hover:bg-black disabled:opacity-60"
        >
          {loading ? 'Uploading & analyzing…' : 'Upload & analyze with AI'}
        </button>
      </form>
    </div>
  );
}
