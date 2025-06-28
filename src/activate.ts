import * as vscode from 'vscode';
import { generateConsoleLog } from './logGenerator';
import { initLogger, logger } from './logger';
import { parseCodeContext } from './parser';

export function activate(context: vscode.ExtensionContext) {
  initLogger(true);
  logger.log('activate.ts ~ activate Contextual Console Log Extension Activated');

  const disposable = vscode.commands.registerCommand('contextualConsoleLog.insertLog', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const doc = editor.document;
    const code = doc.getText();
    const fileName = vscode.workspace.asRelativePath(doc.uri);

    // Get context for the first selection to populate the quick pick
    const firstCursor = editor.selections[0].active;
    const firstContextInfo = parseCodeContext(code, firstCursor, doc);

    if (!firstContextInfo) {
      logger.warn('No valid context found for logging at the first cursor.', { doc, cursor: firstCursor, code, fileName });
      return;
    }

    const allVariables = [
      ...firstContextInfo.variables.props.map((p) => ({ label: `props: ${p}`, detail: 'Prop' })),
      ...firstContextInfo.variables.state.map((s) => ({ label: `state: ${s}`, detail: 'State' })),
      ...firstContextInfo.variables.refs.map((r) => ({ label: `refs: ${r}`, detail: 'Ref' })),
      ...firstContextInfo.variables.context.map((c) => ({ label: `context: ${c}`, detail: 'Context' })),
      ...firstContextInfo.variables.reducers.map((r) => ({ label: `reducers: ${r}`, detail: 'Reducer' })),
      ...firstContextInfo.variables.locals.map((l) => ({ label: `locals: ${l}`, detail: 'Local' })),
      ...(firstContextInfo.type === 'function' ? firstContextInfo.args.map((a) => ({ label: `args: ${a}`, detail: 'Argument' })) : []),
    ];

    const selectedItems = await vscode.window.showQuickPick(allVariables, {
      canPickMany: true,
      placeHolder: 'Select items to log',
    });

    // Prepare all edits before applying them
    const edits: { insertPos: vscode.Position; logLine: string }[] = [];

    for (const selection of editor.selections) {
      const cursor = selection.active;
      try {
        const contextInfo = parseCodeContext(code, cursor, doc);

        if (!contextInfo) {
          logger.warn('No valid context found for logging.', { doc, cursor, code, fileName });
          continue;
        }

        let logLine: string;
        if (selectedItems && selectedItems.length > 0) {
          const selectedLabels = selectedItems.map((item) => item.label);
          logLine = generateConsoleLog(contextInfo, fileName, selectedLabels);
        } else {
          logLine = generateConsoleLog(contextInfo, fileName);
        }
        edits.push({ insertPos: contextInfo.insertPos, logLine });
      } catch (err) {
        logger.error('Console log generation failed: ' + (err as Error).message);
      }
    }

    // Apply all edits in a single operation
    await editor.edit((editBuilder) => {
      edits.forEach((edit) => {
        editBuilder.insert(edit.insertPos, edit.logLine + '\n');
      });
    });
  });

  context.subscriptions.push(disposable);

  const wrapDisposable = vscode.commands.registerCommand('contextualConsoleLog.wrapInConsoleLog', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    await editor.edit((editBuilder) => {
      for (const selection of editor.selections) {
        const selectedText = editor.document.getText(selection);
        if (selectedText) {
          const logLine = `console.log({ ${selectedText} });`;
          editBuilder.replace(selection, logLine);
        }
      }
    });
  });

  context.subscriptions.push(wrapDisposable);
}

export function deactivate() {}