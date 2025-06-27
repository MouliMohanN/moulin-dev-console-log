import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
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

  let context: CodeContext | null = null;
  logger.log('parser.ts ~ parseCodeContext ~ before traverse ~ ast', { ast });

  traverse(ast, {
    enter(path) {
      const node = path.node;
      if (!node.loc || context) {return;}

      if (
        positionIn(node.loc, cursor, doc) &&
        (t.isFunctionDeclaration(node) || t.isArrowFunctionExpression(node) || t.isFunctionExpression(node))
      ) {
        const name =
          (node as any).id?.name ||
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
        const firstParam = node.params?.[0];

        if (firstParam && (t.isObjectPattern(firstParam) || t.isIdentifier(firstParam))) {
          args = extractVariableNames(firstParam);
        }

        logger.log('parser.ts ~ parseCodeContext ~ traverse ~ enter', {
          name,
          isComponent,
          args,
          nodeParams: (node as any).params,
        });

        if (isComponent) {
          variables.props = args;
        }

        const insertPos = findReturnInsertPosition(node, doc);

        logger.log('parser.ts ~ parseCodeContext ~ traverse ~ insertPos', { insertPos, firstParam, variables });

        path.traverse({
          VariableDeclarator(inner) {
            const id = inner.node.id;
            const init = inner.node.init;

            if (!t.isIdentifier(id) && !t.isArrayPattern(id) && !t.isObjectPattern(id)) {return;}

            const names = extractVariableNames(id);

            if (t.isCallExpression(init)) {
              const callee = (init.callee as any).name || (init.callee as any).property?.name;

              switch (callee) {
                case 'useState':
                  if (t.isArrayPattern(id) && id.elements[0] && t.isIdentifier(id.elements[0])) {
                    variables.state.push(id.elements[0].name);
                  }
                  break;
                case 'useRef':
                  names.forEach((n) => variables.refs.push(n));
                  break;
                case 'useContext':
                  names.forEach((n) => variables.context.push(n));
                  break;
                case 'useReducer':
                  if (names.length >= 2) {
                    variables.reducers.push(`${names[0]}: ${names[0]}, ${names[1]}: ${names[1]}`);
                  }
                  break;
                default:
                  names.forEach((n) => variables.locals.push(n));
              }
            } else {
              names.forEach((n) => variables.locals.push(n));
            }
          },
        });

        context = {
          type: isComponent ? 'react' : 'function',
          name,
          args,
          insertPos,
          ...variables,
        };
      }
    },
  });

  return context;
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
      } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
        names.push(prop.argument.name);
      }
    });
  }

  return names;
}
