import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import * as vscode from 'vscode';

import { getConfiguration } from './config';
import { CodeContext } from './types';
import { findReturnInsertPosition, positionIn } from './utils';

type VariableBuckets = {
  props: string[];
  state: string[];
  refs: string[];
  context: string[];
  reducers: string[];
  locals: string[];
  reduxContext: string[];
};

const privateUtils = {
  parseAndExtractContext(
    code: string,
    doc: vscode.TextDocument,
    cursor?: vscode.Position,
  ): CodeContext | CodeContext[] | null {
    const config = getConfiguration();
    const { enableClassMethodLogging, enableHookLogging, enableReduxContextLogging } = config;
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
        if (privateUtils.isFunctionNode(node)) {
          const name = privateUtils.getFunctionName(node, path);
          let isComponent = privateUtils.detectComponent(path);
          const variables: VariableBuckets = privateUtils.createEmptyVariableBuckets();
          let args: string[] = privateUtils.extractArgs(node);
          if (isComponent) {
            variables.props = args;
          }
          const newContext: CodeContext = {
            type: isComponent ? 'react' : 'function',
            name,
            args,
            insertPos: new vscode.Position(0, 0),
            variables: { ...variables },
            parentContext:
              functionContextStack.length > 0 ? functionContextStack[functionContextStack.length - 1] : undefined,
          };
          if (enableClassMethodLogging && t.isClassMethod(node)) {
            privateUtils.collectClassMethodVars(node, newContext);
          }
          if (t.isBlockStatement((node as any).body)) {
            ((node as any).body.body as t.Statement[]).forEach((bodyNode: t.Statement) => {
              if (t.isVariableDeclaration(bodyNode)) {
                bodyNode.declarations.forEach((declaration) => {
                  privateUtils.collectVariableDeclaration(
                    declaration,
                    newContext,
                    doc,
                    config,
                    enableHookLogging,
                    enableReduxContextLogging,
                  );
                });
              }
            });
          }
          newContext.insertPos = newContext.hookBodyEndPos || findReturnInsertPosition(node as any, doc);
          privateUtils.filterUnusedVariables(newContext.variables, path.scope);
          privateUtils.filterSensitiveKeys(newContext.variables, config.sensitiveKeys);
          if (cursor && positionIn(node.loc, cursor, doc)) {
            cursorFunctionContext = newContext;
          }
          allFunctionContexts.push(newContext);
          functionContextStack.push(newContext);
        }
      },
      exit(path) {
        if (privateUtils.isFunctionNode(path.node)) {
          functionContextStack.pop();
        }
      },
    });
    privateUtils.linkParentContexts(allFunctionContexts);
    if (cursor) {
      return cursorFunctionContext;
    } else if (allFunctionContexts.length > 0) {
      return allFunctionContexts;
    } else {
      return null;
    }
  },

  isFunctionNode(node: t.Node): boolean {
    return (
      t.isFunctionDeclaration(node) ||
      t.isArrowFunctionExpression(node) ||
      t.isFunctionExpression(node) ||
      t.isClassMethod(node)
    );
  },

  getFunctionName(node: any, path: any): string {
    return (
      node.id?.name ||
      node.key?.name ||
      (path.parent.type === 'VariableDeclarator' && path.parent.id?.name) ||
      'anonymous'
    );
  },

  detectComponent(path: any): boolean {
    let isComponent = false;
    path.traverse({
      JSXElement() {
        isComponent = true;
        path.stop();
      },
      JSXFragment() {
        isComponent = true;
        path.stop();
      },
    });
    return isComponent;
  },

  createEmptyVariableBuckets(): VariableBuckets {
    return { props: [], state: [], refs: [], context: [], reducers: [], locals: [], reduxContext: [] };
  },

  extractArgs(node: any): string[] {
    const args: string[] = [];
    if (node.params) {
      node.params.forEach((param: t.LVal) => {
        if (t.isObjectPattern(param) || t.isIdentifier(param) || t.isArrayPattern(param)) {
          args.push(...privateUtils.extractVariableNames(param));
        }
      });
    }
    return args;
  },

  collectClassMethodVars(node: any, newContext: CodeContext) {
    traverse(
      node,
      {
        MemberExpression(memberPath) {
          if (t.isThisExpression(memberPath.node.object) && t.isIdentifier(memberPath.node.property)) {
            if (memberPath.node.property.name === 'props') {
              if (!newContext.variables.props.includes('this.props')) {
                newContext.variables.props.push('this.props');
              }
            } else if (memberPath.node.property.name === 'state') {
              if (!newContext.variables.state.includes('this.state')) {
                newContext.variables.state.push('this.state');
              }
            }
          }
        },
      },
      undefined,
      undefined,
      undefined,
    );
  },

  collectVariableDeclaration(
    declaration: any,
    newContext: CodeContext,
    doc: vscode.TextDocument,
    config: any,
    enableHookLogging: boolean,
    enableReduxContextLogging: boolean,
  ) {
    const id = declaration.id;
    const init = declaration.init;
    if (!t.isIdentifier(id) && !t.isArrayPattern(id) && !t.isObjectPattern(id)) {
      return;
    }
    const names = privateUtils.extractVariableNames(id);
    if (t.isCallExpression(init)) {
      const callee = (init.callee as any).name || (init.callee as any).property?.name;
      switch (callee) {
        case 'useState':
          if (t.isArrayPattern(id) && id.elements[0] && t.isIdentifier(id.elements[0])) {
            newContext.variables.state.push(id.elements[0].name);
          }
          break;
        case 'useRef':
          names.forEach((n) => newContext.variables.refs.push(n));
          break;
        case 'useContext':
          names.forEach((n) => newContext.variables.context.push(n));
          break;
        case 'useReducer':
          if (names.length >= 2) {
            newContext.variables.reducers.push(`${names[0]}: ${names[0]}, ${names[1]}: ${names[1]}`);
          }
          break;
        case 'useSelector':
        case 'useContext':
          if (config.enableReduxContextLogging && init.arguments.length > 0) {
            const arg = init.arguments[0];
            if (t.isIdentifier(arg)) {
              newContext.variables.reduxContext.push(arg.name);
            } else if (t.isMemberExpression(arg) && t.isIdentifier(arg.property) && arg.loc) {
              newContext.variables.reduxContext.push(
                doc.getText(
                  new vscode.Range(
                    new vscode.Position(arg.loc.start.line - 1, arg.loc.start.column),
                    new vscode.Position(arg.loc.end.line - 1, arg.loc.end.column),
                  ),
                ),
              );
            } else if (t.isCallExpression(arg) && t.isIdentifier(arg.callee) && arg.loc) {
              newContext.variables.reduxContext.push(
                doc.getText(
                  new vscode.Range(
                    new vscode.Position(arg.loc.start.line - 1, arg.loc.start.column),
                    new vscode.Position(arg.loc.end.line - 1, arg.loc.end.column),
                  ),
                ),
              );
            }
          }
          break;
        case 'useCallback':
          break;
        case 'useEffect':
        case 'useMemo':
        case 'useCallback':
          if (enableHookLogging && init.arguments.length > 0) {
            const callbackArg = init.arguments[0];
            if (t.isArrowFunctionExpression(callbackArg) || t.isFunctionExpression(callbackArg)) {
              if (callbackArg.body.loc) {
                newContext.hookBodyEndPos = new vscode.Position(
                  callbackArg.body.loc.end.line - 1,
                  callbackArg.body.loc.end.column,
                );
              }
            }
            if (init.arguments.length > 1 && t.isArrayExpression(init.arguments[1])) {
              init.arguments[1].elements.forEach((element) => {
                if (t.isIdentifier(element)) {
                  newContext.variables.locals.push(element.name);
                }
              });
            }
          }
          break;
        default:
          names.forEach((n) => newContext.variables.locals.push(n));
      }
    } else if (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init)) {
      names.forEach((n) => newContext.variables.locals.push(n));
    }
  },

  linkParentContexts(allFunctionContexts: CodeContext[]) {
    allFunctionContexts.forEach((ctx, index) => {
      if (index > 0) {
        for (let i = index - 1; i >= 0; i--) {
          const parentCtx = allFunctionContexts[i];
          if (parentCtx.insertPos.line < ctx.insertPos.line) {
            ctx.parentContext = parentCtx;
            break;
          }
        }
      }
    });
  },

  filterUnusedVariables(variables: VariableBuckets, scope: any) {
    privateUtils.filterVariables(variables, (name: string) => {
      const binding = scope.getBinding(name);
      return !binding || binding.referenced;
    });
  },

  filterSensitiveKeys(variables: VariableBuckets, sensitiveKeys: string[]) {
    privateUtils.filterVariables(variables, (name: string) => !sensitiveKeys.includes(name));
  },

  filterVariables(variables: VariableBuckets, predicate: (name: string) => boolean) {
    for (const key in variables) {
      const category = key as keyof VariableBuckets;
      variables[category] = variables[category].filter(predicate);
    }
  },

  extractVariableNames(id: t.Identifier | t.ArrayPattern | t.ObjectPattern): string[] {
    if (t.isIdentifier(id)) {
      return privateUtils.extractFromIdentifier(id);
    } else if (t.isArrayPattern(id)) {
      return privateUtils.extractFromArrayPattern(id);
    } else if (t.isObjectPattern(id)) {
      return privateUtils.extractFromObjectPattern(id);
    }
    return [];
  },

  extractFromIdentifier(id: t.Identifier): string[] {
    return [id.name];
  },

  extractFromArrayPattern(id: t.ArrayPattern): string[] {
    const names: string[] = [];
    id.elements.forEach((el) => {
      if (t.isIdentifier(el)) {
        names.push(el.name);
      }
    });
    return names;
  },

  extractFromObjectPattern(id: t.ObjectPattern): string[] {
    const names: string[] = [];
    id.properties.forEach((prop) => {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.value)) {
        names.push(prop.value.name);
      }
    });
    return names;
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
