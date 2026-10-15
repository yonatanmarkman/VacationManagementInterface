/**
 * Copies src/root.yaml next to the compiled entry point (dist/), where CEF expects to find it.
 */
import { copyFileSync } from 'node:fs';

copyFileSync('src/root.yaml', 'dist/root.yaml');
console.log('Copied src/root.yaml -> dist/root.yaml');
