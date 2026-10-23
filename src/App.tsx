import { Suspense, lazy, useEffect, useState } from 'react';
import ThemeToggle from './components/ThemeToggle';
import Amortissement from './screens/Amortissement';
import APropos from './screens/APropos';
import Comparateur from './screens/Comparateur';
import Optimiseur from './screens/Optimiseur';
import Parametres from './screens/Parametres';
import Scenarios from './screens/Scenarios';
import { SCREENS, screenFromHash, type ScreenId } from './screens/registry';

// Recharts est volumineux : l'écran des graphiques est chargé à la demande.
const Graphiques = lazy(() => import('./screens/Graphiques'));

function Placeholder({ label }: { label: string }) {
  return (
    <div className="card">
      <h2 className="text-lg font-semibold">{label}</h2>
      <p className="mt-2 text-slate-600 dark:text-slate-400">Écran en cours de construction.</p>
    </div>
  );
}

function Screen({ id, label }: { id: ScreenId; label: string }) {
  switch (id) {
    case 'parametres':
      return <Parametres />;
    case 'scenarios':
      return <Scenarios />;
    case 'comparateur':
      return <Comparateur />;
    case 'optimiseur':
      return <Optimiseur />;
    case 'amortissement':
      return <Amortissement />;
    case 'graphiques':
      return (
        <Suspense fallback={<p className="text-slate-500">Chargement des graphiques…</p>}>
          <Graphiques />
        </Suspense>
      );
    case 'a-propos':
      return <APropos />;
    case 'export':
      return <Placeholder label={label} />;
  }
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>(() => screenFromHash(window.location.hash));

  useEffect(() => {
    const onHash = () => {
      setScreen(screenFromHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const current = SCREENS.find((s) => s.id === screen) ?? SCREENS[0]!;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 bg-brand-600 pt-[env(safe-area-inset-top)] text-white shadow dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="text-base font-semibold sm:text-lg">Simulateur de crédit hypothécaire</h1>
          <ThemeToggle />
        </div>
        <nav aria-label="Navigation principale" className="mx-auto max-w-5xl overflow-x-auto">
          <ul className="flex gap-1 px-2 pb-2">
            {SCREENS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#/${s.id}`}
                  aria-current={s.id === screen ? 'page' : undefined}
                  ref={s.id === screen ? (el) => el?.scrollIntoView?.({ block: 'nearest', inline: 'center' }) : undefined}
                  className={`block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                    s.id === screen ? 'bg-white/20 font-semibold' : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Screen id={current.id} label={current.label} />
      </main>
      <footer className="px-4 py-3 text-center text-xs text-slate-500">
        Simulation indicative — ne constitue pas un conseil financier.
      </footer>
    </div>
  );
}
