import { generateActionDefinition } from './action';
import { generateArnDefinition } from './arn';

async function run() {
  const fns = await Promise.all([generateActionDefinition(), generateArnDefinition()]);
}

run();
