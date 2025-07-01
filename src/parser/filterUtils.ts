import { VariableBuckets, CodeContext } from '../types';

export function filterUnusedVariables(variables: VariableBuckets, scope: any) {
  filterVariables(variables, (name: string) => {
    const binding = scope.getBinding(name);
    return !binding || binding.referenced;
  });
}

export function filterSensitiveKeys(context: CodeContext, sensitiveKeys: string[]) {
  filterVariables(context.variables, (name: string) => !sensitiveKeys.includes(name));
  context.args = context.args.filter((name: string) => !sensitiveKeys.includes(name));
}

function filterVariables(variables: VariableBuckets, predicate: (name: string) => boolean) {
  for (const key in variables) {
    const category = key as keyof VariableBuckets;
    variables[category] = variables[category].filter(predicate);
  }
}
