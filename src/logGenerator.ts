import { getConfiguration } from './config';
import { formatLogLine } from './logGenerator/logFormatter';
import { buildLogObject } from './logGenerator/logObjectBuilders';
import { createSelectedMap, stringifySelectedMap } from './logGenerator/selectedMapHandlers';
import { CodeContext } from './types';

export function generateConsoleLog(ctx: CodeContext, fileName: string, selectedItems?: string[]): string {
  const config = getConfiguration();
  const { logTemplate, logLevel, addDebugger, logItems, logFunction, logTag, wrapInDevCheck, includeLineNumber } =
    config;
  let prefix = logTemplate.replace('${fileName}', fileName).replace('${functionName}', ctx.name);
  if (includeLineNumber) {
    if (!logTemplate.includes('${lineNumber}')) {
      prefix += ` > line: ${ctx.insertPos.line.toString()}`;
    } else {
      prefix = prefix.replace('${lineNumber}', ctx.insertPos.line.toString());
    }
  }
  let logObject: string = '';
  if (selectedItems && selectedItems.length > 0) {
    const selectedMap = createSelectedMap(ctx, selectedItems);
    logObject = stringifySelectedMap(selectedMap);
  } else {
    logObject = buildLogObject(ctx, logItems);
  }
  return formatLogLine(logFunction, logLevel, prefix, logObject, wrapInDevCheck, logTag, addDebugger);
}
