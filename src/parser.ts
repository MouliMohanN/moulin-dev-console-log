import { parse } from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import * as vscode from 'vscode';
import { logger } from './logger';
import { CodeContext } from './types';
import { findReturnInsertPosition, positionIn } from './utils';

type VariableBuckets = {
  props: string[];
  state: string[];
  refs: string[];
  context: string[];
  reducers: string[];
  locals: string[];
};

export function parseCodeContext(code: string, cursor: vscode.Position, doc: vscode.TextDocument): CodeContext | null {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const functionPaths: NodePath<t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression | t.ClassMethod>[] = [];

  traverse(ast, {
    enter(path) {
      const node = path.node;

      if (!node.loc) { return; }

      if (
        positionIn(node.loc, cursor, doc) &&
        (t.isFunctionDeclaration(node) ||
          t.isArrowFunctionExpression(node) ||
          t.isFunctionExpression(node) ||
          t.isClassMethod(node))
      ) {
        functionPaths.push(path as NodePath<t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression | t.ClassMethod>);
      }
    },
  });

  if (functionPaths.length === 0) {
    return null;
  }

  // Sort paths by their start position to ensure correct nesting order
  functionPaths.sort((a, b) => {
    if (!a.node.loc || !b.node.loc) { return 0; }
    return a.node.loc.start.line - b.node.loc.start.line || a.node.loc.start.column - b.node.loc.start.column;
  });

  let currentContext: CodeContext | null = null;
  let previousContext: CodeContext | null = null;

  for (const path of functionPaths) {
    const node = path.node;

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

    const insertPos = findReturnInsertPosition(node, doc);

    const newContext: CodeContext = {
      type: isComponent ? 'react' : 'function',
      name,
      args,
      insertPos,
      variables: {
        ...variables,
      },
      parentContext: previousContext || undefined, // Link to the previous context
    };

    // Collect local variables directly from the function body
    if (t.isBlockStatement(node.body)) {
      node.body.body.forEach((bodyNode) => {
        if (t.isVariableDeclaration(bodyNode)) {
          bodyNode.declarations.forEach((declaration) => {
            const id = declaration.id;
            const init = declaration.init;

            if (!t.isIdentifier(id) && !t.isArrayPattern(id) && !t.isObjectPattern(id)) { return; }

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
                case 'useCallback':
                  // Do nothing, as these return functions and should not be logged as locals
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

    currentContext = newContext;
    previousContext = newContext;
  }

  return currentContext;
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