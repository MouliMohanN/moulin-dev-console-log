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
  enableContextLogging: boolean;
  enableReduxContextLogging: boolean;
  customLoggerImportStatement: string;
  sensitiveKeys: string[];
  ignore: string[];
  filterUnusedVariables: boolean;
  enableDuplicatePrevention: boolean;
  includeLineNumber: boolean;
  enableSmartSuggestions: boolean;
}

export let getConfiguration: () => ExtensionConfig;

// Default implementation
let defaultGetConfiguration = (): ExtensionConfig => {
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
    enableContextLogging: config.get<boolean>('enableContextLogging', true),
    enableReduxContextLogging: config.get<boolean>('enableReduxContextLogging', false),
    customLoggerImportStatement: config.get<string>('customLoggerImportStatement', ''),
    sensitiveKeys: config.get<string[]>('sensitiveKeys', ['password', 'token', 'secret', 'api_key']),
    ignore: config.get<string[]>('ignore', []),
    filterUnusedVariables: config.get<boolean>('filterUnusedVariables', true),
    enableDuplicatePrevention: config.get<boolean>('enableDuplicatePrevention', true),
    includeLineNumber: config.get<boolean>('includeLineNumber', false),
    enableSmartSuggestions: config.get<boolean>('enableSmartSuggestions', true),
  };
};

// Initialize with default
getConfiguration = defaultGetConfiguration;

// Setter for tests
export function setConfiguration(newConfig: () => ExtensionConfig) {
  getConfiguration = newConfig;
}

// Reset to default for cleanup
export function resetConfiguration() {
  getConfiguration = defaultGetConfiguration;
}

export function onDidChangeConfiguration(
  callback: (e: vscode.ConfigurationChangeEvent) => any,
  thisArgs?: any,
  disposables?: vscode.Disposable[],
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration(callback, thisArgs, disposables);
}
