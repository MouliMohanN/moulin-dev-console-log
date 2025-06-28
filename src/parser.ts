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

  let innermostFunctionPath: any = null; // Using 'any' for simplicity, will be a NodePath

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
        // If this is the first function found, or if this function is more "inner"
        // than the previously found one, update innermostFunctionPath.
        if (!innermostFunctionPath || (
            node.loc.start.line >= innermostFunctionPath.node.loc!.start.line &&
            node.loc.end.line <= innermostFunctionPath.node.loc!.end.line &&
            (node.loc.end.line - node.loc.start.line < innermostFunctionPath.node.loc!.end.line - innermostFunctionPath.node.loc!.start.line ||
             (node.loc.end.line - node.loc.start.line === innermostFunctionPath.node.loc!.end.line - innermostFunctionPath.node.loc!.start.line &&
              node.loc.start.column >= innermostFunctionPath.node.loc!.start.column &&
              node.loc.end.column <= innermostFunctionPath.node.loc!.end.column))
        )) {
          innermostFunctionPath = path;
        }
      }
    },
  });

  if (innermostFunctionPath) {
    const node = innermostFunctionPath.node;
    const path = innermostFunctionPath; // Use the path of the innermost function

    const name =
      (node as any).id?.name ||
      ((node as any).key?.name as string) ||
      (path.parent.type === 'VariableDeclarator' && (path.parent as any).id?.name) ||
      'anonymous';

    // JSX detection
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

    const currentContext: CodeContext = {
      type: isComponent ? 'react' : 'function',
      name,
      args,
      insertPos,
      variables: {
        ...variables,
      },
    };

    // Now, traverse only within the innermost function's scope for VariableDeclarator
    innermostFunctionPath.traverse({
      VariableDeclarator(inner: NodePath<t.VariableDeclarator>) {
        const id = inner.node.id;
        const init = inner.node.init;

        if (!t.isIdentifier(id) && !t.isArrayPattern(id) && !t.isObjectPattern(id)) { return; }

        const names = extractVariableNames(id);

        if (t.isCallExpression(init)) {
          const callee = (init.callee as any).name || (init.callee as any).property?.name;

          switch (callee) {
            case 'useState':
              if (t.isArrayPattern(id) && id.elements[0] && t.isIdentifier(id.elements[0])) {
                currentContext.variables.state.push(id.elements[0].name);
              }
              break;
            case 'useRef':
              names.forEach((n) => currentContext.variables.refs.push(n));
              break;
            case 'useContext':
              names.forEach((n) => currentContext.variables.context.push(n));
              break;
            case 'useReducer':
              if (names.length >= 2) {
                currentContext.variables.reducers.push(`${names[0]}: ${names[0]}, ${names[1]}: ${names[1]}`);
              }
              break;
            case 'useCallback':
              // Do nothing, as these return functions and should not be logged as locals
              break;
            default:
              names.forEach((n) => currentContext.variables.locals.push(n));
          }
        } else if (!t.isArrowFunctionExpression(init) && !t.isFunctionExpression(init)) {
          names.forEach((n) => currentContext.variables.locals.push(n));
        }
      },
    });
    return currentContext;
  }

  return null;
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