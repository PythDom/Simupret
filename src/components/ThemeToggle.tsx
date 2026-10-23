import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'simupret-theme';

function initialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Stockage indisponible (navigation privée) : le thème reste valable pour la session.
    }
  }, [theme]);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
      aria-label={next === 'dark' ? 'Activer le mode sombre' : 'Activer le mode clair'}
    >
      {theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
    </button>
  );
}
