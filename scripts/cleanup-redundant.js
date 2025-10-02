#!/usr/bin/env node
/**
 * Cleanup redundant compiled files that have matching TypeScript sources inside src/editor-sample/src
 * Keeps:
 *  - .ts / .tsx sources
 *  - The single web component entry
 * Removes (when a same-name .ts or .tsx exists):
 *  - .js
 *  - .js.map
 *  - .d.ts
 *  - .d.ts.map
 */
import { rmSync, readdirSync, statSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'src');

const removed = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
      continue;
    }
    // Skip if not a removable extension
    if (!/(\.js(\.map)?|\.d\.ts(\.map)?)$/.test(entry)) continue;

    // Determine base name (strip .js, .js.map, .d.ts, .d.ts.map)
    const base = entry
      .replace(/\.js(\.map)?$/, '')
      .replace(/\.d\.ts(\.map)?$/, '');

    // Check if corresponding .ts or .tsx exists
    const tsSource = path.join(dir, base + '.ts');
    const tsxSource = path.join(dir, base + '.tsx');
    if (statExists(tsSource) || statExists(tsxSource)) {
      rmSync(full);
      removed.push(path.relative(ROOT, full));
    }
  }
}

function statExists(p) {
  try { return statSync(p).isFile(); } catch { return false; }
}

walk(ROOT);

console.log(`Removed ${removed.length} redundant compiled files:`);
for (const f of removed) console.log('  -', f);
