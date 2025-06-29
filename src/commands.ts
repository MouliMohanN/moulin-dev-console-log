import * as vscode from 'vscode';
import { getConfiguration } from './config';
import { generateConsoleLog } from './logGenerator';
import { logger } from './logger';
import { parseCodeContextAtCursor, parseFileForFunctions } from './parser';
import { showVariableQuickPick } from './quickPick';

// Move private helpers to privateUtils
const privateUtils = {
  getWorkspaceFolder(uri: vscode.Uri): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.getWorkspaceFolder(uri);
  },

  getRelativePath(uri: vscode.Uri): string {
    return vscode.workspace.asRelativePath(uri);
  },

  readIgnorePatterns: async function (workspaceFolder: vscode.WorkspaceFolder, ignoreFile: string): Promise<string[]> {
    const ignoreFilePath = vscode.Uri.joinPath(workspaceFolder.uri, ignoreFile);
    try {
      const content = await vscode.workspace.fs.readFile(ignoreFilePath);
      return Buffer.from(content)
        .toString('utf8')
        .split(/\n/)
        .filter((line) => line.trim() !== '' && !line.startsWith('#'));
    } catch {
      return [];
    }
  },

  matchesIgnorePattern: function (relativePath: string, pattern: string): boolean {
    return relativePath.startsWith(pattern) || relativePath === pattern;
  },

  isFileIgnored: async function (uri: vscode.Uri): Promise<boolean> {
    const workspaceFolder = privateUtils.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return false;
    }
    const relativePath = privateUtils.getRelativePath(uri);

    const config = getConfiguration();
    const ignorePatterns = config.ignore;

    for (const pattern of ignorePatterns) {
      if (privateUtils.matchesIgnorePattern(relativePath, pattern)) {
        return true;
      }
    }

    const ignoreFiles = ['.eslintignore', '.prettierignore'];
    for (const ignoreFile of ignoreFiles) {
      const filePatterns = await privateUtils.readIgnorePatterns(workspaceFolder, ignoreFile);
      for (const pattern of filePatterns) {
        if (privateUtils.matchesIgnorePattern(relativePath, pattern)) {
          return true;
        }
      }
    }
    return false;
  },

  hasImportStatement: function (fileContent: string, importStatement: string): boolean {
    return fileContent.includes(importStatement.trim());
  },

  addCustomLoggerImport: async function (
    doc: vscode.TextDocument,
    edits: { insertPos: vscode.Position; logLine: string }[],
    customLoggerImportStatement: string,
  ): Promise<{ insertPos: vscode.Position; logLine: string }[]> {
    if (!customLoggerImportStatement) {
      return edits;
    }
    const fileContent = doc.getText();
    if (privateUtils.hasImportStatement(fileContent, customLoggerImportStatement)) {
      return edits;
    }
    const importEdit = { insertPos: new vscode.Position(0, 0), logLine: customLoggerImportStatement + '\n' };
    return [importEdit, ...edits];
  },

  createWorkspaceEdit: function (
    editor: vscode.TextEditor,
    edits: { insertPos: vscode.Position; logLine: string }[],
  ): vscode.WorkspaceEdit {
    const workspaceEdit = new vscode.WorkspaceEdit();
    edits.forEach((edit) => {
      workspaceEdit.insert(editor.document.uri, edit.insertPos, edit.logLine + '\n');
    });
    return workspaceEdit;
  },

  insertEdits: async function (editor: vscode.TextEditor, edits: { insertPos: vscode.Position; logLine: string }[]) {
    await editor.edit((editBuilder) => {
      edits.forEach((edit) => {
        editBuilder.insert(edit.insertPos, edit.logLine + '\n');
      });
    });
  },

  showPreviewAndConfirm: async function (
    editor: vscode.TextEditor,
    edits: { insertPos: vscode.Position; logLine: string }[],
  ): Promise<boolean> {
    const tempDocUri = vscode.Uri.parse('untitled:' + editor.document.fileName + '.preview');
    const tempDoc = await vscode.workspace.openTextDocument(tempDocUri);
    const tempEditor = await vscode.window.showTextDocument(tempDoc, { preview: true });
    await privateUtils.insertEdits(tempEditor, edits);
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
    return confirmation === 'Yes';
  },

  applyEditsWithPreview: async function (
    editor: vscode.TextEditor,
    edits: { insertPos: vscode.Position; logLine: string }[],
    showPreview: boolean,
  ): Promise<void> {
    if (edits.length === 0) {
      return;
    }
    const workspaceEdit = privateUtils.createWorkspaceEdit(editor, edits);
    if (showPreview) {
      const confirmed = await privateUtils.showPreviewAndConfirm(editor, edits);
      if (confirmed) {
        await vscode.workspace.applyEdit(workspaceEdit);
      } else {
        logger.info('Log insertion cancelled.');
      }
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    } else {
      await privateUtils.insertEdits(editor, edits);
    }
  },

  getNearbyLines: function (doc: vscode.TextDocument, insertPos: vscode.Position, range: number = 2): string[] {
    const startLine = Math.max(0, insertPos.line - range);
    const endLine = Math.min(doc.lineCount - 1, insertPos.line + range);
    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(doc.lineAt(i).text.trim());
    }
    return lines;
  },

  isDuplicateLog: function (doc: vscode.TextDocument, insertPos: vscode.Position, logLine: string): boolean {
    const lines = privateUtils.getNearbyLines(doc, insertPos);
    return lines.some((lineText) => lineText === logLine.trim());
  },

  isFileIgnoredOrNotify: async function (doc: vscode.TextDocument): Promise<boolean> {
    const isIgnored = await privateUtils.isFileIgnored(doc.uri);
    if (isIgnored) {
      logger.info('Log insertion skipped: File is ignored by .eslintignore or .prettierignore.');
      return true;
    }
    return false;
  },

  getEditsForSelections: async function (
    editor: vscode.TextEditor,
    code: string,
    fileName: string,
    selectedItems: vscode.QuickPickItem[] | undefined,
  ): Promise<{ insertPos: vscode.Position; logLine: string }[]> {
    const edits: { insertPos: vscode.Position; logLine: string }[] = [];
    for (const selection of editor.selections) {
      const cursor = selection.active;
      try {
        const contextInfo = parseCodeContextAtCursor(code, cursor, editor.document);
        if (!contextInfo) {
          logger.warn('No valid context found for logging.', { doc: editor.document, cursor, code, fileName });
          continue;
        }
        let logLine: string;
        if (selectedItems && selectedItems.length > 0) {
          const selectedLabels = selectedItems.map((item) => item.label);
          logLine = generateConsoleLog(contextInfo, fileName, selectedLabels);
        } else {
          logLine = generateConsoleLog(contextInfo, fileName);
        }
        if (!privateUtils.isDuplicateLog(editor.document, contextInfo.insertPos, logLine)) {
          edits.push({ insertPos: contextInfo.insertPos, logLine });
        } else {
          logger.warn('Skipping duplicate log insertion.', { logLine });
        }
      } catch (err) {
        logger.error('Console log generation failed: ' + (err as Error).message);
      }
    }
    return edits;
  },

  getLinesToDelete: function (doc: vscode.TextDocument, logTag: string): vscode.Range[] {
    const linesToDelete: vscode.Range[] = [];
    for (let i = 0; i < doc.lineCount; i++) {
      const line = doc.lineAt(i);
      if (line.text.includes(logTag)) {
        linesToDelete.push(line.rangeIncludingLineBreak);
      }
    }
    return linesToDelete;
  },

  getEditsForFunctionContexts: function (
    functionContexts: any[],
    fileName: string,
  ): { insertPos: vscode.Position; logLine: string }[] {
    const edits: { insertPos: vscode.Position; logLine: string }[] = [];
    for (const context of functionContexts) {
      try {
        const logLine = generateConsoleLog(context, fileName);
        edits.push({ insertPos: context.insertPos, logLine });
      } catch (err) {
        logger.error(`Console log generation failed for function ${context.name}: ` + (err as Error).message);
      }
    }
    return edits;
  },

  handleInsertLogForFileResult: async function (
    editor: vscode.TextEditor,
    doc: vscode.TextDocument,
    edits: { insertPos: vscode.Position; logLine: string }[],
    config: any,
  ) {
    const finalEdits = await privateUtils.addCustomLoggerImport(doc, edits, config.customLoggerImportStatement);
    if (finalEdits.length > 0) {
      await privateUtils.applyEditsWithPreview(editor, finalEdits, config.showPreview);
      logger.info(`Inserted logs for ${finalEdits.length} functions/components.`);
    } else {
      logger.info('No logs were generated for the functions/components in the file.');
    }
  },
};

// Exported functions only
export async function insertLogCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const doc = editor.document;
  const code = doc.getText();
  const fileName = vscode.workspace.asRelativePath(doc.uri);

  if (await privateUtils.isFileIgnoredOrNotify(doc)) {
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

  const edits = await privateUtils.getEditsForSelections(editor, code, fileName, selectedItems);

  const config = getConfiguration();
  const finalEdits = await privateUtils.addCustomLoggerImport(doc, edits, config.customLoggerImportStatement);
  await privateUtils.applyEditsWithPreview(editor, finalEdits, config.showPreview);
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

  const linesToDelete = privateUtils.getLinesToDelete(doc, logTag);
  if (linesToDelete.length > 0) {
    await editor.edit((editBuilder) => {
      linesToDelete.forEach((range) => {
        editBuilder.delete(range);
      });
    });
    logger.info(`Cleaned ${linesToDelete.length} contextual logs.`);
  } else {
    logger.info('No contextual logs found to clean.');
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

  if (await privateUtils.isFileIgnoredOrNotify(doc)) {
    return;
  }

  const functionContexts = parseFileForFunctions(code, doc);

  if (functionContexts.length === 0) {
    logger.info('No functions or components found in the file to log.');
    return;
  }

  const edits = privateUtils.getEditsForFunctionContexts(functionContexts, fileName);

  const config = getConfiguration();
  await privateUtils.handleInsertLogForFileResult(editor, doc, edits, config);
}
