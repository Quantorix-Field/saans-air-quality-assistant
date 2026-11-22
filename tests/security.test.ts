import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

function walk(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'coverage') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

const srcFiles = walk(join(root, 'src'), ['.ts', '.tsx']);
const indexHtml = readFileSync(join(root, 'index.html'), 'utf-8');
const vercelJson = readFileSync(join(root, 'vercel.json'), 'utf-8');

describe('Security checks', () => {
  it('no dangerouslySetInnerHTML in src/', () => {
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content, `Found dangerouslySetInnerHTML in ${file}`).not.toContain('dangerouslySetInnerHTML');
    }
  });

  it('no eval() in src/', () => {
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content, `Found eval( in ${file}`).not.toMatch(/\beval\s*\(/);
    }
  });

  it('no new Function() in src/', () => {
    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      expect(content, `Found new Function( in ${file}`).not.toMatch(/new\s+Function\s*\(/);
    }
  });

  it('vercel.json CSP contains default-src \'self\'', () => {
    const vercel = JSON.parse(vercelJson) as {
      headers?: Array<{ headers: Array<{ key: string; value: string }> }>;
    };
    const cspHeader = vercel.headers
      ?.flatMap((block) => block.headers)
      .find((h) => h.key === 'Content-Security-Policy');
    expect(cspHeader, 'CSP header not found').toBeTruthy();
    expect(cspHeader?.value).toContain("default-src 'self'");
  });

  it('vercel.json CSP does not contain unsafe-inline', () => {
    expect(vercelJson).not.toContain("'unsafe-inline'");
  });

  it('vercel.json CSP does not contain unsafe-eval', () => {
    expect(vercelJson).not.toContain("'unsafe-eval'");
  });

  it('index.html has no inline script body', () => {
    // Allow <script type="module" src="..."> but not <script>code here</script>
    const inlineScript = /<script(?![^>]*\bsrc\s*=)[^>]*>[^<\s][^<]*<\/script>/i;
    expect(indexHtml).not.toMatch(inlineScript);
  });

  it('index.html has no style attribute', () => {
    expect(indexHtml).not.toMatch(/\sstyle\s*=/);
  });
});
