'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NotifsNavLink({ isActive }: { isActive: boolean }) {
  const [newCount, setNewCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Si on est sur /, pas de badge (on est en train de lire)
    if (pathname === '/') {
      setNewCount(0);
      return;
    }

    let active = true;

    async function check() {
      if (!active) return;
      const since = localStorage.getItem('notifeo_last_seen');
      if (!since) return;
      try {
        const resp = await fetch(`/api/usage?since=${encodeURIComponent(since)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        setNewCount(data.newNotifs ?? 0);
      } catch {}
    }

    check();
    const interval = setInterval(check, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pathname]);

  return (
    <Link
      href="/"
      className={`relative ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
    >
      Notifs
      {newCount > 0 && !isActive && (
        <span className="absolute -top-1.5 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {newCount > 99 ? '99+' : newCount}
        </span>
      )}
    </Link>
  );
}
