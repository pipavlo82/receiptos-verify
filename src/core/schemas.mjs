import Ajv from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';
import { problem } from './common.mjs';
const ajv=new Ajv({allErrors:true,strict:true,allowUnionTypes:true});
const load=name=>JSON.parse(readFileSync(new URL('../../schemas/'+name+'.schema.json',import.meta.url),'utf8'));
ajv.addSchema(load('semantic-contract'));
const validators={request:ajv.compile(load('request')),bundle:ajv.compile(load('bundle')),report:ajv.compile(load('report'))};
export function validateSchema(name,value) {
  if(!validators[name](value)) throw problem('SCHEMA_MISMATCH',ajv.errorsText(validators[name].errors,{separator:'; '}));
  return true;
}
