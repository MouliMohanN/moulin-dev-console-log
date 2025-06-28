import * as vscode from 'vscode';

export interface ExtensionConfig {
  logTemplate: string;
  logMethod: 'log' | 'warn' | 'error' | 'debug' | 'table';
  logItems: string[];
  addDebugger: boolean;
  useLogger: boolean;
  enableClassMethodLogging: boolean;
  enableHookLogging: boolean;
}

export function getConfiguration(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('contextualConsoleLog');
  return {
    logTemplate: config.get<string>('logTemplate', '[${fileName} > ${functionName}]'),
    logMethod: config.get<'log' | 'warn' | 'error' | 'debug' | 'table'>('logMethod', 'log'),
    logItems: config.get<string[]>('logItems', ['props', 'state', 'refs', 'context', 'reducers', 'locals']),
    addDebugger: config.get<boolean>('addDebugger', false),
    useLogger: config.get<boolean>('useLogger', false),
    enableClassMethodLogging: config.get<boolean>('enableClassMethodLogging', false),
    enableHookLogging: config.get<boolean>('enableHookLogging', false),
  };
}

export function onDidChangeConfiguration(
  callback: (e: vscode.ConfigurationChangeEvent) => any,
  thisArgs?: any,
  disposables?: vscode.Disposable[],
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(callback, thisArgs, disposables);
}
