import * as vscode from 'vscode';
import { CodeContext } from './types';

export function generateConsoleLog(ctx: CodeContext, fileName: string, selectedItems?: string[]): string {
  const config = vscode.workspace.getConfiguration('contextualConsoleLog');
  const logTemplate = config.get<string>('logTemplate', '[${fileName} > ${functionName}]');
  const logMethod = config.get<string>('logMethod', 'log');
  const addDebugger = config.get<boolean>('addDebugger', false);

  const prefix = logTemplate.replace('${fileName}', fileName).replace('${functionName}', ctx.name);

  const parts: string[] = [];

  const selectedMap: { [key: string]: string[] } = {
    props: [],
    state: [],
    refs: [],
    context: [],
    reducers: [],
    locals: [],
    args: [],
  };

  if (selectedItems) {
    selectedItems.forEach((item) => {
      const [type, name] = item.split(': ');
      if (selectedMap[type]) {
        selectedMap[type].push(name);
      }
    });
  } else {
    // Fallback to config if no specific items are selected (e.g., for multi-cursor without interactive selection)
    const logItemsConfig = config.get<string[]>('logItems', [
      'props',
      'state',
      'refs',
      'context',
      'reducers',
      'locals',
    ]);
    if (logItemsConfig.includes('args') && ctx.type === 'function') {
      selectedMap.args = ctx.args;
    }
    if (logItemsConfig.includes('props')) {
      selectedMap.props = ctx.variables.props;
    }
    if (logItemsConfig.includes('state')) {
      selectedMap.state = ctx.variables.state;
    }
    if (logItemsConfig.includes('refs')) {
      selectedMap.refs = ctx.variables.refs;
    }
    if (logItemsConfig.includes('context')) {
      selectedMap.context = ctx.variables.context;
    }
    if (logItemsConfig.includes('reducers')) {
      selectedMap.reducers = ctx.variables.reducers;
    }
    if (logItemsConfig.includes('locals')) {
      selectedMap.locals = ctx.variables.locals;
    }
  }

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

  const logObject = parts.length > 0 ? `, {\n  ${parts.join(',\n  ')}\n}` : '';

  let logLine = `console.${logMethod}('${prefix}'${logObject});`;

  if (addDebugger) {
    logLine = `debugger;\n${logLine}`;
  }

  return logLine;
}