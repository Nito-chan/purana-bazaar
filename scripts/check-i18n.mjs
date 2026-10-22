import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const dictionaryFiles = ['i18n/en.json', 'i18n/hi.json'];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.js') ? [path] : [];
  });
}

function has(dictionary, key) {
  let value = dictionary;
  for (const part of key.split('.')) {
    if (!value || typeof value !== 'object' || !(part in value)) return false;
    value = value[part];
  }
  return typeof value === 'string';
}

function hasKey(dictionary, key) {
  return has(dictionary, key) || has(dictionary, `${key}_one`) || has(dictionary, `${key}_other`);
}

const keys = new Set();
for (const file of walk(root)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bt\(['"]([A-Za-z0-9_.]+)['"]/g)) {
    keys.add(match[1]);
  }
}

let failed = false;
for (const relativePath of dictionaryFiles) {
  const dictionary = JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
  const missing = [...keys].filter((key) => !hasKey(dictionary, key)).sort();
  if (missing.length) {
    failed = true;
    console.error(`Missing keys in ${relativePath}:`);
    for (const key of missing) console.error(`  ${key}`);
  }
}

if (!failed) console.log(`i18n check passed (${keys.size} literal keys).`);
process.exit(failed ? 1 : 0);
