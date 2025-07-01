import * as t from '@babel/types';

export function isFunctionNode(node: t.Node): boolean {
  return (
    t.isFunctionDeclaration(node) ||
    t.isArrowFunctionExpression(node) ||
    t.isFunctionExpression(node) ||
    t.isClassMethod(node)
  );
}

export function getFunctionName(node: any, path: any): string {
  return (
    node.id?.name ||
    node.key?.name ||
    (path.parent.type === 'VariableDeclarator' && path.parent.id?.name) ||
    'anonymous'
  );
}

export function detectComponent(path: any): boolean {
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
}
