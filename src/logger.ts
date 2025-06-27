import * as vscode from 'vscode';

let useOutputChannel = false;
let outputChannel: vscode.OutputChannel | null = null;

export function initLogger(useOutput: boolean, channelName = 'contextualConsoleLog.insertLog') {
  useOutputChannel = useOutput;
  if (useOutput && !outputChannel) {
    outputChannel = vscode.window.createOutputChannel(channelName);
  }
}

function writeLog(level: 'log' | 'warn' | 'error', message: string, data?: any) {
  const messageWithTag = '[Contextual Console Log] ' + message;
  const formatted = `[${level.toUpperCase()}] ${messageWithTag}${data ? ' ' + JSON.stringify(data, null, 2) : ''}`;

  outputChannel?.appendLine(formatted);
  console[level](formatted, data ?? '');

  if (level === 'warn') {
    vscode.window.showWarningMessage(messageWithTag);
  } else if (level === 'error') {
    vscode.window.showErrorMessage(messageWithTag);
  }
}

export const logger = {
  log: (message: string, data?: any) => writeLog('log', message, data),
  warn: (message: string, data?: any) => writeLog('warn', message, data),
  error: (message: string, data?: any) => writeLog('error', message, data),
  dispose: () => outputChannel?.dispose(),
  clear: () => outputChannel?.clear(),
};
