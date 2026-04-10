import Image from 'next/image';
import SignOutButton from './sign-out-button';
import UsageBar from './usage-bar';
import NotifsNavLink from './notifs-nav-link';
import type { Usage } from '@/lib/plan-limits';

export default function DashboardShell({
  orgName,
  email,
  role,
  usage,
  activeTab,
  children,
}: {
  orgName: string;
  email: string;
  role: string;
  usage: Usage;
  activeTab: 'notifs' | 'sites' | 'team';
  children: React.ReactNode;
}) {
  const tabs = [
    { key: 'notifs', label: 'Notifs', href: '/' },
    { key: 'sites', label: 'Sites', href: '/sites' },
    { key: 'team', label: 'Équipe', href: '/team' },
  ];

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
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                role === 'admin' ? 'bg-purple-100 text-purple-700' :
                role === 'manager' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Employé'}
              </span>
              <span className="text-xs text-gray-400">{email}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex gap-4 text-sm font-medium">
              <NotifsNavLink isActive={activeTab === 'notifs'} />
              {tabs.filter((t) => t.key !== 'notifs').map((t) => (
                <a
                  key={t.key}
                  href={t.href}
                  className={
                    activeTab === t.key
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }
                >
                  {t.label}
                </a>
              ))}
            </nav>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <UsageBar usage={usage} />
        {children}
      </div>
    </main>
  );
}
