import * as path from 'path';
import * as http from 'http';

import { existsSync, writeFile } from 'fs';
import { promisify } from 'util';

export interface Service {
  StringPrefix: string;
  Actions: Array<string>;
  ARNFormat?: string;
  ARNRegex?: string;
}

interface PoliciesConfig {
  serviceMap: { [service: string]: Service };
}

export async function fetchPoliciesScript() {
  const fn = 'policies';
  const fp = path.join(__dirname, `${fn}.ts`);
  const configScriptSrc = 'http://awspolicygen.s3.amazonaws.com/js/policies.js';

  if (!existsSync(fp)) {
    let content = await new Promise<string>((resolve, reject) => {
      const body: Array<string> = [];

      http.get(configScriptSrc, (res) => {
        res.on('data', (data) => {
          body.push(data);
        });
        res.on('error', (error) => {
          reject(error);
        });
        res.on('end', () => {
          resolve(body.join(''));
        });
      });
    });

    content = content.replace('app.PolicyEditorConfig=', 'export default ');
    await promisify(writeFile)(fp, content);
  }

  const config = (await import(`./${fn}`)).default as unknown as PoliciesConfig;
  return config;
}
