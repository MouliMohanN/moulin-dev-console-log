import { getConfiguration } from './config';
import { CodeContext } from './types';
import { buildLogObject, buildParentLogObject } from './logGenerator/logObjectBuilders';
import { addVariables } from './logGenerator/variableHandlers';
import { createSelectedMap, stringifySelectedMap } from './logGenerator/selectedMapHandlers';
import { formatLogLine } from './logGenerator/logFormatter';

export function generateConsoleLog(ctx: CodeContext, fileName: string, selectedItems?: string[]): string {
  const config = getConfiguration();
  const { logTemplate, logLevel, addDebugger, logItems, logFunction, logTag, wrapInDevCheck } = config;
  const prefix = logTemplate.replace('${fileName}', fileName).replace('${functionName}', ctx.name);
  let logObject: string = '';
  if (selectedItems && selectedItems.length > 0) {
    const selectedMap = createSelectedMap(ctx, selectedItems);
    logObject = stringifySelectedMap(selectedMap);
  } else {
    logObject = buildLogObject(ctx, logItems);
  }
  return formatLogLine(logFunction, logLevel, prefix, logObject, wrapInDevCheck, logTag, addDebugger);
}