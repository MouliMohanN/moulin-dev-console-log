import * as vscode from 'vscode';
import { getConfiguration } from './config';
import { generateConsoleLog } from './logGenerator';
import { logger } from './logger';
import { parseCodeContextAtCursor, parseFileForFunctions } from './parser';
import { showVariableQuickPick } from './quickPick';

export async function insertLogCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const doc = editor.document;
  const code = doc.getText();
  const fileName = vscode.workspace.asRelativePath(doc.uri);

  // Check if the file is ignored by .eslintignore or .prettierignore
  const isIgnored = await isFileIgnored(doc.uri);
  if (isIgnored) {
    vscode.window.showInformationMessage('Log insertion skipped: File is ignored by .eslintignore or .prettierignore.');
    return;
  }

  const firstCursor = editor.selections[0].active;
  const firstContextInfo = parseCodeContextAtCursor(code, firstCursor, doc);

  if (!firstContextInfo) {
    logger.warn('No valid context found for logging at the first cursor.', {
      doc,
      cursor: firstCursor,
      code,
      fileName,
    });
    return;
  }

  const selectedItems = await showVariableQuickPick(firstContextInfo);

  const edits: { insertPos: vscode.Position; logLine: string }[] = [];

  for (const selection of editor.selections) {
    const cursor = selection.active;
    try {
      const contextInfo = parseCodeContextAtCursor(code, cursor, doc);

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
      if (!isDuplicateLog(doc, contextInfo.insertPos, logLine)) {
        edits.push({ insertPos: contextInfo.insertPos, logLine });
      } else {
        logger.warn('Skipping duplicate log insertion.', { logLine });
      }
    } catch (err) {
      logger.error('Console log generation failed: ' + (err as Error).message);
    }
  }

  const config = getConfiguration();
  const finalEdits = await addCustomLoggerImport(doc, edits, config.customLoggerImportStatement);
  await applyEditsWithPreview(editor, finalEdits, config.showPreview);
}

async function isFileIgnored(uri: vscode.Uri): Promise<boolean> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  if (!workspaceFolder) {
    return false;
  }

  const workspacePath = workspaceFolder.uri.fsPath;
  const relativePath = vscode.workspace.asRelativePath(uri);

  // Simplified check: read .eslintignore and .prettierignore and check if the file path is included
  const ignoreFiles = ['.eslintignore', '.prettierignore'];
  for (const ignoreFile of ignoreFiles) {
    const ignoreFilePath = vscode.Uri.joinPath(workspaceFolder.uri, ignoreFile);
    try {
      const content = await vscode.workspace.fs.readFile(ignoreFilePath);
      const ignorePatterns = Buffer.from(content).toString('utf8').split(/\n/).filter(line => line.trim() !== '' && !line.startsWith('#'));

      for (const pattern of ignorePatterns) {
        // Very basic glob matching: check if the pattern is a direct match or a directory prefix
        if (relativePath.startsWith(pattern) || relativePath === pattern) {
          return true;
        }
      }
    } catch (error) {
      // Ignore if file not found
    }
  }
  return false;
}

async function addCustomLoggerImport(
  doc: vscode.TextDocument,
  edits: { insertPos: vscode.Position; logLine: string }[],
  customLoggerImportStatement: string,
): Promise<{ insertPos: vscode.Position; logLine: string }[]> {
  if (!customLoggerImportStatement) {
    return edits;
  }

  const fileContent = doc.getText();
  // Simple check to see if the import statement (or a very similar one) already exists
  if (fileContent.includes(customLoggerImportStatement.trim())) {
    return edits;
  }

  // Add the import statement at the top of the file
  const importEdit = { insertPos: new vscode.Position(0, 0), logLine: customLoggerImportStatement + '\n' };
  return [importEdit, ...edits];
}

async function applyEditsWithPreview(
  editor: vscode.TextEditor,
  edits: { insertPos: vscode.Position; logLine: string }[],
  showPreview: boolean,
): Promise<void> {
  if (edits.length === 0) {
    return;
  }

  const workspaceEdit = new vscode.WorkspaceEdit();
  edits.forEach((edit) => {
    workspaceEdit.insert(editor.document.uri, edit.insertPos, edit.logLine + '\n');
  });

  if (showPreview) {
    const originalContent = editor.document.getText();
    const tempDocUri = vscode.Uri.parse('untitled:' + editor.document.fileName + '.preview');
    const tempDoc = await vscode.workspace.openTextDocument(tempDocUri);
    const tempEditor = await vscode.window.showTextDocument(tempDoc, { preview: true });

    await tempEditor.edit((editBuilder) => {
      edits.forEach((edit) => {
        editBuilder.insert(edit.insertPos, edit.logLine + '\n');
      });
    });

    await vscode.commands.executeCommand(
      'vscode.diff',
      editor.document.uri,
      tempDocUri,
      `Preview: ${editor.document.fileName}`,
    );

    const confirmation = await vscode.window.showInformationMessage(
      'Apply these changes?',
      { modal: true },
      'Yes',
      'No',
    );

    if (confirmation === 'Yes') {
      await vscode.workspace.applyEdit(workspaceEdit);
    } else {
      vscode.window.showInformationMessage('Log insertion cancelled.');
    }
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  } else {
    await editor.edit((editBuilder) => {
      edits.forEach((edit) => {
        editBuilder.insert(edit.insertPos, edit.logLine + '\n');
      });
    });
  }
}

function isDuplicateLog(doc: vscode.TextDocument, insertPos: vscode.Position, logLine: string): boolean {
  const startLine = Math.max(0, insertPos.line - 2);
  const endLine = Math.min(doc.lineCount - 1, insertPos.line + 2);

  for (let i = startLine; i <= endLine; i++) {
    const lineText = doc.lineAt(i).text.trim();
    if (lineText === logLine.trim()) {
      return true;
    }
  }
  return false;
}

export async function wrapInConsoleLogCommand(): Promise<void> {
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
}

export async function cleanLogsCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const doc = editor.document;
  const config = getConfiguration();
  const logTag = config.logTag;

  const linesToDelete: vscode.Range[] = [];
  for (let i = 0; i < doc.lineCount; i++) {
    const line = doc.lineAt(i);
    if (line.text.includes(logTag)) {
      linesToDelete.push(line.rangeIncludingLineBreak);
    }
  }

  if (linesToDelete.length > 0) {
    await editor.edit((editBuilder) => {
      linesToDelete.forEach((range) => {
        editBuilder.delete(range);
      });
    });
    vscode.window.showInformationMessage(`Cleaned ${linesToDelete.length} contextual logs.`);
  } else {
    vscode.window.showInformationMessage('No contextual logs found to clean.');
  }
}

export async function insertLogForFileCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const doc = editor.document;
  const code = doc.getText();
  const fileName = vscode.workspace.asRelativePath(doc.uri);

  // Check if the file is ignored by .eslintignore or .prettierignore
  const isIgnored = await isFileIgnored(doc.uri);
  if (isIgnored) {
    vscode.window.showInformationMessage('Log insertion skipped: File is ignored by .eslintignore or .prettierignore.');
    return;
  }

  const functionContexts = parseFileForFunctions(code, doc);

  if (functionContexts.length === 0) {
    vscode.window.showInformationMessage('No functions or components found in the file to log.');
    return;
  }

  const edits: { insertPos: vscode.Position; logLine: string }[] = [];

  for (const context of functionContexts) {
    try {
      const logLine = generateConsoleLog(context, fileName);
      edits.push({ insertPos: context.insertPos, logLine });
    } catch (err) {
      logger.error(`Console log generation failed for function ${context.name}: ` + (err as Error).message);
    }
  }

  const config = getConfiguration();
  const finalEdits = await addCustomLoggerImport(doc, edits, config.customLoggerImportStatement);

  if (finalEdits.length > 0) {
    await applyEditsWithPreview(editor, finalEdits, config.showPreview);
    vscode.window.showInformationMessage(`Inserted logs for ${finalEdits.length} functions/components.`);
  } else {
    vscode.window.showInformationMessage('No logs were generated for the functions/components in the file.');
  }
}