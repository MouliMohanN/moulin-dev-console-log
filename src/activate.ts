import * as vscode from 'vscode';
import { cleanLogsCommand, insertLogCommand, insertLogForFileCommand, wrapInConsoleLogCommand } from './commands';
import { initLogger, logger } from './logger';
import { openTemplateEditor } from './templateEditor';

export function activate(context: vscode.ExtensionContext) {
  initLogger(true);
  logger.log('activate.ts ~ activate Contextual Console Log Extension Activated');

  // Initialize logging state
  vscode.commands.executeCommand('setContext', 'contextualConsoleLog.isLoggingEnabled', true);

  // Create status bar item
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'contextualConsoleLog.toggleLogging';
  statusBarItem.tooltip = 'Toggle Contextual Log Insertion';
  statusBarItem.text = '$(check) Log';
  statusBarItem.show();

  // Register toggle command
  const toggleLoggingDisposable = vscode.commands.registerCommand('contextualConsoleLog.toggleLogging', () => {
    const currentState = context.globalState.get('contextualConsoleLog.isLoggingEnabled', true);
    vscode.commands.executeCommand('setContext', 'contextualConsoleLog.isLoggingEnabled', !currentState);
    statusBarItem.text = !currentState ? '$(check) Log' : '$(x) Log';
    logger.info(`Contextual Log Insertion ${!currentState ? 'Enabled' : 'Disabled'}.`);
  });

  const insertLogDisposable = vscode.commands.registerCommand('contextualConsoleLog.insertLog', insertLogCommand);

  const wrapInConsoleLogDisposable = vscode.commands.registerCommand(
    'contextualConsoleLog.wrapInConsoleLog',
    wrapInConsoleLogCommand,
  );

  const cleanLogsDisposable = vscode.commands.registerCommand('contextualConsoleLog.cleanLogs', cleanLogsCommand);

  const insertLogForFileDisposable = vscode.commands.registerCommand(
    'contextualConsoleLog.insertLogForFile',
    insertLogForFileCommand,
  );

  const openTemplateEditorDisposable = vscode.commands.registerCommand(
    'contextualConsoleLog.openTemplateEditor',
    () => openTemplateEditor(context),
  );

  context.subscriptions.push(
    insertLogDisposable,
    wrapInConsoleLogDisposable,
    cleanLogsDisposable,
    insertLogForFileDisposable,
    statusBarItem,
    toggleLoggingDisposable,
    openTemplateEditorDisposable,
  );
}

export function deactivate() {
  // No specific cleanup needed for now, as functions don't manage resources requiring explicit disposal.
}
