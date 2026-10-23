import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const modeIndex = process.argv.indexOf('--mode');
const mode = modeIndex === -1 ? 'mock' : process.argv[modeIndex + 1];
const isReal = mode === 'real';

// The demo excludes the Supabase client entirely. The real build adds the
// Supabase auth, database and storage client, so its budgets are intentionally
// separate and still tight enough to catch accidental large additions.
const budgets = isReal
  ? {
      entryJs: 30 * 1024,
      chunkJs: 75 * 1024,
      totalJs: 160 * 1024,
      totalCss: 20 * 1024,
    }
  : {
      entryJs: 30 * 1024,
      chunkJs: 25 * 1024,
      totalJs: 100 * 1024,
      totalCss: 20 * 1024,
    };

const assetsDir = fileURLToPath(new URL('../dist/assets/', import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

let files;
try {
  files = walk(assetsDir);
} catch {
  console.error('dist/assets not found. Run `npm run build` first.');
  process.exit(1);
}

const assets = files.map((path) => {
  const source = readFileSync(path);
  const name = path.split(/[\\/]/).pop();
  return {
    name,
    type: name.endsWith('.css') ? 'css' : 'js',
    raw: source.length,
    gzip: gzipSync(source, { level: 9 }).length,
  };
});

const js = assets.filter((asset) => asset.type === 'js');
const css = assets.filter((asset) => asset.type === 'css');
const entry = js.find((asset) => /^index-.*\.js$/.test(asset.name));
const totalJs = js.reduce((sum, asset) => sum + asset.gzip, 0);
const totalCss = css.reduce((sum, asset) => sum + asset.gzip, 0);

function kb(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

console.log(`Bundle assets (gzip, ${isReal ? 'real' : 'mock'} build):`);
for (const asset of [...js, ...css].sort((a, b) => b.gzip - a.gzip)) {
  console.log(`  ${asset.name.padEnd(32)} ${kb(asset.gzip)}`);
}

const failures = [];
if (!entry) failures.push('entry chunk index-*.js was not found');
else if (entry.gzip > budgets.entryJs) {
  failures.push(`entry ${kb(entry.gzip)} exceeds ${kb(budgets.entryJs)}`);
}
for (const asset of js) {
  if (asset.gzip > budgets.chunkJs) {
    failures.push(`${asset.name} ${kb(asset.gzip)} exceeds per-chunk ${kb(budgets.chunkJs)}`);
  }
}
if (totalJs > budgets.totalJs) {
  failures.push(`total JS ${kb(totalJs)} exceeds ${kb(budgets.totalJs)}`);
}
if (totalCss > budgets.totalCss) {
  failures.push(`total CSS ${kb(totalCss)} exceeds ${kb(budgets.totalCss)}`);
}

console.log(`\nEntry JS: ${entry ? kb(entry.gzip) : 'missing'}`);
console.log(`Total JS: ${kb(totalJs)} (${js.length} chunks)`);
console.log(`Total CSS: ${kb(totalCss)} (${css.length} files)`);

if (failures.length) {
  console.error('\nBundle budget failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nBundle budget passed.');
