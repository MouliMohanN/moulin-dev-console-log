import * as vscode from 'vscode';

export interface ExtensionConfig {
  logTemplate: string;
  logLevel: string;
  logItems: string[];
  addDebugger: boolean;
  logFunction: string;
  enableClassMethodLogging: boolean;
  enableHookLogging: boolean;
  logTag: string;
  wrapInDevCheck: boolean;
  showPreview: boolean;
  enableTelemetry: boolean;
  enableReduxContextLogging: boolean;
  customLoggerImportStatement: string;
}

export function getConfiguration(): ExtensionConfig {
  const config = vscode.workspace.getConfiguration('contextualConsoleLog');
  return {
    logTemplate: config.get<string>('logTemplate', '[${fileName} > ${functionName}]'),
    logLevel: config.get<string>('logLevel', 'log'),
    logItems: config.get<string[]>('logItems', ['props', 'state', 'refs', 'context', 'reducers', 'locals']),
    addDebugger: config.get<boolean>('addDebugger', false),
    logFunction: config.get<string>('logFunction', 'console'),
    enableClassMethodLogging: config.get<boolean>('enableClassMethodLogging', true),
    enableHookLogging: config.get<boolean>('enableHookLogging', true),
    logTag: config.get<string>('logTag', '// @contextual-log'),
    wrapInDevCheck: config.get<boolean>('wrapInDevCheck', false),
    showPreview: config.get<boolean>('showPreview', false),
    enableTelemetry: config.get<boolean>('enableTelemetry', true),
    enableReduxContextLogging: config.get<boolean>('enableReduxContextLogging', false),
    customLoggerImportStatement: config.get<string>('customLoggerImportStatement', ''),
  };
}

export function onDidChangeConfiguration(
  callback: (e: vscode.ConfigurationChangeEvent) => any,
  thisArgs?: any,
  disposables?: vscode.Disposable[],
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(callback, thisArgs, disposables);
}