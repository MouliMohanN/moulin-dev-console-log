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
        const filteredRefs = variables[key as keyof VariableBuckets].map((s: string) => `${s}: ${s}.current`).join(', ');
        if (filteredRefs) {
          parts.push(`${prefix}${key}: { ${filteredRefs} }`);
        }
      } else if (key === 'reducers') {
        const filteredReducers = variables[key as keyof VariableBuckets].map((s: string) => s).join(', ');
        if (filteredReducers) {
          parts.push(`${prefix}reducer: { ${filteredReducers} }`);
        }
      } else if (key === 'args') {
        const filteredArgs = variables[key as keyof VariableBuckets].map((s: string) => s).join(', ');
        if (filteredArgs) {
          parts.push(`${prefix}${key}: { ${filteredArgs} }`);
        }
      } else {
        const filteredVars = variables[key as keyof VariableBuckets].map((s: string) => s).join(', ');
        if (filteredVars) {
          parts.push(`${prefix}${key}: { ${filteredVars} }`);
        }
      }
    }
  }
}
