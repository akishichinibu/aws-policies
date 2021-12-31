import * as path from 'path';
import { existsSync, writeFile, mkdir } from 'fs';
import { promisify } from 'util';

import { fetchPoliciesScript, Service } from './fetch';
import { exportRoot, importStatement, normalToFileName, normalToImportName } from './utils';

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

  'Associate',
  'Disassociate',

  'Batch',
  'Allocate',
  'Replace',
  'Reset',
  'Search',
  'Modify',
  'Admin',
  'Register',
  'Deregister'
]);

function generateActionDefinitionFromService(service: Service) {
  const actionGroup = new Map<string | null, Array<string>>();

  for (let a of service.Actions) {
    let hasMatch = false;

    for (let p of actionGroupPrefix) {
      if (a.startsWith(p)) {
        !actionGroup.has(p) && actionGroup.set(p, []);
        actionGroup.get(p)!.push(a.slice(p.length));
        hasMatch = true;
        break;
      }
    }

    if (!hasMatch) {
      !actionGroup.has(null) && actionGroup.set(null, []);
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

  for (let a of otherActions) console.log(`[*] ${a}`);

  const r = `
import { MapperToLiteral } from "../utils";

export type StringPrefix = "${service.StringPrefix}";

${groupActionTargetDeclration.join(`${String.fromCharCode(10)}${String.fromCharCode(10)}`)}

type Action = ${groupActionTargets.length > 0 ? groupActionTargets.join(' | ') : 'never'};

type OtherAction = ${otherActions.length > 0 ? otherActions.map((r) => `"${r}"`).join(' | ') : 'never'};

type AllActionWildCard = "*";

type GroupActionWildCard = ${groupActionWildCards.length > 0 ? groupActionWildCards.join(' | ') : 'never'};

export type ActionWithPrefix = MapperToLiteral<Record<StringPrefix, Action | OtherAction | AllActionWildCard | GroupActionWildCard>>;
`;

  return r;
}

const getExportTypeAlias = (name: string) => `${normalToImportName(name)}Action`;

const getStringPrefixTypeAlias = (name: string) => `${normalToImportName(name)}StringPrefix`;

export async function generateActionDefinition() {
  const config = await fetchPoliciesScript();
  const actionImports: Array<string> = [];
  const futures: Array<Promise<any>> = [];

  const folderName = 'action';
  const folderPath = path.join(exportRoot, folderName);

  if (!existsSync(folderPath)) {
    await promisify(mkdir)(folderPath, { recursive: true });
  }

  for (const [name, service] of Object.entries(config.serviceMap)) {
    const fn = normalToFileName(name);
    console.log(name, fn);

    const fp = path.join(folderPath, `${fn}.d.ts`);
    const task = promisify(writeFile)(fp, generateActionDefinitionFromService(service));

    const import_ = importStatement(`./${folderName}/${fn}`, {
      ActionWithPrefix: getExportTypeAlias(name),
      StringPrefix: getStringPrefixTypeAlias(name)
    });

    actionImports.push(import_);
    futures.push(task);
  }

  const index = `
  ${Array.from(new Set(actionImports)).join(String.fromCharCode(10))}

  type WildCard = "*";

  export type Service = ${Object.keys(config.serviceMap).map(getStringPrefixTypeAlias).join(' | ')};

  export type Action = ${Object.keys(config.serviceMap).map(getExportTypeAlias).join(' | ')} | WildCard;
`;

  const fn = 'action.d.ts';
  const fp = path.join(exportRoot, fn);

  await Promise.all([promisify(writeFile)(fp, index), ...futures]);
  return fn;
}
