import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

const OPENAPI_PATH = resolve(
  process.cwd(),
  '../../openspec/changes/init-baby-weaning-tracker/openapi.yaml',
);

export const openapiDocument = yaml.load(readFileSync(OPENAPI_PATH, 'utf8')) as object;
