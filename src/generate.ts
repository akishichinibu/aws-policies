import * as path from 'path';
import * as http from 'http';

import { existsSync, writeFile } from 'fs';
import { promisify } from 'util';

const toMinify = process.argv.findIndex((r) => r === 'minify') !== -1;


const actionGroupPrefix = new Set([
  'Put',
  'Post',
  'Create',
  'Update',
  'Delete',
  'List',
  'Describe',
  'Cancel',

  'Get',
  'Set',
  'Start',
  'Stop',
  'Reject',
  'Accept',
  'Attach',
  'Detach',
  'Import',
  'Export',
  'Add',
  'Remove',
  'Disable',
  'Enable',
  'Tag',
  'Untag',

  'Notify',
  'Send',
  'Publish',
  'Invoke',

  'Batch',
  'Search'
]);

interface Service {
  StringPrefix: string;
  Actions: Array<string>;
}

interface PoliciesConfig {
  serviceMap: { [service: string]: Service };
}

function minify(s: string) {
  return toMinify ? s.replaceAll('\n', '').replaceAll(' = ', '=').replaceAll(' | ', '|') : s;
}

async function fetchPoliciesScript() {
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

function normalImportName(s: string) {
  const parts = s.split('-');
  const n = parts.length;

  for (let i = 1; i < n; i++) {
    const s = parts[i];
    parts[i] = `${s.slice(0, 1).toUpperCase()}${s.slice(1)}`;
  }

  return parts.join('');
}

function generateDefinitionFromService(service: Service) {
  const actionGroup = new Map<string | null, Array<string>>();

  for (let a of service.Actions) {
    let hasMatch = false;

    for (let p of actionGroupPrefix) {
      if (a.startsWith(p)) {
        if (!actionGroup.has(p)) {
          actionGroup.set(p, []);
        }
        actionGroup.get(p)!.push(a.slice(p.length));
        hasMatch = true;
        break;
      }
    }

    if (!hasMatch) {
      if (!actionGroup.has(null)) {
        actionGroup.set(null, []);
      }

      actionGroup.get(null)!.push(a);
    }
  }

  const groupActionTargetDeclration: Array<string> = [];
  const groupActionTargets: Array<string> = [];

  for (const [p, as] of actionGroup.entries()) {
    if (p !== null) {
      const actionTargetTypeName = `${p}ActionTarget`;

      groupActionTargets.push(`\`${p}\${${actionTargetTypeName}}\``);
      groupActionTargetDeclration.push(`type ${actionTargetTypeName} = ${as.map((r) => `"${r}"`).join(' | ')};`);
    }
  }

  const otherActions = actionGroup.get(null) ?? [];

  const groupActionWildCards = Array.from(actionGroup)
    .filter(([k, v]) => k !== null && v.length > 0)
    .map(([k, _]) => `"${k}*"`);

  const r = `
import { MapperToLiteral } from "../utils";

type StringPrefix = "${service.StringPrefix}";

${groupActionTargetDeclration.join(`${String.fromCharCode(10)}${String.fromCharCode(10)}`)}

type Action = ${groupActionTargets.length > 0 ? groupActionTargets.join(' | ') : 'never'};

type OtherAction = ${otherActions.length > 0 ? otherActions.map((r) => `"${r}"`).join(' | ') : 'never'};

type AllActionWildCard = "*";

type GroupActionWildCard = ${groupActionWildCards.length > 0 ? groupActionWildCards.join(' | ') : 'never'};

type ActionWithPrefix = MapperToLiteral<Record<StringPrefix, Action | OtherAction | AllActionWildCard | GroupActionWildCard>>;

export default ActionWithPrefix;
`;

  return minify(r);
}

async function generate() {
  const config = await fetchPoliciesScript();
  const actionImports: Array<string> = [];
  const actionImportNames: Array<string> = [];
  const futures: Array<Promise<any>> = [];

  const serviceFolderName = 'service';

  for (const [name, service] of Object.entries(config.serviceMap)) {
    console.log(name);
    const task = promisify(writeFile)(`${__dirname}/${serviceFolderName}/${service.StringPrefix}.d.ts`, generateDefinitionFromService(service));
    const importName = `${normalImportName(service.StringPrefix)}Action`;
    actionImportNames.push(importName);
    actionImports.push(`import ${importName} from "./${serviceFolderName}/${service.StringPrefix}";`);
    futures.push(task);
  }

  const index = minify(`
  ${Array.from(new Set(actionImports)).join(String.fromCharCode(10))}

  type WildCard = "*";

  export type Action =
    ${actionImportNames.join(` | ${String.fromCharCode(10)}`)} | WildCard;
  `);

  await Promise.all([promisify(writeFile)(path.join(__dirname, 'index.d.ts'), index), ...futures]);
}

generate();
