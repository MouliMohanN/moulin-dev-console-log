import * as t from '@babel/types';
import traverse from '@babel/traverse';
import * as vscode from 'vscode';

import { VariableBuckets } from '../types';
import { createEmptyVariableBuckets } from './contextCollectors';

export function getSmartSuggestionsAtCursor(ast: t.File, cursor: vscode.Position, doc: vscode.TextDocument, scope: any): VariableBuckets {
  const suggestions = createEmptyVariableBuckets();

  Object.values(scope.bindings).forEach((binding: any) => {
    if (binding.kind === 'var' || binding.kind === 'let' || binding.kind === 'const' || binding.kind === 'param') {
      suggestions.locals.push(binding.identifier.name);
    }
  });

  // Return unique suggestions for each category
  for (const key in suggestions) {
    suggestions[key as keyof VariableBuckets] = [...new Set(suggestions[key as keyof VariableBuckets])];
  }
  return suggestions;
}
