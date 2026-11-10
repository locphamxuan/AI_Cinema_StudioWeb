import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(import.meta.dirname, '../..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === 'tests' ? [] : sources(full);
    return full.endsWith('.tsx') ? [full] : [];
  });
}

describe('dark theme', () => {
  it('switches `dark:` utilities with the system theme, like the colour tokens', () => {
    const css = readFileSync(path.join(SRC, 'app/globals.css'), 'utf8');
    expect(css).toContain('@custom-variant dark (@media (prefers-color-scheme: dark));');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  it('gives every fixed palette colour a dark counterpart on the same element', () => {
    const fixed = /(?<![\w:-])(?:bg|text|border)-(?:red|amber|emerald|sky|white)\b/;
    const missing = sources(SRC).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, at: `${path.relative(SRC, file)}:${index + 1}` }))
        .filter(({ line }) => fixed.test(line) && !line.includes('dark:'))
        .map(({ at }) => at),
    );
    expect(missing).toEqual([]);
  });
});
