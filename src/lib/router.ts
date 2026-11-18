import { useEffect, useState } from 'react';

export type Route =
  | { view: 'classroom' }
  | { view: 'creatures' }
  | { view: 'rewards' }
  | { view: 'settings'; tab?: string }
  | { view: 'present' }
  | { view: 'creature'; id: string; tab?: string }
  | { view: 'customize'; id: string }
  /** World of Adventures: tab = map | region | quests | boss | treasure | journal | world | control */
  | { view: 'adventure'; tab: string; id?: string; query: Record<string, string> };

export function parseHash(hash: string): Route {
  const [path, qs = ''] = hash.replace(/^#/, '').split('?');
  const [, view, arg, sub] = path.split('/');
  switch (view) {
    case 'creature':
      if (!arg) return { view: 'classroom' };
      return sub === 'customize' ? { view: 'customize', id: arg } : { view: 'creature', id: arg, tab: sub };
    case 'creatures': return { view: 'creatures' };
    case 'rewards': return { view: 'rewards' };
    case 'settings': return { view: 'settings', tab: arg };
    case 'present': return { view: 'present' };
    case 'adventure': return { view: 'adventure', tab: arg || 'map', id: sub, query: Object.fromEntries(new URLSearchParams(qs)) };
    default: return { view: 'classroom' };
  }
}

export function navigate(path: string) {
  if (location.hash !== `#${path}`) location.hash = path;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
