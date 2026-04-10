'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type Incident = {
  id: string;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  photo_url: string | null;
  sites: { name: string; address: string | null } | null;
  reporter: { full_name: string | null } | null;
};

const SEVERITY_STYLES: Record<Incident['severity'], string> = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-red-200 text-red-900 border-red-300',
};

const SEVERITY_LABELS: Record<Incident['severity'], string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
  critical: 'Critique',
};

const STATUS_LABELS: Record<Incident['status'], string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Fermé',
};

const STATUS_STYLES: Record<Incident['status'], string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
};

export default function IncidentsList({
  initialIncidents,
}: {
  initialIncidents: Incident[];
}) {
  const supabase = createClient();
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Générer les URL signées pour les photos
  useEffect(() => {
    (async () => {
      const urls: Record<string, string> = {};
      for (const inc of incidents) {
        if (!inc.photo_url) continue;
        const { data } = await supabase.storage
          .from('incident-photos')
          .createSignedUrl(inc.photo_url, 3600);
        if (data?.signedUrl) urls[inc.id] = data.signedUrl;
      }
      setPhotoUrls(urls);
    })();
  }, [incidents, supabase]);

  // Realtime: écouter les nouveaux incidents et modifications
  useEffect(() => {
    const channel = supabase
      .channel('incidents-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        async () => {
          const { data } = await supabase
            .from('incidents')
            .select(
              'id, title, description, severity, status, created_at, photo_url, sites(name, address), reporter:profiles!incidents_reporter_id_fkey(full_name)'
            )
            .order('created_at', { ascending: false });
          if (data) setIncidents(data as unknown as Incident[]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function changeStatus(id: string, status: Incident['status']) {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
    await supabase.from('incidents').update({ status }).eq('id', id);
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-gray-500">Aucune notif pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((inc) => (
        <article
          key={inc.id}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex gap-5">
            {photoUrls[inc.id] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrls[inc.id]}
                alt=""
                className="h-28 w-28 flex-shrink-0 rounded-lg object-cover bg-gray-100"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[inc.severity]}`}
                    >
                      {SEVERITY_LABELS[inc.severity]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[inc.status]}`}
                    >
                      {STATUS_LABELS[inc.status]}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {inc.title}
                  </h3>
                  {inc.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {inc.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {inc.sites?.name} ·{' '}
                    {new Date(inc.created_at).toLocaleString('fr-FR')} ·{' '}
                    {inc.reporter?.full_name || 'Anonyme'}
                  </p>
                </div>
                <select
                  value={inc.status}
                  onChange={(e) => changeStatus(inc.id, e.target.value as Incident['status'])}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="open">Ouvert</option>
                  <option value="in_progress">En cours</option>
                  <option value="resolved">Résolu</option>
                  <option value="closed">Fermé</option>
                </select>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
