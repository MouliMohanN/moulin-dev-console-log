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

    const allVariables: vscode.QuickPickItem[] = [];

    let currentContext = firstContextInfo;
    let depth = 0;

    while (currentContext) {
      const scopePrefix = depth === 0 ? '' : `Parent (${currentContext.name}): `;

      const addVariablesToQuickPick = (variableArray: string[], typeLabel: string) => {
        variableArray.forEach((name: string) => {
          allVariables.push({ label: `${scopePrefix}${typeLabel}: ${name}`, detail: typeLabel });
        });
      };

      if (currentContext.type === 'function') {
        addVariablesToQuickPick(currentContext.args, 'args');
      }

      addVariablesToQuickPick(currentContext.variables.props, 'props');
      addVariablesToQuickPick(currentContext.variables.state, 'state');
      addVariablesToQuickPick(currentContext.variables.refs, 'refs');
      addVariablesToQuickPick(currentContext.variables.context, 'context');
      addVariablesToQuickPick(currentContext.variables.reducers, 'reducers');
      addVariablesToQuickPick(currentContext.variables.locals, 'locals');

      currentContext = currentContext.parentContext as any; // Cast to any to avoid type issues with undefined
      depth++;
    }

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
          // When specific items are selected, generate log only for those.
          // The logGenerator will handle the structure based on the labels.
          const selectedLabels = selectedItems.map((item) => item.label);
          logLine = generateConsoleLog(contextInfo, fileName, selectedLabels);
        } else {
          // If no items are selected, log all variables from the current and parent contexts
          // as per the configuration.
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