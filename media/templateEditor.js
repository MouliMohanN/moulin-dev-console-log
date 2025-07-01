const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
  const logTemplateInput = document.getElementById('logTemplate');
  const logLevelSelect = document.getElementById('logLevel');
  const logFunctionInput = document.getElementById('logFunction');
  

  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
      case 'updateConfig':
        logTemplateInput.value = message.template;
        logLevelSelect.value = message.logLevel;
        logFunctionInput.value = message.logFunction;
        vscode.postMessage({
          command: 'requestPreview'
        });
        break;
      
    }
  });

  logTemplateInput.addEventListener('input', () => {
    vscode.postMessage({
      command: 'updateTemplate',
      template: logTemplateInput.value
    });
    vscode.postMessage({
      command: 'requestPreview'
    });
  });

  logLevelSelect.addEventListener('change', () => {
    vscode.postMessage({
      command: 'updateLogLevel',
      logLevel: logLevelSelect.value
    });
    vscode.postMessage({
      command: 'requestPreview'
    });
  });

  logFunctionInput.addEventListener('input', () => {
    vscode.postMessage({
      command: 'updateLogFunction',
      logFunction: logFunctionInput.value
    });
    vscode.postMessage({
      command: 'requestPreview'
    });
  });

  

  
});