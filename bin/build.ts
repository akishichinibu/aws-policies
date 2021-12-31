import { generateActionDefinition } from "src/action";
import { generateArnDefinition } from 'src/arn';

async function run() {
  const fns = await Promise.all([generateActionDefinition(), generateArnDefinition()]);
}

run();
