import { getConfiguration } from './config';
import { logger } from './logger';
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
  const config = getConfiguration();
  const { logTemplate, logLevel, addDebugger, logItems, logFunction, logTag, wrapInDevCheck } = config;

  const prefix = logTemplate.replace('${fileName}', fileName).replace('${functionName}', ctx.name);

  let logObject: string = '';

  if (selectedItems && selectedItems.length > 0) {
    const selectedMap: { [key: string]: string[] } = {};

    for (const typeKey in ctx.variables) {
      selectedMap[typeKey] = [];
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
    logObject = buildLogObject(ctx, logItems);
  }

  let logLine = `${logFunction}.${logLevel}('${prefix}', ${logObject});`;

  if (wrapInDevCheck) {
    logLine = `if (process.env.NODE_ENV !== 'production') {\n  ${logLine}\n}`; // Indent the log line
  }

  if (logTag) {
    logLine = `${logLine} ${logTag}`;
  }

  if (addDebugger) {
    logLine = `debugger;\n${logLine}`;
  }

  return logLine;
}
