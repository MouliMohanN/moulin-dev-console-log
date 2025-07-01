import * as vscode from 'vscode';
import { getConfiguration } from './config';
import { generateConsoleLog } from './logGenerator';
import { logger } from './logger';

export function openTemplateEditor(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'logTemplateEditor',
    'Log Template Editor',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

  const updateWebview = () => {
    const config = getConfiguration();
    const currentTemplate = config.logTemplate;
    const currentLogLevel = config.logLevel;
    const currentLogFunction = config.logFunction;
    panel.webview.postMessage({
      type: 'updateConfig',
      template: currentTemplate,
      logLevel: currentLogLevel,
      logFunction: currentLogFunction,
    });
  };

  // Initial update
  updateWebview();

  // Listen for configuration changes
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('contextualConsoleLog.logTemplate') ||
        e.affectsConfiguration('contextualConsoleLog.logLevel') ||
        e.affectsConfiguration('contextualConsoleLog.logFunction')) {
      updateWebview();
    }
  });

  panel.webview.onDidReceiveMessage(
    async message => {
      switch (message.command) {
        case 'updateTemplate':
          await vscode.workspace.getConfiguration('contextualConsoleLog').update(
            'logTemplate',
            message.template,
            vscode.ConfigurationTarget.Global,
          );
          logger.info('Log template updated.');
          break;
        case 'updateLogLevel':
          await vscode.workspace.getConfiguration('contextualConsoleLog').update(
            'logLevel',
            message.logLevel,
            vscode.ConfigurationTarget.Global,
          );
          logger.info('Log level updated.');
          break;
        case 'updateLogFunction':
          await vscode.workspace.getConfiguration('contextualConsoleLog').update(
            'logFunction',
            message.logFunction,
            vscode.ConfigurationTarget.Global,
          );
          logger.info('Log function updated.');
          break;
        case 'requestPreview':
          const dummyContext = {
            type: 'function' as const,
            name: 'myFunction',
            args: ['arg1', 'arg2'],
            variables: {
              props: ['propA', 'propB'],
              state: ['stateX', 'stateY'],
              refs: ['refY', 'refZ'],
              context: ['ctxZ', 'ctxA'],
              reducers: ['reducerR', 'reducerS'],
              locals: ['localV', 'localW'],
              reduxContext: ['reduxC', 'reduxD'],
              args: ['arg1', 'arg2'],
            },
            insertPos: new vscode.Position(0, 0),
          };
          const previewLog = generateConsoleLog(dummyContext, 'myFile.ts');
          panel.webview.postMessage({
            type: 'showPreview',
            preview: previewLog,
          });
          break;
      }
    },
    undefined,
    context.subscriptions,
  );
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'templateEditor.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'templateEditor.css'));

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Log Template Editor</title>
        <link href="${styleUri}" rel="stylesheet">
    </head>
    <body>
        <h1>Log Template Editor</h1>
        <p>Customize your console.log template.</p>

        <div class="control-group">
            <label for="logTemplate">Log Template:</label>
            <input type="text" id="logTemplate" value="" />
            <small>Available variables: &dollar;{fileName}, &dollar;{functionName}, &dollar;{props}, &dollar;{state}, &dollar;{refs}, &dollar;{context}, &dollar;{reducers}, &dollar;{locals}, &dollar;{args}, &dollar;{reduxContext}</small>
        </div>

        <div class="control-group">
            <label for="logLevel">Log Level:</label>
            <select id="logLevel">
                <option value="log">log</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
                <option value="info">info</option>
                <option value="debug">debug</option>
            </select>
        </div>

        <div class="control-group">
            <label for="logFunction">Log Function:</label>
            <input type="text" id="logFunction" value="console" />
            <small>e.g., console, myLogger</small>
        </div>

        <button id="previewButton">Generate Preview</button>

        <h2>Preview:</h2>
        <pre id="logPreview"></pre>

        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
