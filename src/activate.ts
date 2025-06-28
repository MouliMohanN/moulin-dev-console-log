import * as vscode from 'vscode';
import { insertLogCommand, wrapInConsoleLogCommand, cleanLogsCommand, insertLogForFileCommand } from './commands';
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

  const insertLogForFileDisposable = vscode.commands.registerCommand(
    'contextualConsoleLog.insertLogForFile',
    insertLogForFileCommand,
  );

  context.subscriptions.push(insertLogDisposable, wrapInConsoleLogDisposable, cleanLogsDisposable, insertLogForFileDisposable);
}

export function deactivate() {
  // No specific cleanup needed for now, as functions don't manage resources requiring explicit disposal.
}
