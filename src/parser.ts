import { parse } from '@babel/parser';
import traverse, { NodePath, TraverseOptions } from '@babel/traverse';
import * as t from '@babel/types';
import * as vscode from 'vscode';
import { positionIn, findReturnInsertPosition, extractVariableNames } from './utils';
import { CodeContext } from './types';

export function parseCodeContext(code: string, cursor: vscode.Position, doc: vscode.TextDocument): CodeContext | null {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });

  let context: CodeContext | null = null;

  traverse(ast, {
    enter(path: NodePath) {
      const node = path.node;
      if (!node.loc || context) {return;}

      if (positionIn(node.loc, cursor, doc)) {
        if (
          t.isFunctionDeclaration(node) ||
          t.isArrowFunctionExpression(node) ||
          t.isFunctionExpression(node)
        ) {
          const name = (node as any).id?.name ||
            (path.parent.type === 'VariableDeclarator' && (path.parent as any).id?.name) ||
            'anonymous';

          const isComponent = containsJSX(path);
          const args = (node as any).params?.map((p: any) => p.name || doc.getText(p)) || [];

          const variables = {
            props: [] as string[],
            state: [] as string[],
            refs: [] as string[],
            context: [] as string[],
            reducers: [] as string[],
            locals: [] as string[]
          };

          const insertPos = findReturnInsertPosition(node, doc);

          path.traverse({
            VariableDeclarator(innerPath) {
              const id = innerPath.node.id as any;
              const init = innerPath.node.init;
              const names = extractVariableNames(id);

              if (t.isCallExpression(init) && t.isIdentifier(init.callee)) {
                const callee = init.callee.name;

                switch (callee) {
                  case 'useState':
                    names[0] && variables.state.push(names[0]);
                    break;
                  case 'useRef':
                    names.forEach(n => variables.refs.push(n));
                    break;
                  case 'useContext':
                    names.forEach(n => variables.context.push(n));
                    break;
                  case 'useReducer':
                    if (names.length >= 2) {
                      variables.reducers.push(`${names[0]}: ${names[0]}, ${names[1]}: ${names[1]}`);
                    }
                    break;
                  default:
                    names.forEach(n => variables.locals.push(n));
                }
              } else {
                names.forEach(n => variables.locals.push(n));
              }
            }
          });

          context = {
            type: isComponent ? 'react' : 'function',
            name,
            args,
            insertPos,
            ...variables
          };
        }
      }
    }
  });

  return context;
}

function containsJSX(path: NodePath): boolean {
  let hasJSX = false;
  path.traverse({
    JSXElement() {
      hasJSX = true;
    },
    JSXFragment() {
      hasJSX = true;
    }
  });
  return hasJSX;
}
