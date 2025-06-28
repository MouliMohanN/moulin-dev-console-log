import * as vscode from 'vscode';

export interface ExtensionConfig {
  logTemplate: string;
  logMethod: 'log' | 'warn' | 'error' | 'debug' | 'table';
  logItems: string[];
  addDebugger: boolean;
}

export function getConfiguration(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('contextualConsoleLog');
  return {
    logTemplate: config.get<string>('logTemplate', '[${fileName} > ${functionName}]'),
    logMethod: config.get<'log' | 'warn' | 'error' | 'debug' | 'table'>('logMethod', 'log'),
    logItems: config.get<string[]>('logItems', ['props', 'state', 'refs', 'context', 'reducers', 'locals']),
    addDebugger: config.get<boolean>('addDebugger', false),
  };
}

export function onDidChangeConfiguration(
  callback: (e: vscode.ConfigurationChangeEvent) => any,
  thisArgs?: any,
  disposables?: vscode.Disposable[],
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(callback, thisArgs, disposables);
}
