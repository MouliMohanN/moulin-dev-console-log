import * as vscode from 'vscode';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('contextualConsoleLog.insertLog', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {return;}

    const doc = editor.document;
    const pos = editor.selection.active;
    const code = doc.getText();
    const fileName = doc.fileName.split(/\/|\\/).pop() || 'Unknown';

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy']
    });

    let isInsideRegularFunction = false;
    let isInsideReactComponent = false;
    let funcName: string | null = null;
    let funcArgs: string[] = [];
    let compName: string | null = null;

    let props: string[] = [];
    let states: string[] = [];
    let refs: string[] = [];
    let contexts: string[] = [];
    let reducers: string[] = [];
    let locals: string[] = [];

    let currentComponentNode: any = null;

    traverse(ast, {
      enter(path) {
        const node = path.node;
        if (!node.loc) {return;}

        // Cursor position logic
        if (positionIn(node.loc, pos, doc)) {
          // Regular function
          if (path.isFunctionDeclaration() || path.isFunctionExpression() || path.isArrowFunctionExpression()) {
            const parent = path.parent;
            const name = (node as any).id?.name ||
              (parent.type === 'VariableDeclarator' && (parent as any).id?.name) ||
              'anonymous';

            funcName = name;
            funcArgs = (node as any).params?.map((p: any) => p.name || doc.getText(p)) || [];
            isInsideRegularFunction = true;
          }

          // React component detection (with return statement)
          if (
            path.isFunctionDeclaration() ||
            path.isFunctionExpression() ||
            path.isArrowFunctionExpression()
          ) {
            const returnNode = (node as any).body?.body?.find((n: any) => n.type === 'ReturnStatement');
            if (returnNode) {
              compName = (node as any).id?.name ||
                (path.parent.type === 'VariableDeclarator' && (path.parent as any).id?.name) ||
                'AnonymousComponent';
              props = (node as any).params?.map((p: any) => p.name || doc.getText(p)) || [];
              isInsideReactComponent = true;
              currentComponentNode = node;
            }
          }
        }

        // Collect contextual variables if inside a React component
        if (
          isInsideReactComponent &&
          currentComponentNode &&
          path.isVariableDeclarator() &&
          path.findParent(p => p.node === currentComponentNode)
        ) {
          const name = (path.node.id as any).name;
          const init = path.node.init;

          if (!init) {return;}

          if (init.type === 'CallExpression') {
            const callee = (init.callee as any).name;
            if (callee === 'useState') {
              if (!states.includes(name)) {states.push(name);}
            } else if (callee === 'useRef') {
              if (!refs.includes(name)) {refs.push(name);}
            } else if (callee === 'useContext') {
              if (!contexts.includes(name)) {contexts.push(name);}
            } else if (callee === 'useReducer') {
              const [stateVar, dispatchVar] = (path.node.id as any).elements.map((e: any) => e.name);
              reducers.push(`${stateVar}: ${stateVar}, ${dispatchVar}: ${dispatchVar}`);
            } else {
              if (!locals.includes(name)) {locals.push(name);}
            }
          } else {
            if (!locals.includes(name)) {locals.push(name);}
          }
        }
      }
    });

    // Build final console.log
    let logLine = '';

    if (isInsideRegularFunction) {
      const argsStr = funcArgs.length ? `{ args: { ${funcArgs.join(', ')} } }` : `{}`;
      logLine = `console.log('[${fileName} > ${funcName}]', ${argsStr});`;
    } else if (isInsideReactComponent && compName) {
      const logParts: string[] = [];

      if (props.length) {logParts.push(`props: { ${props.join(', ')} }`);}
      if (states.length) {logParts.push(`state: { ${states.join(', ')} }`);}
      if (refs.length) {logParts.push(`refs: { ${refs.map(r => `${r}: ${r}.current`).join(', ')} }`);}
      if (contexts.length) {logParts.push(`context: { ${contexts.join(', ')} }`);}
      if (reducers.length) {logParts.push(`reducer: { ${reducers.join(', ')} }`);}
      if (locals.length) {logParts.push(`locals: { ${locals.join(', ')} }`);}

      if (logParts.length > 0) {
        logLine = `console.log('[${fileName} > ${compName}]', {\n  ${logParts.join(',\n  ')}\n});`;
      } else {
        logLine = `console.log('[${fileName} > ${compName}]', {});`;
      }
    } else {
      logLine = `console.log('[${fileName}]');`;
    }

    await editor.edit(editBuilder => {
      editBuilder.insert(pos, logLine + '\n');
    });
  });

  context.subscriptions.push(disposable);
}

function positionIn(loc: any, pos: vscode.Position, doc: vscode.TextDocument) {
  const start = new vscode.Position(loc.start.line - 1, loc.start.column);
  const end = new vscode.Position(loc.end.line - 1, loc.end.column);
  return pos.isAfterOrEqual(start) && pos.isBeforeOrEqual(end);
}

export function deactivate() {}
