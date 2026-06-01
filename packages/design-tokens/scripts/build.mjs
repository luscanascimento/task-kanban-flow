// Build design tokens → dist/tokens.css + dist/tokens.js + dist/tokens.json
//
// Strategy: two separate Style Dictionary builds.
//   - Light build: emits :root { ... }  (default theme)
//   - Dark build:  emits [data-theme="dark"] { ... }  (overrides only)
// The dark build includes dark.json which overrides the same token paths,
// so the output is the resolved dark values for those tokens only.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import StyleDictionary from 'style-dictionary';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const distDir = resolve(root, 'dist');
await mkdir(distDir, { recursive: true });

const lightSources = [
  resolve(root, 'src/color.json'),
  resolve(root, 'src/typography.json'),
  resolve(root, 'src/spacing.json'),
  resolve(root, 'src/shadow.json'),
];
const darkSources = [resolve(root, 'src/dark.json'), ...lightSources];

// ---- Formats (SD4 API: must register then reference by name) -----------
StyleDictionary.registerFormat({
  name: 'tkf/css-root',
  format({ dictionary }) {
    const lines = ['/* Auto-generated. Do not edit. */', ':root {'];
    for (const token of dictionary.allTokens) {
      lines.push(`  --${token.path.join('-')}: ${token.value};`);
    }
    lines.push('}');
    return lines.join('\n');
  },
});

StyleDictionary.registerFormat({
  name: 'tkf/css-dark',
  format({ dictionary }) {
    const lines = ['[data-theme="dark"] {'];
    for (const token of dictionary.allTokens) {
      lines.push(`  --${token.path.join('-')}: ${token.value};`);
    }
    lines.push('}');
    return lines.join('\n');
  },
});

StyleDictionary.registerFormat({
  name: 'tkf/js',
  format({ dictionary }) {
    const lines = ['/* Auto-generated. Do not edit. */', 'export const tokens = {'];
    for (const token of dictionary.allTokens) {
      const key = token.path.join('_');
      lines.push(`  ${key}: ${JSON.stringify(token.value)},`);
    }
    lines.push('} as const;');
    lines.push('');
    lines.push('export type Token = keyof typeof tokens;');
    return lines.join('\n');
  },
});

StyleDictionary.registerFormat({
  name: 'tkf/dts',
  format({ dictionary }) {
    const lines = ['/* Auto-generated. Do not edit. */', 'export declare const tokens: {'];
    for (const token of dictionary.allTokens) {
      const key = token.path.join('_');
      const type = typeof token.value === 'number' ? 'number' : 'string';
      lines.push(`  readonly ${key}: ${type};`);
    }
    lines.push('};');
    lines.push('export type Token = keyof typeof tokens;');
    return lines.join('\n');
  },
});

// ---- Light build --------------------------------------------------------
const lightSd = new StyleDictionary({
  source: lightSources,
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: `${distDir}/`,
      files: [{ destination: 'tokens-light.css', format: 'tkf/css-root' }],
    },
    js: {
      transformGroup: 'js',
      buildPath: `${distDir}/`,
      files: [
        { destination: 'tokens.js', format: 'tkf/js' },
        { destination: 'tokens.d.ts', format: 'tkf/dts' },
      ],
    },
    json: {
      transformGroup: 'web',
      buildPath: `${distDir}/`,
      files: [{ destination: 'tokens.json', format: 'json/nested' }],
    },
  },
});

await lightSd.cleanAllPlatforms();
await lightSd.buildAllPlatforms();

// ---- Dark build ---------------------------------------------------------
const darkSd = new StyleDictionary({
  source: darkSources,
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: `${distDir}/`,
      files: [{ destination: 'tokens-dark.css', format: 'tkf/css-dark' }],
    },
  },
});

await darkSd.cleanAllPlatforms();
await darkSd.buildAllPlatforms();

// ---- Concatenate into single tokens.css --------------------------------
const { readFile } = await import('node:fs/promises');
const light = await readFile(resolve(distDir, 'tokens-light.css'), 'utf8');
const dark = await readFile(resolve(distDir, 'tokens-dark.css'), 'utf8');
await writeFile(resolve(distDir, 'tokens.css'), `${light}\n\n${dark}\n`);

// ---- Dist README --------------------------------------------------------
await writeFile(
  resolve(distDir, 'README.md'),
  `# Generated design tokens\n\nRegenerate with \`pnpm tokens\`.\n\n- \`tokens.css\` — light (:root) + dark ([data-theme="dark"])\n- \`tokens.js\` / \`tokens.d.ts\` — strongly-typed JS constants (light only)\n- \`tokens.json\` — raw nested JSON\n`,
);

console.log('✓ design tokens built →', distDir);
