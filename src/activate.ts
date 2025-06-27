import * as vscode from 'vscode';
import { generateConsoleLog } from './logGenerator';
import { initLogger, logger } from './logger';
import { parseCodeContext } from './parser';

export function activate(context: vscode.ExtensionContext) {
  initLogger(true);
  logger.log('activate.ts ~ activate Contextual Console Log Extension Activated');

  const disposable = vscode.commands.registerCommand('contextualConsoleLog.insertLog', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selections.length !== 1) {
      logger.warn(' activate.ts ~ disposable ~ editor.selections: Only single cursor supported.', editor?.selections);
      return;
    }

    const doc = editor.document;
    const cursor = editor.selection.active;
    const code = doc.getText();
    //   const fileName = doc.fileName.split(/[/\\]/).pop() || 'Unknown';
    const fileName = vscode.workspace.asRelativePath(doc.uri);

    try {
      const contextInfo = parseCodeContext(code, cursor, doc);

      if (!contextInfo) {
        logger.warn('No valid context found for logging.', { doc, cursor, code, fileName });
        return;
      }

      const logLine = generateConsoleLog(contextInfo, fileName);

      await editor.edit((editBuilder) => {
        editBuilder.insert(contextInfo.insertPos, logLine + '\n');
      });
    } catch (err) {
      logger.error('Console log generation failed: ' + (err as Error).message);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
