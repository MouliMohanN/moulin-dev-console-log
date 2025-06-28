import * as vscode from 'vscode';
import { CodeContext } from './types';

function buildLogObject(context: CodeContext, logItemsConfig: string[]): any {
  const obj: any = {};

  const addVariables = (variables: any, prefix: string = '') => {
    if (logItemsConfig.includes('args') && context.type === 'function' && context.args.length) {
      obj[`${prefix}args`] = `{ ${context.args.join(', ')} }`;
    }
    if (logItemsConfig.includes('props') && variables.props.length) {
      obj[`${prefix}props`] = `{ ${variables.props.join(', ')} }`;
    }
    if (logItemsConfig.includes('state') && variables.state.length) {
      obj[`${prefix}state`] = `{ ${variables.state.join(', ')} }`;
    }
    if (logItemsConfig.includes('refs') && variables.refs.length) {
      obj[`${prefix}refs`] = `{ ${variables.refs.map((s: string) => `${s}: ${s}.current`).join(', ')} }`;
    }
    if (logItemsConfig.includes('context') && variables.context.length) {
      obj[`${prefix}context`] = `{ ${variables.context.join(', ')} }`;
    }
    if (logItemsConfig.includes('reducers') && variables.reducers.length) {
      obj[`${prefix}reducer`] = `{ ${variables.reducers.join(', ')} }`;
    }
    if (logItemsConfig.includes('locals') && variables.locals.length) {
      obj[`${prefix}locals`] = `{ ${variables.locals.join(', ')} }`;
    }
  };

  addVariables(context.variables);

  if (context.parentContext) {
    obj.parent = buildLogObject(context.parentContext, logItemsConfig);
  }

  return obj;
}

export function generateConsoleLog(ctx: CodeContext, fileName: string, selectedItems?: string[]): string {
  const config = vscode.workspace.getConfiguration('contextualConsoleLog');
  const logTemplate = config.get<string>('logTemplate', '[${fileName} > ${functionName}]');
  const logMethod = config.get<string>('logMethod', 'log');
  const addDebugger = config.get<boolean>('addDebugger', false);
  const logItemsConfig = config.get<string[]>('logItems', [
    'props',
    'state',
    'refs',
    'context',
    'reducers',
    'locals',
  ]);

  const prefix = logTemplate.replace('${fileName}', fileName).replace('${functionName}', ctx.name);

  let logObject: any = {};

  if (selectedItems) {
    // If specific items are selected, only log those from the current context
    const selectedMap: { [key: string]: string[] } = {
      props: [],
      state: [],
      refs: [],
      context: [],
      reducers: [],
      locals: [],
      args: [],
    };

    selectedItems.forEach((item) => {
      const [type, name] = item.split(': ');
      if (selectedMap[type]) {
        selectedMap[type].push(name);
      }
    });

    const parts: string[] = [];
    if (selectedMap.args.length) {
      parts.push(`args: { ${selectedMap.args.join(', ')} }`);
    }
    if (selectedMap.props.length) {
      parts.push(`props: { ${selectedMap.props.join(', ')} }`);
    }
    if (selectedMap.state.length) {
      parts.push(`state: { ${selectedMap.state.join(', ')} }`);
    }
    if (selectedMap.refs.length) {
      parts.push(`refs: { ${selectedMap.refs.map((s) => `${s}: ${s}.current`).join(', ')} }`);
    }
    if (selectedMap.context.length) {
      parts.push(`context: { ${selectedMap.context.join(', ')} }`);
    }
    if (selectedMap.reducers.length) {
      parts.push(`reducer: { ${selectedMap.reducers.join(', ')} }`);
    }
    if (selectedMap.locals.length) {
      parts.push(`locals: { ${selectedMap.locals.join(', ')} }`);
    }
    logObject = parts.length > 0 ? `{ ${parts.join(', ')} }` : '';

  } else {
    // If no specific items are selected, build the full hierarchical log object
    logObject = buildLogObject(ctx, logItemsConfig);
  }

  let logLine = `console.${logMethod}('${prefix}', ${JSON.stringify(logObject, null, 2)});`;

  if (addDebugger) {
    logLine = `debugger;\n${logLine}`;
  }

  return logLine;
}