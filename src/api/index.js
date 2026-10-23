const namespaces = [
  'categories',
  'cities',
  'auth',
  'listings',
  'favourites',
  'chats',
  'notifications',
  'sellers',
  'blocks',
  'reports',
  'reviews',
  'savedSearches',
  'wantedPosts',
  'promotions',
  'payments',
  'accountDeletionRequests',
  'admin',
  'meta',
];

let adapterPromise = null;

function getAdapter() {
  if (!adapterPromise) {
    // @api-adapter is aliased by Vite to the mock or Supabase adapter at build
    // time, so the demo never ships the Supabase client bundle.
    adapterPromise = import('@api-adapter')
      .then((module) => module.createApi())
      .catch((error) => {
        adapterPromise = null;
        throw error;
      });
  }
  return adapterPromise;
}

function lazyNamespace(namespace) {
  return new Proxy(
    {},
    {
      get(_target, method) {
        if (typeof method === 'symbol' || method === 'then') return undefined;
        return (...args) =>
          getAdapter().then((adapter) => {
            const target = adapter[namespace];
            const fn = target?.[method];
            if (typeof fn !== 'function') {
              throw new TypeError(`Unknown API method: ${namespace}.${String(method)}`);
            }
            return fn.apply(target, args);
          });
      },
    },
  );
}

export const api = Object.fromEntries(
  namespaces.map((namespace) => [namespace, lazyNamespace(namespace)]),
);
