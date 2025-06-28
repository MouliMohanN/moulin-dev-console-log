import * as vscode from 'vscode';
import { initLogger, logger } from './logger';
import { ConfigService } from './config';
import { ContextService } from './contextService';
import { LogGeneratorService } from './logGenerator';
import { QuickPickService } from './quickPickService';
import { LogInsertionService } from './logInsertionService';

export function activate(context: vscode.ExtensionContext) {
  initLogger(true);
  logger.log('activate.ts ~ activate Contextual Console Log Extension Activated');

  const configService = ConfigService.getInstance();
  const contextService = new ContextService();
  const logGeneratorService = new LogGeneratorService(configService);
  const quickPickService = new QuickPickService();
  const logInsertionService = new LogInsertionService(contextService, logGeneratorService, quickPickService);

  const insertLogDisposable = vscode.commands.registerCommand(
    'contextualConsoleLog.insertLog',
    () => logInsertionService.insertLog()
  );

  const wrapInConsoleLogDisposable = vscode.commands.registerCommand(
    'contextualConsoleLog.wrapInConsoleLog',
    () => logInsertionService.wrapInConsoleLog()
  );

  context.subscriptions.push(insertLogDisposable, wrapInConsoleLogDisposable);
}

export function deactivate() {
  // No specific cleanup needed for now, as services are not long-lived or don't manage resources requiring explicit disposal.
}
