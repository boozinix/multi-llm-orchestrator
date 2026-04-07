import { useMemo, useState } from 'react';
import AddCard from './pages/AddCard';
import AdminScraper from './pages/AdminScraper';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

const PAGES = [
  { id: 'AddCard' as const, label: 'AddCard', Component: AddCard },
  { id: 'AdminScraper' as const, label: 'AdminScraper', Component: AdminScraper },
  { id: 'Dashboard' as const, label: 'Dashboard', Component: Dashboard },
  { id: 'Settings' as const, label: 'Settings', Component: Settings },
] as const;

type PageId = (typeof PAGES)[number]['id'];

export function App() {
  const [page, setPage] = useState<PageId>(PAGES[0]!.id);

  const Active = useMemo(() => {
    return PAGES.find((p) => p.id === page)?.Component ?? PAGES[0]!.Component;
  }, [page]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <div className="text-sm text-slate-300">Unified UX</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">rewardstracker</div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {PAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPage(p.id)}
              className={[
                'rounded-xl border px-3 py-2 text-sm transition',
                page === p.id
                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </nav>

        <main className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
          <Active />
        </main>
      </div>
    </div>
  );
}
