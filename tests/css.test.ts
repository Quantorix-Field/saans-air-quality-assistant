import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const stylesDir = join(__dir, '../src/styles');

function getCssFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => join(dir, f));
}

const cssFiles = getCssFiles(stylesDir);

for (const filePath of cssFiles) {
  const name = filePath.split('/').pop() ?? filePath;
  const css = readFileSync(filePath, 'utf-8');

  describe(`CSS safety: ${name}`, () => {
    it('has no @import rules', () => {
      expect(css).not.toMatch(/@import\s/);
    });

    it('has no http(s):// references outside data URIs', () => {
      // Allow https:// inside url(data:...) but not bare https://
      const stripped = css.replace(/url\s*\(\s*data:[^)]+\)/g, 'DATA_URI');
      expect(stripped).not.toMatch(/https?:\/\//);
    });

    it('every animation-name has a matching @keyframes', () => {
      // Collect all animation-name references (from animation: and animation-name:)
      const animRefs = new Set<string>();
      const animPropRe = /animation(?:-name)?\s*:\s*([^;{]+)/g;
      let m: RegExpExecArray | null;
      while ((m = animPropRe.exec(css)) !== null) {
        // Strip out cubic-bezier(...) or steps(...) to avoid splitting on commas/spaces inside them
        const cleaned = (m[1] ?? '').replace(/\b(?:cubic-bezier|steps)\([^)]+\)/g, '');
        // Extract name tokens (skip duration, easing, iteration etc.)
        const tokens = cleaned.trim().split(/[\s,]+/);
        for (const tok of tokens) {
          // Skip CSS keywords and time values
          if (/^(none|inherit|initial|unset|normal|infinite|forwards|backwards|both|alternate|reverse|running|paused|ease|linear|ease-in|ease-out|ease-in-out|step-start|step-end|fill-mode|\d|-)/.test(tok)) continue;
          if (tok.endsWith('s') && /^\d/.test(tok)) continue;
          if (tok.trim()) animRefs.add(tok.trim());
        }
      }

      // Collect @keyframes names
      const keyframesNames = new Set<string>();
      const kfRe = /@keyframes\s+([\w-]+)/g;
      while ((m = kfRe.exec(css)) !== null) {
        if (m[1]) keyframesNames.add(m[1]);
      }

      for (const ref of animRefs) {
        expect(keyframesNames.has(ref), `@keyframes "${ref}" not found in ${name}`).toBe(true);
      }
    });

    it('animations and transitions are inside prefers-reduced-motion block', () => {
      // Check that any animation: or transition: declaration that is NOT in a
      // prefers-reduced-motion: no-preference block is flagged
      // We allow the file to have zero animation/transition declarations at the top level
      const lines = css.split('\n');
      let depth = 0;
      let inMotionQuery = false;
      let motionQueryDepth = -1;

      for (const line of lines) {
        if (line.includes('prefers-reduced-motion: no-preference')) {
          inMotionQuery = true;
          motionQueryDepth = depth;
        }
        const opens = (line.match(/\{/g) ?? []).length;
        const closes = (line.match(/\}/g) ?? []).length;
        depth += opens - closes;
        if (inMotionQuery && depth <= motionQueryDepth) {
          inMotionQuery = false;
          motionQueryDepth = -1;
        }

        if (!inMotionQuery) {
          const hasAnimation = /^\s*animation\s*:/.test(line) || /^\s*animation-name\s*:/.test(line);
          const hasTransition = /^\s*transition\s*:/.test(line);
          if (hasAnimation || hasTransition) {
            expect(
              false,
              `${name}: animation/transition outside prefers-reduced-motion block at line: "${line.trim()}"`,
            ).toBe(true);
          }
        }
      }
    });
  });
}
