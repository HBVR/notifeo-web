import { createClient } from '@/lib/supabase/server';
import SitesManager from './sites-manager';
import SignOutButton from '../sign-out-button';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function SitesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations(name)')
    .eq('id', user!.id)
    .single();

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, address, qr_token, created_at')
    .order('created_at', { ascending: false });

  const orgName =
    (profile?.organizations as unknown as { name: string } | null)?.name ??
    'Organisation';

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Image
              src="/logo-notifeo.png"
              alt="Notifeo"
              width={1000}
              height={400}
              priority
              className="h-12 w-auto"
            />
            <div className="hidden sm:flex items-center gap-2 border-l border-gray-200 pl-4">
              <span className="text-sm font-semibold text-gray-900">{orgName}</span>
              <span className="text-xs text-gray-400">{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex gap-4 text-sm font-medium">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Notifs
              </Link>
              <Link href="/sites" className="text-blue-600">
                Sites
              </Link>
              <Link href="/team" className="text-gray-600 hover:text-gray-900">
                Équipe
              </Link>
            </nav>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Sites</h2>
          <p className="text-sm text-gray-500 mt-1">
            Créez un site puis téléchargez le QR code à imprimer et afficher sur place.
          </p>
        </div>
        <SitesManager
          initialSites={sites ?? []}
          organizationId={profile?.organization_id ?? null}
        />
      </div>
    </main>
  );
}
