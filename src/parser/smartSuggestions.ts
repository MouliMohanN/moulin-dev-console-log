import * as t from '@babel/types';
import traverse from '@babel/traverse';
import * as vscode from 'vscode';

export function getSmartSuggestionsAtCursor(ast: t.File, cursor: vscode.Position, doc: vscode.TextDocument): string[] {
  const suggestions: string[] = [];
  traverse(ast, {
    enter(path) {
      const node = path.node;
      if (!node.loc) {
        return;
      }

      // Check if the node is on the same line as the cursor
      if (node.loc.start.line - 1 === cursor.line) {
        // Variable Declaration (e.g., const x = 10;)
        if (t.isVariableDeclarator(node) && t.isIdentifier(node.id)) {
          suggestions.push(node.id.name);
        }
        // Assignment Expression (e.g., x = 10;)
        else if (t.isAssignmentExpression(node) && t.isIdentifier(node.left)) {
          suggestions.push(node.left.name);
        }
        // Return Statement (e.g., return x;)
        else if (t.isReturnStatement(node) && node.argument && t.isIdentifier(node.argument)) {
          suggestions.push(node.argument.name);
        }
        // Call Expression (e.g., someFunction(arg1, arg2);)
        else if (t.isCallExpression(node)) {
          node.arguments.forEach((arg) => {
            if (t.isIdentifier(arg)) {
              suggestions.push(arg.name);
            }
          });
        }
      }
    },
  });
  return [...new Set(suggestions)]; // Return unique suggestions
}
