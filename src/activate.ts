import * as vscode from 'vscode';
import { insertLogCommand, wrapInConsoleLogCommand, cleanLogsCommand } from './commands';
import { initLogger, logger } from './logger';

export function activate(context: vscode.ExtensionContext) {
  initLogger(true);
  logger.log('activate.ts ~ activate Contextual Console Log Extension Activated');

  const insertLogDisposable = vscode.commands.registerCommand('contextualConsoleLog.insertLog', insertLogCommand);

  const wrapInConsoleLogDisposable = vscode.commands.registerCommand(
    'contextualConsoleLog.wrapInConsoleLog',
    wrapInConsoleLogCommand,
  );

  const cleanLogsDisposable = vscode.commands.registerCommand(
    'contextualConsoleLog.cleanLogs',
    cleanLogsCommand,
  );

  context.subscriptions.push(insertLogDisposable, wrapInConsoleLogDisposable, cleanLogsDisposable);
}

export function deactivate() {
  // No specific cleanup needed for now, as functions don't manage resources requiring explicit disposal.
}
