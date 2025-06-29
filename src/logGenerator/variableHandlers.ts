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
        parts.push(`${prefix}${key}: { ${variables[key as keyof VariableBuckets].map((s: string) => `${s}: ${s}.current`).join(', ')} }`);
      } else if (key === 'reducers') {
        parts.push(`${prefix}reducer: { ${variables[key as keyof VariableBuckets].join(', ')} }`);
      } else if (key === 'args' && context.type !== 'function') {
        continue;
      } else {
        parts.push(`${prefix}${key}: { ${variables[key as keyof VariableBuckets].join(', ')} }`);
      }
    }
  }
}
