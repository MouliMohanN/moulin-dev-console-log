import * as vscode from 'vscode';

export interface CodeContext {
  type: 'function' | 'react';
  name: string;
  args: string[];
  variables: {
    props: string[];
    state: string[];
    refs: string[];
    context: string[];
    reducers: string[];
    locals: string[];
  };
  insertPos: vscode.Position;
}
