import { CodeContext, VariableBuckets } from '../types';

export function addVariables(
  variables: VariableBuckets,
  logItemsConfig: string[],
  context: CodeContext,
  parts: string[],
  prefix: string = '',
) {
  for (const key in variables) {
    if (logItemsConfig.includes(key) && variables[key as keyof VariableBuckets].length) {
      if (key === 'refs') {
        const filteredRefs = variables[key as keyof VariableBuckets].map((s: string) => `...(typeof ${s}.current !== 'function' && { ${s}: ${s}.current })`).join(', ');
        if (filteredRefs) {
          parts.push(`${prefix}${key}: { ${filteredRefs} }`);
        }
      } else if (key === 'reducers') {
        const filteredReducers = variables[key as keyof VariableBuckets].map((s: string) => `...(typeof ${s} !== 'function' && { ${s}: ${s} })`).join(', ');
        if (filteredReducers) {
          parts.push(`${prefix}reducer: { ${filteredReducers} }`);
        }
      } else if (key === 'args' && context.type !== 'function') {
        continue;
      } else {
        const filteredVars = variables[key as keyof VariableBuckets].map((s: string) => `...(typeof ${s} !== 'function' && { ${s}: ${s} })`).join(', ');
        if (filteredVars) {
          parts.push(`${prefix}${key}: { ${filteredVars} }`);
        }
      }
    }
  }
}
