import { VariableBuckets } from '../types';

export function filterUnusedVariables(variables: VariableBuckets, scope: any) {
  filterVariables(variables, (name: string) => {
    const binding = scope.getBinding(name);
    return !binding || binding.referenced;
  });
}

export function filterSensitiveKeys(variables: VariableBuckets, sensitiveKeys: string[]) {
  filterVariables(variables, (name: string) => !sensitiveKeys.includes(name));
}

function filterVariables(variables: VariableBuckets, predicate: (name: string) => boolean) {
  for (const key in variables) {
    const category = key as keyof VariableBuckets;
    variables[category] = variables[category].filter(predicate);
  }
}
