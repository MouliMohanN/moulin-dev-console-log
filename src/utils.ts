import * as t from '@babel/types';
import * as vscode from 'vscode';

export function positionIn(loc: t.SourceLocation, pos: vscode.Position, doc: vscode.TextDocument): boolean {
  const start = new vscode.Position(loc.start.line - 1, loc.start.column);
  const end = new vscode.Position(loc.end.line - 1, loc.end.column);
  return pos.isAfterOrEqual(start) && pos.isBeforeOrEqual(end);
}

export function findReturnInsertPosition(node: t.Function, doc: vscode.TextDocument): vscode.Position {
  const body = (node.body as any).body || [];
  for (let stmt of body) {
    if (stmt.type === 'ReturnStatement' && stmt.loc) {
      return new vscode.Position(stmt.loc.start.line - 1, stmt.loc.start.column);
    }
  }

  const last = body.at(-1);
  if (last?.loc) {
    return new vscode.Position(last.loc.end.line, 0);
  }

  const loc = node.loc?.end;
  return loc ? new vscode.Position(loc.line - 1, loc.column) : new vscode.Position(0, 0);
}

export function extractVariableNames(id: any): string[] {
  if (!id) {
    return [];
  }
  if (id.name) {
    return [id.name];
  }
  if (Array.isArray(id.elements)) {
    const names: string[] = [];
    id.elements.forEach((el: any) => {
      names.push(...extractVariableNames(el));
    });
    return names;
  }
  if (id.type === 'ObjectPattern' && Array.isArray(id.properties)) {
    const names: string[] = [];
    id.properties.forEach((prop: any) => {
      if (prop.type === 'ObjectProperty' && prop.value) {
        names.push(...extractVariableNames(prop.value));
      }
    });
    return names;
  }
  return [];
}
