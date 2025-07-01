import * as assert from 'assert';
import * as vscode from 'vscode';
import { parseCodeContextAtCursor, parseFileForFunctions } from '../../src/parser';
import { setConfiguration, resetConfiguration } from '../../src/config';
import { filterUnusedVariables } from '../parser/filterUtils';
import { logger } from '../logger';

suite('Parser Test Suite', () => {
    let mockCode = '';
    const doc = {
        positionAt: (offset: number) => {
            let line = 0;
            let character = 0;
            for (let i = 0; i < offset; i++) {
                if (mockCode[i] === '\n') {
                    line++;
                    character = 0;
                } else {
                    character++;
                }
            }
            return new vscode.Position(line, character);
        },
        getText: (range?: vscode.Range) => {
            if (!range) {
                return mockCode;
            }
            const startOffset = doc.offsetAt(range.start);
            const endOffset = doc.offsetAt(range.end);
            return mockCode.substring(startOffset, endOffset);
        },
        offsetAt: (position: vscode.Position) => {
            let offset = 0;
            const lines = mockCode.split('\n');
            for (let i = 0; i < position.line; i++) {
                offset += lines[i].length + 1; // +1 for the newline character
            }
            offset += position.character;
            return offset;
        }
    } as vscode.TextDocument;

    function setupTest(initialConfig: { [key: string]: any } = {}) {
        mockCode = '';
        setConfiguration(() => ({
            logTemplate: '[${fileName} > ${functionName}]',
            logLevel: 'log',
            logItems: ['props', 'state', 'refs', 'context', 'reducers', 'locals'],
            addDebugger: false,
            logFunction: 'console',
            enableClassMethodLogging: true,
            enableHookLogging: true,
            logTag: '// @contextual-log',
            wrapInDevCheck: false,
            showPreview: false,
            
            enableContextLogging: true,
            enableReduxContextLogging: false,
            customLoggerImportStatement: '',
            sensitiveKeys: ['password', 'token', 'secret', 'api_key'],
            ignore: [],
            filterUnusedVariables: true,
            enableDuplicatePrevention: true,
            includeLineNumber: false,
            
            ...initialConfig // Ensure initialConfig values take precedence
        }));
    }

    function teardownTest() {
        resetConfiguration(); // Reset to default after each test
    }

    function runTest(name: string, testFunction: () => void, config: { [key: string]: any } = {}) {
        test(name, () => {
            setupTest(config);
            try {
                testFunction();
            } finally {
                teardownTest();
            }
        });
    }


    runTest('parseCodeContextAtCursor should return null for empty code', () => {
        mockCode = '';
        const code = '';
        const position = new vscode.Position(0, 0);
        const result = parseCodeContextAtCursor(code, position, doc);
        assert.strictEqual(result, null);
    });

    runTest('parseFileForFunctions should return empty array for empty code', () => {
        mockCode = '';
        const code = '';
        const result = parseFileForFunctions(code, doc);
        assert.deepStrictEqual(result, []);
    });

    runTest('parseFileForFunctions should identify a simple function', () => {
        mockCode = 'function myFunction() {\n  const a = 1;\n}';
        const code = 'function myFunction() {\n  const a = 1;\n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });

    runTest('parseFileForFunctions should identify a function with arguments', () => {
        mockCode = 'function myFunction(a, b) {\n  const c = 1;\n}';
        const code = 'function myFunction(a, b) {\n  const c = 1;\n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    });

    runTest('parseFileForFunctions should identify a class method', () => {
        mockCode = 'class MyClass {\n  myMethod() {\n    const a = 1;\n  }\n}';
        const code = 'class MyClass {\n  myMethod() {\n    const a = 1;\n  }\n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myMethod');
    });

    runTest('parseFileForFunctions should identify a React component', () => {
        mockCode = 'function MyComponent(props) {\n  return <div>Hello</div>;\n}';
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].type, 'react');
    }, { filterUnusedVariables: false });

    runTest('parseFileForFunctions should identify variables in a function', () => {
        mockCode = 'function myFunction() {\n  const a = 1;\n  let b = \'hello\';\n console.log(a,b) \n}';
        const code = 'function myFunction() {\n  const a = 1;\n  let b = \'hello\';\n console.log(a,b) \n}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.locals, ['a', 'b']);
    });

    runTest('parseFileForFunctions should identify multiple functions', () => {
        mockCode = 'function func1() {}\nfunction func2() {}';
        const code = 'function func1() {}\nfunction func2() {}';
        const result = parseFileForFunctions(code, doc);
        assert.strictEqual(result.length, 2);
    });

    runTest('parseFileForFunctions should identify an arrow function', () => {
        mockCode = 'const myFunction = () => {\n  const a = 1;\n}';
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });

    runTest('parseFileForFunctions should identify an async function', () => {
        mockCode = 'async function myFunction() {\n  const a = 1;\n}';
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });

    runTest('parseFileForFunctions should identify a generator function', () => {
        mockCode = 'function* myFunction() {\n  yield 1;\n}';
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });

    runTest('parseFileForFunctions should identify props in a React component', () => {
        mockCode = `function MyComponent(props) {\n  console.log(props);\n return <div>Hello</div>;\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.props, ['props']);
    }, { filterUnusedVariables: false });

    runTest('parseFileForFunctions should identify state variables (useState)', () => {
        mockCode = `function MyComponent() {
  const [count, setCount] = useState(0);
  console.log(count);
}`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.state, ['count']);
    }, { filterUnusedVariables: false });

    runTest('parseFileForFunctions should identify refs (useRef)', () => {
        mockCode = `function MyComponent() {\n  const myRef = useRef(null);\n  console.log(myRef);\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.refs, ['myRef']);
    }, { filterUnusedVariables: false });

    runTest('parseFileForFunctions should identify context (useContext)', () => {
        mockCode = `function MyComponent() {\n  const myContext = useContext(MyContext);\n  console.log(myContext);\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.context, ['myContext']);
    }, { filterUnusedVariables: false, enableContextLogging: true });

    runTest('parseFileForFunctions should identify reducers (useReducer)', () => {
        mockCode = `function MyComponent() {\n  const [state, dispatch] = useReducer(reducer, initialState);\n  console.log(state, dispatch);\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        console.log(result);
        logger.log('MouliTesting ', result);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.reducers, ['state']);
    }, { filterUnusedVariables: false });

    runTest('parseFileForFunctions should identify redux context (useSelector)', () => {
        mockCode = `function MyComponent() {\n  const data = useSelector(state => state.some.data);\n  console.log(data);\n return <div>{data}</div>;\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        console.log(result);
        logger.log('MouliTesting ', result);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.reduxContext, ['data']);
    }, { enableReduxContextLogging: true, filterUnusedVariables: false });

    runTest('parseFileForFunctions should identify context (useContext with member expression)', () => {
        mockCode = `function MyComponent() {\n  const data = useContext(MyContext.SomeData);\n  console.log(data);\n return <div>{data}<\/div>;\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        console.log(result);
        logger.log('MouliTesting ', result);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.context, ['data']);
    }, { enableContextLogging: true, enableReduxContextLogging: false, filterUnusedVariables: false });

    runTest('parseFileForFunctions should identify arguments with object destructuring', () => {
        mockCode = 'function myFunction({ a, b }) {\n  console.log(a, b);\n}';
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    }, {});

    runTest('parseFileForFunctions should identify arguments with array destructuring', () => {
        mockCode = 'function myFunction([a, b]) {\n  console.log(a, b);\n}';
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    }, {});

    runTest('parseFileForFunctions should identify arguments with default values', () => {
        mockCode = `function myFunction(a = 1, b = 2) {\n  console.log(a, b);\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    }, { filterUnusedVariables: false });

    runTest('parseFileForFunctions should handle nested functions', () => {
        mockCode = 'function outer() {\n  function inner() {\n    console.log("inner");\n  }\n  console.log("outer");\n}';
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].name, 'outer');
        assert.strictEqual(result[1].name, 'inner');
        assert.strictEqual(result[1].parentContext?.name, 'outer');
    }, {});

    runTest('parseFileForFunctions should filter sensitive keys', () => {
        mockCode = `function myFunction(password, token, username) {\n  console.log(password, token, username);\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['username']);
    }, { sensitiveKeys: ['password', 'token'], filterUnusedVariables: false });

    
    runTest('parseFileForFunctions should correctly identify insert position with return statement', () => {
        mockCode = `function myFunction() {\n  return 1;\n}`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].insertPos, new vscode.Position(1, 2)); // Before 'return 1;'
    }, {});

    runTest('isFunctionNode should identify arrow function in variable declaration', () => {
        mockCode = `const myFunction = () => {};`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    }, {});

    runTest('isFunctionNode should identify function expression in variable declaration', () => {
        mockCode = `const myFunction = function() {};`;
        const result = parseFileForFunctions(mockCode, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    }, {});
});

    