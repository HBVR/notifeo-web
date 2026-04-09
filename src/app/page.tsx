import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import IncidentsList from './incidents-list';
import SignOutButton from './sign-out-button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, organizations(name)')
    .eq('id', user!.id)
    .single();

  const { data: incidents } = await supabase
    .from('incidents')
    .select(
      'id, title, description, severity, status, created_at, photo_url, sites(name, address), reporter:profiles!incidents_reporter_id_fkey(full_name)'
    )
    .order('created_at', { ascending: false });

  const orgName =
    (profile?.organizations as unknown as { name: string } | null)?.name ??
    'Organisation';

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Incident App</h1>
            <p className="text-sm text-gray-500">
              {orgName} · {user?.email}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex gap-4 text-sm font-medium">
              <Link href="/" className="text-blue-600">
                Incidents
              </Link>
              <Link href="/sites" className="text-gray-600 hover:text-gray-900">
                Sites
              </Link>
            </nav>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Incidents</h2>
          <span className="text-sm text-gray-500">{incidents?.length ?? 0} total</span>
        </div>
        <IncidentsList
          initialIncidents={(incidents as unknown as import('./incidents-list').Incident[]) ?? []}
        />
      </div>
    </main>
  );
}
