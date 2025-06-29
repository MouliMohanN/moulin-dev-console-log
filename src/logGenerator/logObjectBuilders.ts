import { CodeContext } from '../types';
import { addVariables } from './variableHandlers';

export function buildParentLogObject(context: CodeContext, logItemsConfig: string[]): string | undefined {
  if (context.parentContext) {
    return `parent: ${buildLogObject(context.parentContext, logItemsConfig)}`;
  }
  return undefined;
}

export function buildLogObject(context: CodeContext, logItemsConfig: string[]): string {
  const parts: string[] = [];
  addVariables(context.variables, logItemsConfig, context, parts);
  const parent = buildParentLogObject(context, logItemsConfig);
  if (parent) {
    parts.push(parent);
  }
  return `{ ${parts.join(', ')} }`;
}
