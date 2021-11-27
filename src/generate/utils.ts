import * as path from 'path';

export function normalToImportName(name: string) {
  return name
    .toLowerCase()
    .replaceAll('(', '')
    .replaceAll(')', '')
    .replaceAll('-', '')
    .replaceAll('.', '')
    .split(' ')
    .map((r) => `${r[0].toUpperCase()}${r.slice(1)}`)
    .join('');
}

export const normalToFileName = (name: string) => name.toLowerCase().split(' ').join('-');

export const exportRoot = path.dirname(__dirname);

export const importState = (from: string, alias: { [source: string]: string | null }) => {
  return `import { ${Object.entries(alias).map(([k, v]) => (v ? `${k} as ${v}` : k))} } from "${from}";`;
};
