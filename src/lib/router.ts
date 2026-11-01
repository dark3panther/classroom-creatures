import { useEffect, useState } from 'react';

export type Route =
  | { view: 'classroom' }
  | { view: 'creatures' }
  | { view: 'rewards' }
  | { view: 'settings'; tab?: string }
  | { view: 'present' };

export function parseHash(hash: string): Route {
  const [, view, arg] = hash.replace(/^#/, '').split('/');
  switch (view) {
    case 'creatures': return { view: 'creatures' };
    case 'rewards': return { view: 'rewards' };
    case 'settings': return { view: 'settings', tab: arg };
    case 'present': return { view: 'present' };
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
