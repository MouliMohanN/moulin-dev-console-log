import { getConfiguration } from './config';
import { CodeContext } from './types';

const privateUtils = {
  addVariables(
    variables: { [key: string]: string[] },
    logItemsConfig: string[],
    context: CodeContext,
    parts: string[],
    prefix: string = '',
  ) {
    for (const key in variables) {
      if (logItemsConfig.includes(key) && variables[key].length) {
        if (key === 'refs') {
          parts.push(`${prefix}${key}: { ${variables[key].map((s: string) => `${s}: ${s}.current`).join(', ')} }`);
        } else if (key === 'reducers') {
          parts.push(`${prefix}reducer: { ${variables[key].join(', ')} }`);
        } else if (key === 'args' && context.type !== 'function') {
          continue;
        } else {
          parts.push(`${prefix}${key}: { ${variables[key].join(', ')} }`);
        }
      }
    }
  },

  buildParentLogObject(context: CodeContext, logItemsConfig: string[]): string | undefined {
    if (context.parentContext) {
      return `parent: ${privateUtils.buildLogObject(context.parentContext, logItemsConfig)}`;
    }
    return undefined;
  },

  buildLogObject(context: CodeContext, logItemsConfig: string[]): string {
    const parts: string[] = [];
    privateUtils.addVariables(context.variables, logItemsConfig, context, parts);
    const parent = privateUtils.buildParentLogObject(context, logItemsConfig);
    if (parent) {
      parts.push(parent);
    }
    return `{ ${parts.join(', ')} }`;
  },

  createSelectedMap(ctx: CodeContext, selectedItems: string[]): { [key: string]: string[] } {
    const selectedMap: { [key: string]: string[] } = {};
    for (const typeKey in ctx.variables) {
      selectedMap[typeKey] = [];
    }
    if (ctx.args && ctx.args.length > 0) {
      selectedMap.args = [];
    }
    selectedItems.forEach((item) => {
      const parts = item.split(': ');
      const type = parts.length > 1 ? parts[0].toLowerCase() : 'locals';
      const name = parts.length > 1 ? parts.slice(1).join(': ') : parts[0];
      if (type === 'args' && ctx.type === 'function') {
        selectedMap.args.push(name);
      } else if (selectedMap[type]) {
        selectedMap[type].push(name);
      } else {
        selectedMap[type] = selectedMap[type] || [];
        selectedMap[type].push(name);
      }
    });
    return selectedMap;
  },

  stringifySelectedMap(selectedMap: { [key: string]: string[] }): string {
    const parts: string[] = [];
    for (const typeKey in selectedMap) {
      if (selectedMap[typeKey].length) {
        if (typeKey === 'refs') {
          parts.push(`refs: { ${selectedMap[typeKey].map((s) => `${s}: ${s}.current`).join(', ')} }`);
        } else if (typeKey === 'reducers') {
          parts.push(`reducer: { ${selectedMap[typeKey].join(', ')} }`);
        } else if (typeKey === 'reduxContext') {
          parts.push(`reduxContext: { ${selectedMap[typeKey].join(', ')} }`);
        } else if (typeKey === 'args') {
          parts.push(`args: { ${selectedMap[typeKey].join(', ')} }`);
        } else {
          parts.push(`${typeKey}: { ${selectedMap[typeKey].join(', ')} }`);
        }
      }
    }
    return parts.length > 0 ? `{ ${parts.join(', ')} }` : '';
  },

  formatLogLine(
    logFunction: string,
    logLevel: string,
    prefix: string,
    logObject: string,
    wrapInDevCheck: boolean,
    logTag: string,
    addDebugger: boolean,
  ): string {
    let logLine = `${logFunction}.${logLevel}('${prefix}', ${logObject});`;
    if (wrapInDevCheck) {
      logLine = `if (process.env.NODE_ENV !== 'production') {\n  ${logLine}\n}`;
    }
    if (logTag) {
      logLine = `${logLine} ${logTag}`;
    }
    if (addDebugger) {
      logLine = `debugger;\n${logLine}`;
    }
    return logLine;
  },
};

export function generateConsoleLog(ctx: CodeContext, fileName: string, selectedItems?: string[]): string {
  const config = getConfiguration();
  const { logTemplate, logLevel, addDebugger, logItems, logFunction, logTag, wrapInDevCheck } = config;
  const prefix = logTemplate.replace('${fileName}', fileName).replace('${functionName}', ctx.name);
  let logObject: string = '';
  if (selectedItems && selectedItems.length > 0) {
    const selectedMap = privateUtils.createSelectedMap(ctx, selectedItems);
    logObject = privateUtils.stringifySelectedMap(selectedMap);
  } else {
    logObject = privateUtils.buildLogObject(ctx, logItems);
  }
  return privateUtils.formatLogLine(logFunction, logLevel, prefix, logObject, wrapInDevCheck, logTag, addDebugger);
}
