/**
 * Minimal module resolver so the pure store logic can run under plain Node.
 *
 * Two jobs:
 *  - resolve the `@/*` path alias that `tsconfig.json` defines for the app;
 *  - swap `react-native` and `expo-sqlite/kv-store` for tiny stubs, since the
 *    modules under test only touch `Platform.select` and never actually read
 *    from storage.
 *
 * Node 24 strips the TypeScript types itself, so no build step is involved.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');

const STUBS = {
  'react-native': path.join(HERE, 'stubs', 'react-native.js'),
  'expo-sqlite/kv-store': path.join(HERE, 'stubs', 'kv-store.js'),
};

export function resolve(specifier, context, next) {
  const stub = STUBS[specifier];
  if (stub) {
    return { url: pathToFileURL(stub).href, shortCircuit: true };
  }

  if (specifier.startsWith('@/')) {
    const base = path.join(SRC, specifier.slice(2));
    for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
      if (fs.existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }

  return next(specifier, context);
}
