import * as vscode from 'vscode';

export interface ExtensionConfig {
  logTemplate: string;
  logMethod: 'log' | 'warn' | 'error' | 'debug' | 'table';
  logItems: string[];
  addDebugger: boolean;
}

export class ConfigService {
  private static instance: ConfigService;
  private config: vscode.WorkspaceConfiguration;

  private constructor() {
    this.config = vscode.workspace.getConfiguration('contextualConsoleLog');
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public getConfiguration(): ExtensionConfig {
    return {
      logTemplate: this.config.get<string>('logTemplate', '[${fileName} > ${functionName}]'),
      logMethod: this.config.get<'log' | 'warn' | 'error' | 'debug' | 'table'>('logMethod', 'log'),
      logItems: this.config.get<string[]>('logItems', ['props', 'state', 'refs', 'context', 'reducers', 'locals']),
      addDebugger: this.config.get<boolean>('addDebugger', false),
    };
  }

  public onDidChangeConfiguration(
    callback: (e: vscode.ConfigurationChangeEvent) => any,
    thisArgs?: any,
    disposables?: vscode.Disposable[],
  ): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(callback, thisArgs, disposables);
  }
}
