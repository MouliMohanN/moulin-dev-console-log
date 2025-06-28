import * as vscode from 'vscode';
import { ContextService } from './contextService';
import { LogGeneratorService } from './logGenerator';
import { logger } from './logger';
import { QuickPickService } from './quickPickService';
export class LogInsertionService {
  private contextService: ContextService;
  private logGeneratorService: LogGeneratorService;
  private quickPickService: QuickPickService;
  constructor(
    contextService: ContextService,
    logGeneratorService: LogGeneratorService,
    quickPickService: QuickPickService,
  ) {
    this.contextService = contextService;
    this.logGeneratorService = logGeneratorService;
    this.quickPickService = quickPickService;
  }
  public async insertLog(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const doc = editor.document;
    const code = doc.getText();
    const fileName = vscode.workspace.asRelativePath(doc.uri);
    const firstCursor = editor.selections[0].active;
    const firstContextInfo = this.contextService.parseCodeContext(code, firstCursor, doc);
    if (!firstContextInfo) {
      logger.warn('No valid context found for logging at the first cursor.', {
        doc,
        cursor: firstCursor,
        code,
        fileName,
      });
      return;
    }
    const selectedItems = await this.quickPickService.showVariableQuickPick(firstContextInfo);
    const edits: { insertPos: vscode.Position; logLine: string }[] = [];
    for (const selection of editor.selections) {
      const cursor = selection.active;
      try {
        const contextInfo = this.contextService.parseCodeContext(code, cursor, doc);
        if (!contextInfo) {
          logger.warn('No valid context found for logging.', { doc, cursor, code, fileName });
          continue;
        }
        let logLine: string;
        if (selectedItems && selectedItems.length > 0) {
          const selectedLabels = selectedItems.map((item) => item.label);
          logLine = this.logGeneratorService.generateConsoleLog(contextInfo, fileName, selectedLabels);
        } else {
          logLine = this.logGeneratorService.generateConsoleLog(contextInfo, fileName);
        }
        edits.push({ insertPos: contextInfo.insertPos, logLine });
      } catch (err) {
        logger.error('Console log generation failed: ' + (err as Error).message);
      }
    }
    await editor.edit((editBuilder) => {
      edits.forEach((edit) => {
        editBuilder.insert(edit.insertPos, edit.logLine + '\n');
      });
    });
  }
  public async wrapInConsoleLog(): Promise<void> {
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
}
