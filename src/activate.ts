import * as vscode from 'vscode';
import { parseCodeContext } from './parser';
import { generateConsoleLog } from './logGenerator';
import { positionIn } from './utils';

export function activate(context: vscode.ExtensionContext) {
  console.log('✅ Contextual Console Log Extension Activated');
  const disposable = vscode.commands.registerCommand('contextualConsoleLog.insertLog', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selections.length !== 1) {
      vscode.window.showWarningMessage('Only single cursor supported.');
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
        vscode.window.showInformationMessage('No valid context found for logging.');
        return;
      }

      const logLine = generateConsoleLog(contextInfo, fileName);

      await editor.edit(editBuilder => {
        editBuilder.insert(contextInfo.insertPos, logLine + '\n');
      });

    } catch (err) {
      vscode.window.showErrorMessage('Console log generation failed: ' + (err as Error).message);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
