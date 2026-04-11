'use client';


export default function UpgradeBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
      <p className="text-sm text-amber-800 font-medium">{message}</p>
      <a
        href="/settings/billing"
        className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap flex-shrink-0"
      >
        Passer en Pro
      </a>
    </div>
  );
}
