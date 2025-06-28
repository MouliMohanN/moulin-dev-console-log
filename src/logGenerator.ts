import * as vscode from 'vscode';
import { CodeContext } from './types';

function buildLogObject(context: CodeContext, logItemsConfig: string[]): string {
  const parts: string[] = [];

  const addVariables = (variables: { [key: string]: string[] }, prefix: string = '') => {
    for (const key in variables) {
      if (logItemsConfig.includes(key) && variables[key].length) {
        if (key === 'refs') {
          parts.push(`${prefix}${key}: { ${variables[key].map((s: string) => `${s}: ${s}.current`).join(', ')} }`);
        } else if (key === 'reducers') {
          parts.push(`${prefix}reducer: { ${variables[key].join(', ')} }`);
        } else if (key === 'args' && context.type !== 'function') {
          // Skip args if not a function context
          continue;
        } else {
          parts.push(`${prefix}${key}: { ${variables[key].join(', ')} }`);
        }
      }
    }
  };

  addVariables(context.variables);

  if (context.parentContext) {
    parts.push(`parent: ${buildLogObject(context.parentContext, logItemsConfig)}`);
  }

  return `{ ${parts.join(', ')} }`;
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
    const selectedMap: { [key: string]: string[] } = {};

    // Initialize selectedMap with all possible variable types from the context
    for (const typeKey in ctx.variables) {
      selectedMap[typeKey] = [];
    }

    selectedItems.forEach((item) => {
      const parts = item.split(': ');
      // Handle cases where the item label might not have a type prefix (e.g., for args)
      const type = parts.length > 1 ? parts[0].toLowerCase() : 'locals'; // Default to locals if no explicit type
      const name = parts.length > 1 ? parts.slice(1).join(': ') : parts[0];

      // Special handling for 'args' which might not have a type prefix in the quick pick label
      if (type === 'args' && ctx.type === 'function') {
        selectedMap.args.push(name);
      } else if (selectedMap[type]) {
        selectedMap[type].push(name);
      } else {
        // If it's a custom type, add it to selectedMap
        selectedMap[type] = selectedMap[type] || [];
        selectedMap[type].push(name);
      }
    });

    const parts: string[] = [];
    for (const typeKey in selectedMap) {
      if (selectedMap[typeKey].length) {
        if (typeKey === 'refs') {
          parts.push(`refs: { ${selectedMap[typeKey].map((s) => `${s}: ${s}.current`).join(', ')} }`);
        } else if (typeKey === 'reducers') {
          parts.push(`reducer: { ${selectedMap[typeKey].join(', ')} }`);
        } else if (typeKey === 'args') {
          parts.push(`args: { ${selectedMap[typeKey].join(', ')} }`);
        } else {
          parts.push(`${typeKey}: { ${selectedMap[typeKey].join(', ')} }`);
        }
      }
    }
    logObject = parts.length > 0 ? `{ ${parts.join(', ')} }` : '';

  } else {
    // If no specific items are selected, build the full hierarchical log object
    logObject = buildLogObject(ctx, logItemsConfig);
  }

  let logLine = `console.${logMethod}('${prefix}', ${logObject});`;

  if (addDebugger) {
    logLine = `debugger;\n${logLine}`;
  }

  return logLine;
}