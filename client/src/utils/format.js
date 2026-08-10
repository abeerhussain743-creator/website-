export function money(value = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function statusTone(status) {
  const map = {
    uploaded: 'bg-slate-100 text-slate-700',
    processing: 'bg-amber-50 text-amber-800',
    analyzed: 'bg-teal-50 text-teal-800',
    proposal_ready: 'bg-emerald-50 text-emerald-800',
    awaiting_approval: 'bg-sky-50 text-sky-800',
    sent: 'bg-indigo-50 text-indigo-800',
    viewed: 'bg-violet-50 text-violet-800',
    changes_requested: 'bg-orange-50 text-orange-800',
    accepted: 'bg-green-50 text-green-800',
    declined: 'bg-rose-50 text-rose-800',
    won: 'bg-green-50 text-green-800',
    lost: 'bg-rose-50 text-rose-800',
    draft: 'bg-slate-100 text-slate-700',
    ready: 'bg-teal-50 text-teal-800',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
}

export function prettyStatus(status) {
  return String(status || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
