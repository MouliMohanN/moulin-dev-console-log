import * as vscode from 'vscode';

let useOutputChannel = false;
let outputChannel: vscode.OutputChannel | null = null;

type LogLevel = 'info' | 'log' | 'warn' | 'error';

const privateUtils = {
  getVsCodeMessageFunction(level: LogLevel): ((message: string) => Thenable<void>) | null {
    switch (level) {
      case 'info':
        return vscode.window.showInformationMessage;
      case 'warn':
        return vscode.window.showWarningMessage;
      case 'error':
        return vscode.window.showErrorMessage;
      default:
        return null;
    }
  },

  showVSCodeMessage(level: LogLevel, message: string): void {
    const showMessage = privateUtils.getVsCodeMessageFunction(level);
    if (showMessage) {
      showMessage(message);
    }
  },

  writeLog(level: LogLevel, message: string, data?: any) {
    const messageWithTag = '[Contextual Console Log] ' + message;
    const formatted = `[${level.toUpperCase()}] ${messageWithTag}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`;
    outputChannel?.appendLine(formatted);
    console[level](formatted, data ?? '');
    privateUtils.showVSCodeMessage(level, messageWithTag);
  },
};

export function initLogger(useOutput: boolean, channelName = 'contextualConsoleLog.insertLog') {
  useOutputChannel = useOutput;
  if (useOutput && !outputChannel) {
    outputChannel = vscode.window.createOutputChannel(channelName);
  }
}

export const logger = {
  info: (message: string, data?: any) => privateUtils.writeLog('info', message, data),
  log: (message: string, data?: any) => privateUtils.writeLog('log', message, data),
  warn: (message: string, data?: any) => privateUtils.writeLog('warn', message, data),
  error: (message: string, data?: any) => privateUtils.writeLog('error', message, data),

  dispose: () => outputChannel?.dispose(),
  clear: () => outputChannel?.clear(),
};
