export function formatLogLine(
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
    logLine = `if (process.env.NODE_ENV !== 'production') {\n  ${logLine}\n}`;}
  if (logTag) {
    logLine = `${logLine} ${logTag}`;
  }
  if (addDebugger) {
    logLine = `debugger;\n${logLine}`;
  }
  return logLine;
}
