import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const versionArg = process.argv[2] ?? getPackageVersion();

if (!versionArg) {
  console.error('Usage: npm run release:version -- <version>');
  console.error('Or run without args to use package.json version.');
  process.exit(1);
}

const normalized = versionArg.startsWith('v') ? versionArg : `v${versionArg}`;

const distDir = resolve(process.cwd(), 'dist');
const versionDir = resolve(distDir, normalized);

const requiredFiles = [
  'dot2dot.umd.js',
  'dot2dot.umd.js.map',
  'dot2dot.esm.js',
  'dot2dot.esm.js.map',
  'types.d.ts'
];

for (const file of requiredFiles) {
  const filePath = resolve(distDir, file);
  if (!existsSync(filePath)) {
    console.error(`Missing build artifact: dist/${file}`);
    console.error('Run `npm run build` first.');
    process.exit(1);
  }
}

mkdirSync(versionDir, { recursive: true });

for (const file of requiredFiles) {
  cpSync(resolve(distDir, file), resolve(versionDir, file));
}

console.log(`Versioned artifacts created at dist/${normalized}`);

function getPackageVersion() {
  const packageJsonPath = resolve(process.cwd(), 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  const raw = readFileSync(packageJsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (typeof parsed.version !== 'string' || parsed.version.trim() === '') {
    return null;
  }

  return parsed.version;
}
