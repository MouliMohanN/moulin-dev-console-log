import * as vscode from 'vscode';

export interface VariableBuckets {
  props: string[];
  state: string[];
  refs: string[];
  context: string[];
  reducers: string[];
  locals: string[];
  reduxContext: string[];
}

export interface CodeContext {
  type: 'function' | 'react';
  name: string;
  args: string[];
  variables: VariableBuckets;
  insertPos: vscode.Position;
  hookBodyEndPos?: vscode.Position;
  parentContext?: CodeContext;
  smartSuggestions?: string[];
}
