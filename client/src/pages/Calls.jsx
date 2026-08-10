import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { prettyStatus, statusTone } from '../utils/format';

export default function Calls() {
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    api.get('/calls').then(({ data }) => setCalls(data.calls || []));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-700">Calls</h1>
          <p className="mt-2 text-[var(--color-ink-soft)]">Every discovery conversation in your pipeline.</p>
        </div>
        <Link to="/app/upload" className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white">
          Upload call
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--color-line)] bg-white/80">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-mist)] text-[var(--color-ink-soft)]">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Call</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call._id} className="border-t border-[var(--color-line)] hover:bg-teal-50/40">
                <td className="px-4 py-3">
                  <Link to={`/app/calls/${call._id}`} className="font-medium hover:underline">
                    {call.client?.companyName}
                  </Link>
                  <div className="text-xs text-[var(--color-ink-soft)]">{call.client?.contactName}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">{call.title}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${statusTone(call.status)}`}>
                    {prettyStatus(call.status)}
                  </span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">{call.analysis?.urgency || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
