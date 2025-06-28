import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as vscode from 'vscode';

import { CodeContext } from './types';
import { findReturnInsertPosition, positionIn } from './utils';
import { getConfiguration } from './config';

type VariableBuckets = {
  props: string[];
  state: string[];
  refs: string[];
  context: string[];
  reducers: string[];
  locals: string[];
  reduxContext: string[];
};

export function parseCodeContextAtCursor(code: string, cursor: vscode.Position, doc: vscode.TextDocument): CodeContext | null {
  const result = parseAndExtractContext(code, doc, cursor);
  if (Array.isArray(result) || result === null) {
    return null;
  }
  return result;
}

export function parseFileForFunctions(code: string, doc: vscode.TextDocument): CodeContext[] {
  const result = parseAndExtractContext(code, doc);
  if (result === null || !Array.isArray(result)) {
    return [];
  }
  return result;
}

function parseAndExtractContext(code: string, doc: vscode.TextDocument, cursor?: vscode.Position): CodeContext | CodeContext[] | null {
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

      const isFunctionNode = t.isFunctionDeclaration(node) ||
                           t.isArrowFunctionExpression(node) ||
                           t.isFunctionExpression(node) ||
                           t.isClassMethod(node);

      if (isFunctionNode) {
        const name =
          (node as any).id?.name ||
          ((node as any).key?.name as string) ||
          (path.parent.type === 'VariableDeclarator' && (path.parent as any).id?.name) ||
          'anonymous';

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

        const variables: VariableBuckets = {
          props: [],
          state: [],
          refs: [],
          context: [],
          reducers: [],
          locals: [],
          reduxContext: [],
        };

        let args: string[] = [];
        if (node.params) {
          node.params.forEach((param: t.LVal) => {
            if (t.isObjectPattern(param) || t.isIdentifier(param) || t.isArrayPattern(param)) {
              args.push(...extractVariableNames(param));
            }
          });
        }

        if (isComponent) {
          variables.props = args;
        }

        const newContext: CodeContext = {
          type: isComponent ? 'react' : 'function',
          name,
          args,
          insertPos: new vscode.Position(0, 0), // Temporary, will be set below
          variables: {
            ...variables,
          },
          parentContext: functionContextStack.length > 0 ? functionContextStack[functionContextStack.length - 1] : undefined,
        };

        // Class Method Logging
        if (enableClassMethodLogging && t.isClassMethod(node)) {
          traverse(node, {
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
          }, path.scope, path.state, path.parentPath || undefined);
        }

        // Collect local variables directly from the function body
        if (t.isBlockStatement(node.body)) {
          node.body.body.forEach((bodyNode) => {
            if (t.isVariableDeclaration(bodyNode)) {
              bodyNode.declarations.forEach((declaration) => {
                const id = declaration.id;
                const init = declaration.init;

                if (!t.isIdentifier(id) && !t.isArrayPattern(id) && !t.isObjectPattern(id)) {
                  return;
                }

                const names = extractVariableNames(id);

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
                          newContext.variables.reduxContext.push(doc.getText(new vscode.Range(new vscode.Position(arg.loc.start.line - 1, arg.loc.start.column), new vscode.Position(arg.loc.end.line - 1, arg.loc.end.column))));
                        } else if (t.isCallExpression(arg) && t.isIdentifier(arg.callee) && arg.loc) {
                          newContext.variables.reduxContext.push(doc.getText(new vscode.Range(new vscode.Position(arg.loc.start.line - 1, arg.loc.start.column), new vscode.Position(arg.loc.end.line - 1, arg.loc.end.column))));
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
                            newContext.hookBodyEndPos = new vscode.Position(callbackArg.body.loc.end.line - 1, callbackArg.body.loc.end.column);
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
              });
            }
          });
        }

        // Determine the final insert position
        newContext.insertPos = newContext.hookBodyEndPos || findReturnInsertPosition(node, doc);

        // Filter out unused variables
        filterUnusedVariables(newContext.variables, path.scope);

        // Filter out sensitive keys
        filterSensitiveKeys(newContext.variables, config.sensitiveKeys);

        if (cursor && positionIn(node.loc, cursor, doc)) {
          cursorFunctionContext = newContext;
        }
        allFunctionContexts.push(newContext);
        functionContextStack.push(newContext);
      }
    },
    exit(path) {
      const node = path.node;
      const isFunctionNode = t.isFunctionDeclaration(node) ||
                           t.isArrowFunctionExpression(node) ||
                           t.isFunctionExpression(node) ||
                           t.isClassMethod(node);
      if (isFunctionNode) {
        functionContextStack.pop();
      }
    },
  });

  // Link parent contexts
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

  if (cursor) {
    return cursorFunctionContext;
  } else if (allFunctionContexts.length > 0) {
    return allFunctionContexts;
  } else {
    return null;
  }
}

function filterUnusedVariables(variables: VariableBuckets, scope: any) {
  for (const key in variables) {
    const category = key as keyof VariableBuckets;
    variables[category] = variables[category].filter((name: string) => {
      const binding = scope.getBinding(name);
      // A binding exists and has references, or it's a global/implicit variable (no binding)
      return !binding || binding.referenced;
    });
  }
}

function filterSensitiveKeys(variables: VariableBuckets, sensitiveKeys: string[]) {
  for (const key in variables) {
    const category = key as keyof VariableBuckets;
    variables[category] = variables[category].filter(name => !sensitiveKeys.includes(name));
  }
}

function extractVariableNames(id: t.Identifier | t.ArrayPattern | t.ObjectPattern): string[] {
  const names: string[] = [];

  if (t.isIdentifier(id)) {
    names.push(id.name);
  } else if (t.isArrayPattern(id)) {
    id.elements.forEach((el) => {
      if (t.isIdentifier(el)) {
        names.push(el.name);
      }
    });
  } else if (t.isObjectPattern(id)) {
    id.properties.forEach((prop) => {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.value)) {
        names.push(prop.value.name);
      }
    });
  }

  return names;
}