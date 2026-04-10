'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/client';

type Site = {
  id: string;
  name: string;
  address: string | null;
  qr_token: string;
  created_at: string;
  archived_at: string | null;
  created_by: string | null;
};

export default function SitesManager({
  initialSites,
  organizationId,
  currentUserId,
  currentUserRole,
  canCreateSite = true,
}: {
  initialSites: Site[];
  organizationId: string | null;
  currentUserId?: string;
  currentUserRole?: string;
  canCreateSite?: boolean;
}) {
  const isManager = currentUserRole === 'manager' || currentUserRole === 'admin';
  const supabase = createClient();
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  async function createSite(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !organizationId) return;
    // Vérifier la limite en live (pas le prop qui peut être stale)
    try {
      const resp = await fetch('/api/usage');
      if (resp.ok) {
        const usage = await resp.json();
        if (!usage.canCreateSite) {
          setError('Limite de sites atteinte. Passez en Pro pour créer plus de sites.');
          return;
        }
      }
    } catch {}
    setSubmitting(true);
    setError(null);
    const { data, error } = await supabase
      .from('sites')
      .insert({
        name: name.trim(),
        address: address.trim() || null,
        organization_id: organizationId,
        created_by: currentUserId,
      })
      .select('id, name, address, qr_token, created_at, archived_at, created_by')
      .single();

    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setSites((prev) => [data, ...prev]);
      setName('');
      setAddress('');
      window.dispatchEvent(new Event('notifeo:usage-changed'));
    }
  }

  async function downloadQR(site: Site) {
    // Le QR contient l'URL complète → le téléphone l'ouvre directement dans le navigateur
    const qrUrl = `https://app.notifeo.fr/signaler?site=${site.qr_token}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 1000,
      margin: 2,
      errorCorrectionLevel: 'H',
    });

    const canvas = document.createElement('canvas');
    const W = 1100;
    const H = 1300;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Fond blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Titre "Notifeo"
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Notifeo', W / 2, 70);

    // Instructions
    ctx.fillStyle = '#374151';
    ctx.font = '28px Arial';
    ctx.fillText('Scannez pour signaler', W / 2, 120);

    // QR
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = qrDataUrl;
    });
    ctx.drawImage(img, 50, 160, 1000, 1000);

    // Nom du site
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 56px Arial';
    ctx.fillText(site.name, W / 2, 1220);

    if (site.address) {
      ctx.font = '28px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText(site.address, W / 2, 1270);
    }

    // Télécharger
    const link = document.createElement('a');
    link.download = `qr-${site.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  async function archiveSite(id: string) {
    const { error, count } = await supabase
      .from('sites')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { alert('Erreur : ' + error.message); return; }
    setSites((prev) => prev.map((s) => s.id === id ? { ...s, archived_at: new Date().toISOString() } : s));
    window.dispatchEvent(new Event('notifeo:usage-changed'));
  }

  async function unarchiveSite(id: string) {
    const { error } = await supabase
      .from('sites')
      .update({ archived_at: null })
      .eq('id', id);
    if (error) { alert('Erreur : ' + error.message); return; }
    setSites((prev) => prev.map((s) => s.id === id ? { ...s, archived_at: null } : s));
    window.dispatchEvent(new Event('notifeo:usage-changed'));
  }

  async function deleteSite(id: string) {
    if (!confirm('Supprimer ce site définitivement ? Les notifs associées seront aussi supprimées.')) return;
    const { error } = await supabase.from('sites').delete({ count: 'exact' }).eq('id', id);
    if (error) { alert('Erreur : ' + error.message); return; }
    setSites((prev) => prev.filter((s) => s.id !== id));
    window.dispatchEvent(new Event('notifeo:usage-changed'));
  }

  return (
    <div className="space-y-6">
      {/* Formulaire de création */}
      <form
        onSubmit={createSite}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Nouveau site</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du site *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Entrepôt Lyon Sud"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresse (optionnel)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 rue Exemple, 69000 Lyon"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Création...' : 'Créer le site'}
        </button>
      </form>

      {/* Sites actifs */}
      {(() => {
        const activeSites = sites.filter((s) => !s.archived_at);
        const archivedSites = sites.filter((s) => s.archived_at);
        return (
          <>
            {activeSites.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
                <p className="text-gray-500">Aucun site actif.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {activeSites.map((site) => (
                  <article
                    key={site.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
                    {site.address && (
                      <p className="text-sm text-gray-500 mt-0.5">{site.address}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadQR(site)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Télécharger le QR
                      </button>
                      {(isManager || site.created_by === currentUserId) && (
                        <button
                          onClick={() => archiveSite(site.id)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Archiver
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Sites archivés */}
            {archivedSites.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {showArchived ? '▼' : '▶'} Sites archivés ({archivedSites.length})
                </button>
                {showArchived && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {archivedSites.map((site) => (
                      <article
                        key={site.id}
                        className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5"
                      >
                        <h3 className="text-lg font-semibold text-gray-500">{site.name}</h3>
                        {site.address && (
                          <p className="text-sm text-gray-400 mt-0.5">{site.address}</p>
                        )}
                        {(isManager || site.created_by === currentUserId) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              onClick={() => unarchiveSite(site.id)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white"
                            >
                              Restaurer
                            </button>
                            <button
                              onClick={() => deleteSite(site.id)}
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50"
                            >
                              Supprimer
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
