import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as vscode from 'vscode';

import { getConfiguration } from './config';
import { CodeContext, VariableBuckets } from './types';
import { findReturnInsertPosition, positionIn } from './utils';

import { isFunctionNode, getFunctionName, detectComponent } from './parser/nodeUtils';
import { createEmptyVariableBuckets, extractArgs, collectClassMethodVars, collectVariableDeclaration } from './parser/contextCollectors';
import { filterUnusedVariables, filterSensitiveKeys } from './parser/filterUtils';
import { extractVariableNames } from './parser/variableUtils';
import { getSmartSuggestionsAtCursor } from './parser/smartSuggestions';
import { linkParentContexts } from './parser/contextLinker';

const privateUtils = {
  parseAndExtractContext(
    code: string,
    doc: vscode.TextDocument,
    cursor?: vscode.Position,
  ): CodeContext | CodeContext[] | null {
    const config = getConfiguration();
    const { enableClassMethodLogging, enableHookLogging, enableReduxContextLogging, enableContextLogging } = config;
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
    const allFunctionContexts: CodeContext[] = [];
    let cursorFunctionContext: CodeContext | null = null;
    const functionContextStack: CodeContext[] = [];
    traverse(ast, {
      enter(path) {
        const node = path.node;
        if (!node.loc) {
          return;
        }
        if (isFunctionNode(node)) {
          const name = getFunctionName(node, path);
          let isComponent = detectComponent(path);
          const variables: VariableBuckets = createEmptyVariableBuckets();
          let args: string[] = extractArgs(node);
          if (isComponent) {
            variables.props = args;
          }
          const newContext: CodeContext = {
            type: isComponent ? 'react' : 'function',
            name,
            args,
            insertPos: new vscode.Position(0, 0),
            variables: variables,
            parentContext:
              functionContextStack.length > 0 ? functionContextStack[functionContextStack.length - 1] : undefined,
          };
          if (enableClassMethodLogging && t.isClassMethod(node)) {
            collectClassMethodVars(node, newContext, path);
          }
          if (t.isBlockStatement((node as any).body)) {
            ((node as any).body.body as t.Statement[]).forEach((bodyNode: t.Statement) => {
              if (t.isVariableDeclaration(bodyNode)) {
                bodyNode.declarations.forEach((declaration) => {
                  collectVariableDeclaration(
                    declaration.id,
                    declaration.init,
                    newContext,
                    doc,
                    config,
                    enableHookLogging,
                    enableReduxContextLogging,
                    enableContextLogging,
                  );
                });
              }
            });
          }
          newContext.insertPos = newContext.hookBodyEndPos || findReturnInsertPosition(node as any, doc);
          if (config.filterUnusedVariables) {
            filterUnusedVariables(newContext.variables, path.scope);
          }
          filterSensitiveKeys(newContext.variables, config.sensitiveKeys);
          if (cursor && positionIn(node.loc, cursor, doc)) {
            newContext.smartSuggestions = getSmartSuggestionsAtCursor(ast, cursor, doc);
            cursorFunctionContext = newContext;
          }
          allFunctionContexts.push(newContext);
          functionContextStack.push(newContext);
        }
      },
      exit(path) {
        if (isFunctionNode(path.node)) {
          functionContextStack.pop();
        }
      },
    });
    linkParentContexts(allFunctionContexts);
    if (cursor) {
      return cursorFunctionContext;
    } else if (allFunctionContexts.length > 0) {
      return allFunctionContexts;
    }
    return null;
  },
};

export function parseCodeContextAtCursor(
  code: string,
  cursor: vscode.Position,
  doc: vscode.TextDocument,
): CodeContext | null {
  const result = privateUtils.parseAndExtractContext(code, doc, cursor);
  if (Array.isArray(result) || result === null) {
    return null;
  }
  return result;
}

export function parseFileForFunctions(code: string, doc: vscode.TextDocument): CodeContext[] {
  const result = privateUtils.parseAndExtractContext(code, doc);
  if (result === null || !Array.isArray(result)) {
    return [];
  }
  return result;
}
