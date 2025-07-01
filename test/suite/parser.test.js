"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vscode = __importStar(require("vscode"));
const parser_1 = require("../../src/parser");
suite('Parser Test Suite', () => {
    let mockCode = '';
    let mockConfig = {};
    beforeEach(() => {
        mockCode = '';
        mockConfig = {};
    });
    const doc = {
        positionAt: (offset) => {
            let line = 0;
            let character = 0;
            for (let i = 0; i < offset; i++) {
                if (mockCode[i] === '\n') {
                    line++;
                    character = 0;
                }
                else {
                    character++;
                }
            }
            return new vscode.Position(line, character);
        },
        getText: (range) => {
            if (!range) {
                return mockCode;
            }
            const startOffset = doc.offsetAt(range.start);
            const endOffset = doc.offsetAt(range.end);
            return mockCode.substring(startOffset, endOffset);
        },
        offsetAt: (position) => {
            let offset = 0;
            const lines = mockCode.split('\n');
            for (let i = 0; i < position.line; i++) {
                offset += lines[i].length + 1; // +1 for the newline character
            }
            offset += position.character;
            return offset;
        }
    };
    const originalGetConfiguration = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = (section) => {
        if (section === 'contextualConsoleLog') {
            return {
                get: (key, defaultValue) => {
                    return mockConfig[key] !== undefined ? mockConfig[key] : defaultValue;
                }
            };
        }
        return originalGetConfiguration(section);
    };
    test('parseCodeContextAtCursor should return null for empty code', () => {
        const code = '';
        const position = new vscode.Position(0, 0);
        const result = (0, parser_1.parseCodeContextAtCursor)(code, position, doc);
        assert.strictEqual(result, null);
    });
    test('parseFileForFunctions should return empty array for empty code', () => {
        const code = '';
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.deepStrictEqual(result, []);
    });
    test('parseFileForFunctions should identify a simple function', () => {
        const code = 'function myFunction() {\n  const a = 1;\n}';
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });
    test('parseFileForFunctions should identify a function with arguments', () => {
        const code = 'function myFunction(a, b) {\n  const c = 1;\n}';
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    });
    test('parseFileForFunctions should identify a class method', () => {
        const code = 'class MyClass {\n  myMethod() {\n    const a = 1;\n  }\n}';
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myMethod');
    });
    test('parseFileForFunctions should identify a React component', () => {
        const code = 'function MyComponent(props) {\n  return <div>Hello</div>;\n}';
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].type, 'react');
    });
    test('parseFileForFunctions should identify variables in a function', () => {
        const code = 'function myFunction() {\n  const a = 1;\n  let b = \'hello\';\n console.log(a,b) \n}';
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.locals, ['a', 'b']);
    });
    test('parseFileForFunctions should identify multiple functions', () => {
        const code = 'function func1() {}\nfunction func2() {}';
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 2);
    });
    test('parseFileForFunctions should identify an arrow function', () => {
        const code = 'const myFunction = () => {\n  const a = 1;\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });
    test('parseFileForFunctions should identify an async function', () => {
        const code = 'async function myFunction() {\n  const a = 1;\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });
    test('parseFileForFunctions should identify a generator function', () => {
        const code = 'function* myFunction() {\n  yield 1;\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, 'myFunction');
    });
    test('parseFileForFunctions should identify props in a React component', () => {
        const code = 'function MyComponent(props) {\n  console.log(props);\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.props, ['props']);
    });
    test('parseFileForFunctions should identify state variables (useState)', () => {
        const code = 'function MyComponent() {\n  const [count, setCount] = useState(0);\n  console.log(count);\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.state, ['count']);
    });
    test('parseFileForFunctions should identify refs (useRef)', () => {
        const code = 'function MyComponent() {\n  const myRef = useRef(null);\n  console.log(myRef);\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.refs, ['myRef']);
    });
    test('parseFileForFunctions should identify context (useContext)', () => {
        const code = 'function MyComponent() {\n  const myContext = useContext(MyContext);\n  console.log(myContext);\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.context, ['myContext']);
    });
    test('parseFileForFunctions should identify reducers (useReducer)', () => {
        const code = 'function MyComponent() {\n  const [state, dispatch] = useReducer(reducer, initialState);\n  console.log(state, dispatch);\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.reducers, ['state: state, dispatch: dispatch']);
    });
    test('parseFileForFunctions should identify redux context (useSelector)', () => {
        const code = 'function MyComponent() {\n  const data = useSelector(state => state.some.data);\n  console.log(data);\n}';
        mockCode = code;
        mockConfig = { enableReduxContextLogging: true };
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.reduxContext, ['state => state.some.data']);
    });
    test('parseFileForFunctions should identify redux context (useContext with member expression)', () => {
        const code = 'function MyComponent() {\n  const data = useContext(MyContext.SomeData);\n  console.log(data);\n}';
        mockCode = code;
        mockConfig = { enableReduxContextLogging: true };
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].variables.reduxContext, ['MyContext.SomeData']);
    });
    test('parseFileForFunctions should identify arguments with object destructuring', () => {
        const code = 'function myFunction({ a, b }) {\n  console.log(a, b);\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    });
    test('parseFileForFunctions should identify arguments with array destructuring', () => {
        const code = 'function myFunction([a, b]) {\n  console.log(a, b);\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    });
    test('parseFileForFunctions should identify arguments with default values', () => {
        const code = 'function myFunction(a = 1, b = 2) {\n  console.log(a, b);\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 1);
        assert.deepStrictEqual(result[0].args, ['a', 'b']);
    });
    test('parseFileForFunctions should handle nested functions', () => {
        const code = 'function outer() {\n  function inner() {\n    console.log("inner");\n  }\n  console.log("outer");\n}';
        mockCode = code;
        const result = (0, parser_1.parseFileForFunctions)(code, doc);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].name, 'outer');
        assert.strictEqual(result[1].name, 'inner');
        assert.strictEqual(result[1].parentContext?.name, 'outer');
    });
});
//# sourceMappingURL=parser.test.js.map