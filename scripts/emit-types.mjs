import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve(process.cwd(), 'dist', 'index.d.ts');
const target = resolve(process.cwd(), 'dist', 'types.d.ts');

copyFileSync(source, target);
