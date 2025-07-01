import * as t from '@babel/types';
import traverse from '@babel/traverse';
import * as vscode from 'vscode';
import { CodeContext, VariableBuckets } from '../types';
import { extractVariableNames } from './variableUtils';

export function createEmptyVariableBuckets(): VariableBuckets {
  return { props: [], state: [], refs: [], context: [], reducers: [], locals: [], reduxContext: [] };
}

export function extractArgs(node: any): string[] {
  const args: string[] = [];
  if (node.params) {
    node.params.forEach((param: t.LVal) => {
      if (t.isObjectPattern(param) || t.isIdentifier(param) || t.isArrayPattern(param)) {
        args.push(...extractVariableNames(param));
      } else if (t.isAssignmentPattern(param)) {
        // Handle default parameters like `function myFunction(a = 1)`
        if (t.isIdentifier(param.left)) {
          args.push(param.left.name);
        }
      }
    });
  }
  return args;
}

export function collectClassMethodVars(node: any, newContext: CodeContext, path: any) {
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
    path.scope,
    path,
  );
}

export function collectVariableDeclaration(
  id: any,
  init: any,
  newContext: CodeContext,
  doc: vscode.TextDocument,
  config: any,
  enableHookLogging: boolean,
  enableReduxContextLogging: boolean,
  enableContextLogging: boolean,
) {
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
        if (enableContextLogging) {
          names.forEach((n) => newContext.variables.context.push(n));
        }
        break;
      case 'useReducer':
        if (names.length >= 1) {
          newContext.variables.reducers.push(names[0]);
        }
        break;
      case 'useSelector':
        if (enableReduxContextLogging) {
          names.forEach((n) => newContext.variables.reduxContext.push(n));
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
}
