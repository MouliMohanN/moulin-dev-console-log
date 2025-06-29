import * as vscode from 'vscode';
import { CodeContext } from './types';
import { logger } from './logger';

const privateUtils = {
  getScopePrefix(depth: number, contextName: string): string {
    return depth === 0 ? '' : `Parent (${contextName}): `;
  },
  addVariablesToQuickPick(
    allVariables: vscode.QuickPickItem[],
    variableArray: string[],
    typeLabel: string,
    scopePrefix: string,
  ) {
    variableArray.forEach((name: string) => {
      allVariables.push({ label: `${scopePrefix}${typeLabel}: ${name}`, detail: typeLabel });
    });
  },
};

export async function showVariableQuickPick(contextInfo: CodeContext): Promise<vscode.QuickPickItem[] | undefined> {
  const allVariables: vscode.QuickPickItem[] = [];

  // Add smart suggestions first
  if (contextInfo.smartSuggestions && contextInfo.smartSuggestions.length > 0) {
    contextInfo.smartSuggestions.forEach((suggestion) => {
      allVariables.push({ label: suggestion, detail: 'Suggested (based on cursor position)' });
    });
    // Add a separator if there are other variables to follow
    if (Object.values(contextInfo.variables).some(arr => arr.length > 0) || contextInfo.args.length > 0) {
        allVariables.push({ label: '──────────', kind: vscode.QuickPickItemKind.Separator });
    }
  }

  let currentContext: CodeContext | undefined = contextInfo;
  let depth = 0;

  while (currentContext) {
    const scopePrefix = privateUtils.getScopePrefix(depth, currentContext.name);

    if (currentContext.type === 'function') {
      privateUtils.addVariablesToQuickPick(allVariables, currentContext.args, 'args', scopePrefix);
    }

    privateUtils.addVariablesToQuickPick(allVariables, currentContext.variables.props, 'props', scopePrefix);
    privateUtils.addVariablesToQuickPick(allVariables, currentContext.variables.state, 'state', scopePrefix);
    privateUtils.addVariablesToQuickPick(allVariables, currentContext.variables.refs, 'refs', scopePrefix);
    privateUtils.addVariablesToQuickPick(allVariables, currentContext.variables.context, 'context', scopePrefix);
    privateUtils.addVariablesToQuickPick(allVariables, currentContext.variables.reducers, 'reducers', scopePrefix);
    privateUtils.addVariablesToQuickPick(allVariables, currentContext.variables.locals, 'locals', scopePrefix);
    privateUtils.addVariablesToQuickPick(allVariables, currentContext.variables.reduxContext, 'reduxContext', scopePrefix);

    currentContext = currentContext.parentContext;
    depth++;
  }

  const selectedItems = await vscode.window.showQuickPick(allVariables, {
    canPickMany: true,
    placeHolder: 'Select items to log',
  });

  const updatedSelectedItems = selectedItems?.map(item => {
    
    return {
      ...item,
      label: item.label.replace(/Parent ([^:]+): /, ''), // Remove
      
    };
  }) || [];
  
  return updatedSelectedItems;
}
