import * as vscode from 'vscode';

export interface ExtensionConfig {
  logTemplate: string;
  logLevel: 'log' | 'warn' | 'error' | 'debug' | 'table';
  logItems: string[];
  addDebugger: boolean;
  logFunction: string;
  enableClassMethodLogging: boolean;
  enableHookLogging: boolean;
}

export function getConfiguration(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('contextualConsoleLog');
  return {
    logTemplate: config.get<string>('logTemplate', '[${fileName} > ${functionName}]'),
    logLevel: config.get<'log' | 'warn' | 'error' | 'debug' | 'table'>('logLevel', 'log'),
    logItems: config.get<string[]>('logItems', ['props', 'state', 'refs', 'context', 'reducers', 'locals']),
    addDebugger: config.get<boolean>('addDebugger', false),
    logFunction: config.get<string>('logFunction', 'console'),
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
