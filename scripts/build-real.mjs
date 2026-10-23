process.env.VITE_USE_MOCK = 'false';

const { build } = await import('vite');
await build();
