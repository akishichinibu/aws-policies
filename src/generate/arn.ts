import * as path from 'path';

import { writeFile } from 'fs';
import { promisify } from 'util';
import { fetchPoliciesScript } from './fetch';
import { exportRoot, normalToImportName } from './utils';

function mapRef(ref: string) {
  switch (ref) {
    case 'partition': {
      return '${Partition}';
    }
    case 'servicename': {
      return '${Service}';
    }
    default: {
      return '${string}';
    }
  }
}

const patternJoin = (ps: string[], delimeter: string) => {
  return `Join<'${delimeter}', [${ps.map((r) => (r.startsWith('Join<') ? r : `\`${r}\``)).join(', ')}]>`;
};

export async function generateArnDefinition() {
  const config = await fetchPoliciesScript();

  const fn = 'arn.d.ts';
  const fp = path.join(exportRoot, fn);

  const arnExport: Array<string> = [];
  const arnTypes: Array<string> = [];

  for (const [name, service] of Object.entries(config.serviceMap)) {
    // service.ARNFormat && service.ARNRegex && console.log(`${name} [${service.ARNRegex}]`);

    if (service.ARNRegex === undefined) continue;

    const regex = service.ARNRegex[0] === '^' ? service.ARNRegex.slice(1) : service.ARNRegex;

    const patterns = regex
      .split(':')
      .slice(3)
      .map((r_) => {
        const parts = r_.split('/').map((r) => {
          if (r === '') {
            return '';
          } else if (r === '.+' || r === '.+?') {
            return '${string}';
          } else if (r === '.*' || r === '*') {
            return '${string}';
          } else if (r === '[0-9]+' || r === '[0-9]*') {
            return '${string}';
          } else if (r === '[0-9]{12}') {
            return '${DigitalType}'.repeat(12);
          } else if (r === '[a-z0-9-]+') {
            return '${string}';
          } else if (r === '[a-zA-Z0-9_.-]+') {
            return '${string}';
          } else if (r.startsWith('(') && r.endsWith(')')) {
            const choices = r.slice(1, -1).trim().split('|');
            console.log(choices, `\${${choices.map((c) => `"${c}"`).join(' | ')}}`);
            return `\${${choices.map((c) => `"${c}"`).join(' | ')}}`;
          } else if (r.startsWith('${') && r.endsWith('}')) {
            const ref = r.slice(2, -1).toLowerCase();
            return mapRef(ref);
          } else if (r.startsWith('<') && r.endsWith('>')) {
            const ref = r.slice(1, -1).toLowerCase();
            return mapRef(ref);
          } else {
            console.warn(`[x] ${r} ${service.ARNRegex}`);
            return r;
          }
        });
        return patternJoin(parts, '/');
      });

    const typeName = `${normalToImportName(name)}Arn`;
    arnExport.push(`export type ${typeName} = GetArn<"${service.StringPrefix}", ${patternJoin(patterns, ':')}>;`);
    arnTypes.push(typeName);
  }

  const arnIndex = `
    import { DigitalType, CharType, Join } from "./utils";

    type Partition = 'aws' | 'aws-us-gov' | 'aws-cn';

    type GetArn<S extends Service, B extends string> = Join<':', ['arn', Partition, S, B]>;

    ${arnExport.join(String.fromCharCode(10))}

    export type Arn = ${arnTypes.join(' | ')};
  `;

  await promisify(writeFile)(fp, arnIndex);
  return fn;
}
