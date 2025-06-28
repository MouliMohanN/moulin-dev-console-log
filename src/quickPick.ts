import * as vscode from 'vscode';
import { CodeContext } from './types';

export async function showVariableQuickPick(contextInfo: CodeContext): Promise<vscode.QuickPickItem[] | undefined> {
  const allVariables: vscode.QuickPickItem[] = [];

  let currentContext: CodeContext | undefined = contextInfo;
  let depth = 0;

  while (currentContext) {
    const scopePrefix = depth === 0 ? '' : `Parent (${currentContext.name}): `;

    const addVariablesToQuickPick = (variableArray: string[], typeLabel: string) => {
      variableArray.forEach((name: string) => {
        allVariables.push({ label: `${scopePrefix}${typeLabel}: ${name}`, detail: typeLabel });
      });
    };

    if (currentContext.type === 'function') {
      addVariablesToQuickPick(currentContext.args, 'args');
    }

    addVariablesToQuickPick(currentContext.variables.props, 'props');
    addVariablesToQuickPick(currentContext.variables.state, 'state');
    addVariablesToQuickPick(currentContext.variables.refs, 'refs');
    addVariablesToQuickPick(currentContext.variables.context, 'context');
    addVariablesToQuickPick(currentContext.variables.reducers, 'reducers');
    addVariablesToQuickPick(currentContext.variables.locals, 'locals');

    currentContext = currentContext.parentContext;
    depth++;
  }

  return await vscode.window.showQuickPick(allVariables, {
    canPickMany: true,
    placeHolder: 'Select items to log',
  });
}
