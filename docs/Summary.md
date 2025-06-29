## 1. Core Functionality: The main purpose is to intelligently add console.log statements. When you run the

command contextualConsoleLog.insertLog, the extension analyzes the code around your cursor.

- Context-Aware Logging: It's not just a simple console.log. The extension parses the code to understand
  the context:
  - If you're inside a regular JavaScript/TypeScript function, it identifies the function's arguments and
    creates a log statement to display their values.
  - If you're in a React component, it goes a step further and identifies props, state variables (from
    useState), refs (from useRef), context variables (from useContext), and reducers (from useReducer).
    It then generates a comprehensive console.log that includes all of this relevant information.

- Code Parsing: It uses the @babel/parser library to create an Abstract Syntax Tree (AST) of your code.
  This allows it to accurately identify functions, variables, and React-specific hooks.

- Log Generation: Once the context is understood, the logGenerator.ts file constructs the final console.log
  string, neatly formatted with the filename and the name of the function or component you're in.

- Insertion: The generated log statement is then inserted into the editor at an appropriate position,
  usually right before the return statement of a function or at the end of the function body if there's no
  explicit return.

In short, this extension saves you the time and effort of manually writing console.log statements,
especially in complex functions or React components, by automatically providing a detailed and
context-aware log.

## 2. Here's a summary of its key features:

- Context-Aware Logging: Analyzes code around the cursor to understand the execution context.
  - For regular functions, it identifies and logs function arguments.
  - For React components, it identifies and logs props, state variables (from useState), refs (from useRef), context variables (from useContext), and reducers (from useReducer), along
    with local variables.
  - It also provides global context by displaying variables from parent functions/components in the Quick Pick menu, clearly distinguishing them from local variables.
- Smart Log Generation: Constructs console.log strings with the filename and the name of the function or component.
- Configurable Log Output:
  - Users can customize the log message prefix using a template (logTemplate).
  - The console method (logMethod) can be set to log, warn, error, debug, or table.
  - Users can specify which items to include in the log (props, state, refs, context, reducers, locals, args) via logItems configuration.
  - Option to insert a debugger; statement along with the log (addDebugger).
- Intelligent Variable Handling:
  - Detects destructured useState and avoids logging setState functions.
  - Automatically logs the .current property for useRef variables.
  - Excludes useCallback variables from being logged as simple locals.
- Code Parsing: Utilizes @babel/parser to build an Abstract Syntax Tree (AST) for accurate code analysis.
- Insertion: Inserts the generated log statement at an appropriate position in the editor, typically before a return statement or at the end of the function body.
- Commands: Provides two main commands:
  - contextualConsoleLog.insertLog: The primary command for inserting contextual logs.
  - contextualConsoleLog.wrapInConsoleLog: Wraps selected text in a console.log statement.
- Language Support: Supports JavaScript, TypeScript, and TSX/JSX files.

# 3. Here's a summary of its key features:

Core Features:

- Insert Contextual Log: Automatically inserts a console.log statement with details about the file and function where it's placed. This can be triggered with the keybinding ctrl+shift+l.
- Wrap Selection: Wraps a selected variable or expression in a console.log statement.
- Clean Logs: Removes the contextual logs that were inserted by the extension.
- File-wide Logging: Inserts contextual logs for all functions within the current file.
- Toggle Logging: A status bar item allows you to quickly enable or disable the log insertion functionality.

Customization:

The extension offers a wide range of settings to customize the log output, including:

- Log Template: Define a custom prefix for your log messages (e.g., [${fileName} > ${functionName}]).
- Log Level: Use different console methods like log, warn, debug, or info.
- Logged Items: Specify which items to include in the log, such as props, state, args, etc.
- Custom Logger: Integrate with your own logging library instead of the standard console.
- Development Check: Optionally wrap logs in a check to ensure they only run in a development environment.
- Sensitive Key Exclusion: Prevent certain variables (e.g., 'password', 'token') from being logged.
