'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ImageAnnotator from './image-annotator';

export type Incident = {
  id: string;
  title: string;
  description: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  photo_url: string | null;
  annotated_photo_url: string | null;
  free_location?: string | null;
  sites: { name: string; address: string | null } | null;
  reporter: { full_name: string | null; email: string | null } | null;
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

export default function NotifsList({
  initialNotifs,
}: {
  initialNotifs: Incident[];
}) {
  const supabase = createClient();
  const [incidents, setIncidents] = useState<Incident[]>(initialNotifs);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [siteFilter, setSiteFilter] = useState<string | null>(null); // null = tous
  const [openNotif, setOpenNotif] = useState<Incident | null>(null); // modal
  const [annotatedUrls, setAnnotatedUrls] = useState<Record<string, string>>({});
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [annotatorBlobUrl, setAnnotatorBlobUrl] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0); // 0 = original, 1 = annoté

  // Liste unique des sites pour les pills de filtre
  const siteNames = useMemo(() => {
    const names = new Set<string>();
    let hasFree = false;
    for (const inc of incidents) {
      if (inc.sites?.name) names.add(inc.sites.name);
      else hasFree = true;
    }
    return { names: Array.from(names).sort(), hasFree };
  }, [incidents]);

  // Filtrer les notifs
  const filteredIncidents = useMemo(() => {
    if (siteFilter === null) return incidents;
    if (siteFilter === '__free__')
      return incidents.filter((i) => !i.sites);
    return incidents.filter((i) => i.sites?.name === siteFilter);
  }, [incidents, siteFilter]);

  // Générer les URL signées pour les photos (originales + annotées)
  useEffect(() => {
    (async () => {
      const urls: Record<string, string> = {};
      const annUrls: Record<string, string> = {};
      for (const inc of incidents) {
        if (inc.photo_url) {
          const { data } = await supabase.storage
            .from('incident-photos')
            .createSignedUrl(inc.photo_url, 3600);
          if (data?.signedUrl) urls[inc.id] = data.signedUrl;
        }
        if (inc.annotated_photo_url) {
          const { data } = await supabase.storage
            .from('incident-photos')
            .createSignedUrl(inc.annotated_photo_url, 3600);
          if (data?.signedUrl) annUrls[inc.id] = data.signedUrl;
        }
      }
      setPhotoUrls(urls);
      setAnnotatedUrls(annUrls);
    })();
  }, [incidents, supabase]);

  // Realtime
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
              'id, title, description, severity, status, created_at, photo_url, annotated_photo_url, free_location, sites(name, address), reporter:profiles!incidents_reporter_id_fkey(full_name,email)'
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

  async function deleteNotif(id: string) {
    if (!confirm('Supprimer cette notif ? Cette action est irréversible.'))
      return;
    const { error } = await supabase.from('incidents').delete().eq('id', id);
    if (error) {
      alert(`Erreur suppression : ${error.message}\n\nVérifie ton rôle (doit être manager ou admin).`);
      return;
    }
    setIncidents((prev) => prev.filter((i) => i.id !== id));
    if (openNotif?.id === id) setOpenNotif(null);
  }

  async function deletePhoto(notif: Incident, type: 'original' | 'annotated') {
    const field = type === 'original' ? 'photo_url' : 'annotated_photo_url';
    const path = type === 'original' ? notif.photo_url : notif.annotated_photo_url;
    if (!path) return;
    if (!confirm(`Supprimer la photo ${type === 'annotated' ? 'annotée' : 'originale'} ?`)) return;

    // Supprimer du storage
    await supabase.storage.from('incident-photos').remove([path]);

    // Si on supprime l'originale et qu'il y a une annotée → promouvoir l'annotée en originale
    if (type === 'original' && notif.annotated_photo_url) {
      await supabase
        .from('incidents')
        .update({ photo_url: notif.annotated_photo_url, annotated_photo_url: null })
        .eq('id', notif.id);
      // Mettre à jour l'état local
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === notif.id
            ? { ...i, photo_url: notif.annotated_photo_url, annotated_photo_url: null }
            : i
        )
      );
      // Transférer l'URL signée de annotée vers originale
      const annUrl = annotatedUrls[notif.id];
      if (annUrl) {
        setPhotoUrls((prev) => ({ ...prev, [notif.id]: annUrl }));
      }
      setAnnotatedUrls((prev) => { const n = { ...prev }; delete n[notif.id]; return n; });
      if (openNotif?.id === notif.id) {
        setOpenNotif({ ...notif, photo_url: notif.annotated_photo_url, annotated_photo_url: null });
      }
    } else {
      // Suppression simple (annotée, ou originale sans annotée)
      await supabase.from('incidents').update({ [field]: null }).eq('id', notif.id);
      setIncidents((prev) =>
        prev.map((i) => (i.id === notif.id ? { ...i, [field]: null } : i))
      );
      if (type === 'original') {
        setPhotoUrls((prev) => { const n = { ...prev }; delete n[notif.id]; return n; });
      } else {
        setAnnotatedUrls((prev) => { const n = { ...prev }; delete n[notif.id]; return n; });
      }
      if (openNotif?.id === notif.id) {
        setOpenNotif({ ...notif, [field]: null });
      }
    }
    setCarouselIdx(0);
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-gray-500">Aucune notif pour l&apos;instant.</p>
      </div>
    );
  }

  return (
    <>
      {/* ====== FILTRES PAR SITE ====== */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSiteFilter(null)}
          className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
            siteFilter === null
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
          }`}
        >
          Tous ({incidents.length})
        </button>
        {siteNames.names.map((name) => (
          <button
            key={name}
            onClick={() => setSiteFilter(name)}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
              siteFilter === name
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
            }`}
          >
            {name} (
            {incidents.filter((i) => i.sites?.name === name).length})
          </button>
        ))}
        {siteNames.hasFree && (
          <button
            onClick={() => setSiteFilter('__free__')}
            className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
              siteFilter === '__free__'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
            }`}
          >
            📍 Libre ({incidents.filter((i) => !i.sites).length})
          </button>
        )}
      </div>

      {/* ====== LISTE DES NOTIFS ====== */}
      <div className="space-y-3">
        {filteredIncidents.map((inc) => (
          <article
            key={inc.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
            onClick={() => setOpenNotif(inc)}
          >
            <div className="flex gap-5">
              {photoUrls[inc.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrls[inc.id]}
                  alt=""
                  className="h-20 w-20 flex-shrink-0 rounded-lg object-cover bg-gray-100"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
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
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {inc.title}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      {inc.sites?.name ?? inc.free_location ?? '📍 Libre'} ·{' '}
                      {new Date(inc.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={inc.status}
                      onChange={(e) =>
                        changeStatus(
                          inc.id,
                          e.target.value as Incident['status']
                        )
                      }
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="open">Ouvert</option>
                      <option value="in_progress">En cours</option>
                      <option value="resolved">Résolu</option>
                      <option value="closed">Fermé</option>
                    </select>
                    <button
                      onClick={() => deleteNotif(inc.id)}
                      title="Supprimer"
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:border-red-300 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
        {filteredIncidents.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-400">Aucune notif dans ce filtre.</p>
          </div>
        )}
      </div>

      {/* ====== MODAL DÉTAIL ====== */}
      {openNotif && !showAnnotator && (
        <ModalDetail
          notif={openNotif}
          photoUrl={photoUrls[openNotif.id]}
          annotatedUrl={annotatedUrls[openNotif.id]}
          carouselIdx={carouselIdx}
          setCarouselIdx={setCarouselIdx}
          onClose={() => { setOpenNotif(null); setCarouselIdx(0); }}
          onAnnotate={() => {
            if (photoUrls[openNotif.id]) {
              setShowAnnotator(true);
            }
          }}
          onChangeStatus={(status) => {
            changeStatus(openNotif.id, status);
            setOpenNotif({ ...openNotif, status });
          }}
          onDelete={() => deleteNotif(openNotif.id)}
          onDeletePhoto={(type) => deletePhoto(openNotif, type)}
        />
      )}

      {/* ====== ANNOTATEUR D'IMAGE ====== */}
      {showAnnotator && openNotif && photoUrls[openNotif.id] && openNotif.photo_url && (
        <ImageAnnotator
          imageUrl={photoUrls[openNotif.id]}
          storagePath={openNotif.photo_url}
          onCancel={() => {
            setShowAnnotator(false);
          }}
          onSave={async (blob) => {
            const notifId = openNotif.id;
            const orgId = openNotif.photo_url?.split('/')[0] ?? 'unknown';

            // Supprimer l'ancienne annotation si elle existe
            if (openNotif.annotated_photo_url) {
              await supabase.storage
                .from('incident-photos')
                .remove([openNotif.annotated_photo_url]);
            }

            // Nouveau nom unique (timestamp) pour éviter le cache navigateur
            const path = `${orgId}/${notifId}_ann_${Date.now()}.jpg`;

            await supabase.storage
              .from('incident-photos')
              .upload(path, blob, { contentType: 'image/jpeg' });

            await supabase
              .from('incidents')
              .update({ annotated_photo_url: path })
              .eq('id', notifId);

            setIncidents((prev) =>
              prev.map((i) =>
                i.id === notifId ? { ...i, annotated_photo_url: path } : i
              )
            );

            const { data } = await supabase.storage
              .from('incident-photos')
              .createSignedUrl(path, 3600);
            if (data?.signedUrl) {
              // Cache-bust pour forcer le navigateur à charger la nouvelle version
              const bustUrl = data.signedUrl + '&_t=' + Date.now();
              setAnnotatedUrls((prev) => ({ ...prev, [notifId]: bustUrl }));
            }

            setShowAnnotator(false);
            setCarouselIdx(1);
          }}
        />
      )}
    </>
  );
}

/* ====== MODAL DÉTAIL (composant séparé pour éviter les problèmes de rendu) ====== */
function ModalDetail({
  notif,
  photoUrl,
  annotatedUrl,
  carouselIdx,
  setCarouselIdx,
  onClose,
  onAnnotate,
  onChangeStatus,
  onDelete,
  onDeletePhoto,
}: {
  notif: Incident;
  photoUrl?: string;
  annotatedUrl?: string;
  carouselIdx: number;
  setCarouselIdx: (idx: number) => void;
  onClose: () => void;
  onAnnotate: () => void;
  onChangeStatus: (status: Incident['status']) => void;
  onDelete: () => void;
  onDeletePhoto: (type: 'original' | 'annotated') => void;
}) {
  // Build carousel images
  const images: { url: string; label: string; type: 'original' | 'annotated' }[] = [];
  if (photoUrl) images.push({ url: photoUrl, label: 'Original', type: 'original' });
  if (annotatedUrl) images.push({ url: annotatedUrl, label: 'Annoté', type: 'annotated' });
  const idx = images.length > 0 ? Math.min(carouselIdx, images.length - 1) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image carousel */}
        {images.length > 0 && (
          <div className="relative bg-gray-100 rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[idx].url}
              alt={images[idx].label}
              className="w-full max-h-96 object-contain cursor-pointer"
              onClick={() => window.open(images[idx].url, '_blank')}
              title="Cliquer pour ouvrir en plein écran"
            />

            {/* Carousel tabs */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                {images.map((img, i) => (
                  <button
                    key={img.type}
                    onClick={() => setCarouselIdx(i)}
                    className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                      idx === i
                        ? 'bg-white text-gray-900'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    {img.label}
                  </button>
                ))}
              </div>
            )}

            {/* Top buttons: annotate + delete photo */}
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={onAnnotate}
                className="bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/80"
              >
                ✏️ Annoter
              </button>
              <button
                onClick={() => onDeletePhoto(images[idx].type)}
                className="bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-600"
              >
                🗑 Photo
              </button>
            </div>
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${SEVERITY_STYLES[notif.severity]}`}
            >
              {SEVERITY_LABELS[notif.severity]}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[notif.status]}`}
            >
              {STATUS_LABELS[notif.status]}
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-900">{notif.title}</h2>

          {notif.description && (
            <p className="text-gray-700 whitespace-pre-wrap">{notif.description}</p>
          )}

          <div className="border-t border-gray-100 pt-4 space-y-1 text-sm text-gray-500">
            <p>
              <strong className="text-gray-700">Site :</strong>{' '}
              {notif.sites?.name ?? notif.free_location ?? '📍 Libre'}
            </p>
            {notif.sites?.address && (
              <p>
                <strong className="text-gray-700">Adresse :</strong>{' '}
                {notif.sites.address}
              </p>
            )}
            <p>
              <strong className="text-gray-700">Signalé par :</strong>{' '}
              {notif.reporter?.full_name || notif.reporter?.email || 'Anonyme'}
            </p>
            <p>
              <strong className="text-gray-700">Date :</strong>{' '}
              {new Date(notif.created_at).toLocaleString('fr-FR')}
            </p>
          </div>

          <div className="flex gap-3 border-t border-gray-100 pt-4">
            <select
              value={notif.status}
              onChange={(e) => onChangeStatus(e.target.value as Incident['status'])}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
            >
              <option value="open">Ouvert</option>
              <option value="in_progress">En cours</option>
              <option value="resolved">Résolu</option>
              <option value="closed">Fermé</option>
            </select>
            <button
              onClick={onDelete}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
