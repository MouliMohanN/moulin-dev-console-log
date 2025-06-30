
import * as assert from 'assert';
import * as vscode from 'vscode';
import { parseCodeContextAtCursor, parseFileForFunctions } from '../../src/parser';

suite('Parser Test Suite', () => {
    const doc = {
        positionAt: (offset: number) => new vscode.Position(0, 0),
        getText: (range?: vscode.Range) => ''
    } as vscode.TextDocument;

    test('parseCodeContextAtCursor should return null for empty code', () => {
        const code = '';
        const position = new vscode.Position(0, 0);
        const result = parseCodeContextAtCursor(code, position, doc);
        assert.strictEqual(result, null);
    });

    test('parseFileForFunctions should return empty array for empty code', () => {
        const code = '';
        const result = parseFileForFunctions(code, doc);
        assert.deepStrictEqual(result, []);
    });

    test('parseFileForFunctions should identify a simple function', () => {
        const code = 'function myFunction() {\n  const a = 1;\n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });

    test('parseFileForFunctions should identify a function with arguments', () => {
        const code = 'function myFunction(a, b) {\n  const c = 1;\n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    });

    test('parseFileForFunctions should identify a class method', () => {
        const code = 'class MyClass {\n  myMethod() {\n    const a = 1;\n  }\n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myMethod');
    });

    test('parseFileForFunctions should identify a React component', () => {
        const code = 'function MyComponent(props) {\n  return <div>Hello</div>;\n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].type, 'react');
    });

    test('parseFileForFunctions should identify variables in a function', () => {
        const code = 'function myFunction() {\n  const a = 1;\n  let b = \'hello\';\n console.log(a,b) \n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.locals, ['a', 'b']);
    });

    test('parseFileForFunctions should identify multiple functions', () => {
        const code = 'function func1() {}\nfunction func2() {}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 2);
    });
});
