'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { resizeImage } from '@/lib/resize-image';
import InstallButton from '../install-button';
import UpgradeBanner from '../upgrade-banner';

type Site = {
  id: string;
  name: string;
  address: string | null;
};

type Step = 'pick-site' | 'form' | 'success';

const SEVERITIES = [
  { key: 'low', label: 'Faible', color: '#10b981', bg: 'bg-emerald-50 border-emerald-300' },
  { key: 'medium', label: 'Moyen', color: '#f59e0b', bg: 'bg-amber-50 border-amber-300' },
  { key: 'high', label: 'Élevé', color: '#ef4444', bg: 'bg-red-50 border-red-300' },
  { key: 'critical', label: 'Critique', color: '#7f1d1d', bg: 'bg-red-100 border-red-400' },
];

export default function SignalerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<File | null>(null);

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const orgIdRef = useRef<string | null>(null);
  const [canCreateNotif, setCanCreateNotif] = useState(true);
  const [canCreateSite, setCanCreateSite] = useState(true);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Step
  const [step, setStep] = useState<Step>('pick-site');

  // Site picker
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isFreeReport, setIsFreeReport] = useState(false);

  // New site creation
  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [creatingSite, setCreatingSite] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [freeLocation, setFreeLocation] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Init: check auth + load sites
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profile?.organization_id) {
        setOrgId(profile.organization_id);
        orgIdRef.current = profile.organization_id;
      }

      const { data: sitesData } = await supabase
        .from('sites')
        .select('id, name, address')
        .is('archived_at', null)
        .order('name');

      setSites(sitesData ?? []);

      // Check plan limits
      try {
        const usageResp = await fetch('/api/usage');
        if (usageResp.ok) {
          const usage = await usageResp.json();
          setCanCreateNotif(usage.canCreateNotif);
          setCanCreateSite(usage.canCreateSite);
          if (!usage.canCreateNotif) {
            setLimitMessage(`Limite atteinte : ${usage.notifsThisMonth}/${usage.limits.max_notifs_month} notifs ce mois. Passez en Pro pour continuer.`);
          }
        }
      } catch {}

      setLoading(false);

      // QR shortcut: ?site=TOKEN pre-selects a site
      const siteToken = searchParams.get('site');
      if (siteToken) {
        const { data: qrSite } = await supabase
          .from('sites')
          .select('id, name, address')
          .eq('qr_token', siteToken)
          .maybeSingle();
        if (qrSite) {
          setSelectedSite(qrSite);
          setStep('form');
        }
      }
    })();
  }, [router, supabase, searchParams]);

  // Filter sites by search
  const filteredSites = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.address ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // Create a new site inline
  async function createSite() {
    if (!canCreateSite) {
      setError('Limite de sites atteinte. Passez en Pro pour créer plus de sites.');
      return;
    }
    if (!newSiteName.trim() || !orgId) return;
    setCreatingSite(true);
    const { data, error } = await supabase
      .from('sites')
      .insert({
        name: newSiteName.trim(),
        address: newSiteAddress.trim() || null,
        organization_id: orgId,
        created_by: userId,
      })
      .select('id, name, address')
      .single();

    setCreatingSite(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setSites((prev) => [data, ...prev]);
      setSelectedSite(data);
      setShowNewSite(false);
      setNewSiteName('');
      setNewSiteAddress('');
      setStep('form');
    }
  }

  // Handle photo selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    photoFileRef.current = file;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // Upload photo to Supabase Storage (resized to max 1024px)
  async function uploadPhoto(notifId: string): Promise<string | null> {
    // Lire le fichier directement depuis l'input DOM (le plus fiable)
    const file = fileInputRef.current?.files?.[0] ?? photoFileRef.current;
    const org = orgIdRef.current;
    if (!file) throw new Error('Aucun fichier photo sélectionné');
    if (!org) throw new Error('Organisation non trouvée — impossible d\'uploader');

    let blob: Blob;
    try {
      const result = await resizeImage(file, 512, 0.7);
      blob = result.blob;
    } catch {
      blob = file;
    }

    const path = `${org}/${notifId}.jpg`;
    const { error } = await supabase.storage
      .from('incident-photos')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error(`Upload échoué : ${error.message}`);
    return path;
  }

  // Submit the report
  async function submit() {
    if (!canCreateNotif) {
      setError('Limite de notifs atteinte pour ce mois. Passez en Pro pour continuer.');
      return;
    }
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    if (isFreeReport && !freeLocation.trim()) {
      setError('Indique une localisation pour le signalement libre.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data: notif, error: insertErr } = await supabase
        .from('incidents')
        .insert({
          site_id: selectedSite?.id ?? null,
          reporter_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          severity,
          free_location: isFreeReport ? freeLocation.trim() : null,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;

      const hasPhoto = !!(fileInputRef.current?.files?.[0] ?? photoFileRef.current);
      if (hasPhoto && notif) {
        const path = await uploadPhoto(notif.id);
        if (path) {
          await supabase
            .from('incidents')
            .update({ photo_url: path })
            .eq('id', notif.id);
        }
      }

      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // Reset for a new report
  function newReport() {
    setStep('pick-site');
    setSelectedSite(null);
    setIsFreeReport(false);
    setTitle('');
    setDescription('');
    setSeverity('medium');
    setFreeLocation('');
    photoFileRef.current = null;
    setPhotoFile(null);
    setPhotoPreview(null);
    setError(null);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header mobile */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <Image
          src="/logo-notifeo.png"
          alt="Notifeo"
          width={1000}
          height={400}
          priority
          className="h-8 w-auto"
        />
        <div className="flex items-center gap-4">
          <InstallButton />
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium text-blue-600"
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {limitMessage && (
          <div className="mb-4">
            <UpgradeBanner message={limitMessage} />
          </div>
        )}
        {/* ============ STEP 1: PICK SITE ============ */}
        {step === 'pick-site' && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">Nouvelle notif</h1>
            <p className="text-sm text-gray-500">
              Sélectionnez un site ou créez-en un nouveau.
            </p>

            {/* Search */}
            <input
              type="text"
              placeholder="🔍 Rechercher un site..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />

            {/* Sites list */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              {filteredSites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => {
                    setSelectedSite(site);
                    setIsFreeReport(false);
                    setError(null);
                    setStep('form');
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                >
                  <p className="font-semibold text-gray-900">{site.name}</p>
                  {site.address && (
                    <p className="text-sm text-gray-500 mt-0.5">{site.address}</p>
                  )}
                </button>
              ))}
              {filteredSites.length === 0 && search && (
                <p className="text-center text-sm text-gray-400 py-4">
                  Aucun site trouvé pour &quot;{search}&quot;
                </p>
              )}
            </div>

            {/* New site */}
            {!showNewSite ? (
              <button
                onClick={() => setShowNewSite(true)}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white p-4 text-center font-semibold text-blue-600 hover:border-blue-400 hover:bg-blue-50"
              >
                + Créer un nouveau site
              </button>
            ) : (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                <p className="font-semibold text-gray-900">Nouveau site</p>
                <input
                  type="text"
                  placeholder="Nom du site *"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Adresse (optionnel)"
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createSite}
                    disabled={creatingSite || !newSiteName.trim()}
                    className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {creatingSite ? 'Création...' : 'Créer et continuer'}
                  </button>
                  <button
                    onClick={() => setShowNewSite(false)}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Free report */}
            <button
              onClick={() => {
                setSelectedSite(null);
                setIsFreeReport(true);
                setError(null);
                setStep('form');
              }}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-center font-medium text-gray-600 hover:bg-gray-50"
            >
              📍 Signalement libre (sans site)
            </button>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ============ STEP 2: FORM ============ */}
        {step === 'form' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setStep('pick-site');
                setError(null);
              }}
              className="text-sm text-blue-600 font-medium"
            >
              ← Retour
            </button>

            <h1 className="text-2xl font-bold text-gray-900">Nouvelle notif</h1>

            {/* Site badge */}
            {selectedSite && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="font-semibold text-blue-900">{selectedSite.name}</p>
                {selectedSite.address && (
                  <p className="text-sm text-blue-700">{selectedSite.address}</p>
                )}
              </div>
            )}
            {isFreeReport && (
              <div className="space-y-2">
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="font-semibold text-amber-900">📍 Signalement libre</p>
                  <p className="text-sm text-amber-700">
                    Pas rattaché à un site. Indiquez l&apos;adresse ci-dessous.
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Adresse ou localisation *"
                  value={freeLocation}
                  onChange={(e) => setFreeLocation(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Titre *
              </label>
              <input
                type="text"
                placeholder="Ex : Fuite d'eau au niveau 2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                placeholder="Détails, contexte..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gravité
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SEVERITIES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSeverity(s.key)}
                    className={`rounded-xl border-2 p-3 text-center text-sm font-semibold transition-all ${
                      severity === s.key
                        ? s.bg + ' scale-[1.02]'
                        : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full mr-1.5"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Photo
              </label>
              {photoPreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="preview"
                    className="w-full h-48 object-cover rounded-xl bg-gray-100"
                  />
                  <button
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-black/70 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                  >
                    ✕ Retirer
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600"
                >
                  📷 Prendre une photo ou choisir depuis la galerie
                </button>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-xl bg-blue-600 py-4 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Envoi en cours...' : 'Envoyer la notif'}
            </button>
          </div>
        )}

        {/* ============ STEP 3: SUCCESS ============ */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="text-6xl">✅</div>
            <h1 className="text-2xl font-bold text-gray-900">Notif envoyée !</h1>
            <p className="text-gray-500 text-center">
              {selectedSite
                ? `Signalement enregistré sur ${selectedSite.name}.`
                : 'Signalement libre enregistré.'}
              <br />
              Le manager a été notifié.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={newReport}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white"
              >
                Nouvelle notif
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
