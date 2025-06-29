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

# 4. Core Functionality (as previously identified):

- Intelligent Log Insertion:
  - Insert Contextual `console.log`: Inserts a console.log statement with contextual information (e.g., filename, function name).
  - Wrap in `console.log`: Wraps selected code in a console.log statement.
  - Clean Contextual Logs: Removes logs previously inserted by the extension using a configurable logTag.
  - Insert for File: Inserts contextual logs for an entire file, identifying functions and components.
- Toggle Logging: Enables/disables log insertion via a status bar item.
- Customization & Configuration: Extensive settings for log output, including logTemplate, logLevel, logFunction, logItems, addDebugger, enableClassMethodLogging, enableHookLogging,
  logTag, wrapInDevCheck, showPreview, enableTelemetry, enableReduxContextLogging, customLoggerImportStatement, sensitiveKeys, ignore, filterUnusedVariables, and
  enableDuplicatePrevention.
- Keybinding: ctrl+shift+l for quick log insertion.

Enhanced/Internal Features (discovered through full code review):

- Advanced Code Parsing (`src/parser.ts`):
  - Uses @babel/parser and @babel/traverse for robust AST (Abstract Syntax Tree) parsing of JavaScript/TypeScript code, including JSX.
  - Context-Aware Logging: Identifies various code contexts:
    - Function/Component Detection: Accurately determines function and React component boundaries.
    - Variable Extraction: Extracts props, state, refs, context, reducers, locals, and args from the current scope.
    - Redux/Context Logging: Specifically handles useSelector and useContext to log their values if enableReduxContextLogging is true.
    - Class Method Logging: Extracts this.props and this.state for class components if enableClassMethodLogging is true.
    - Hook Logging: Identifies variables within useEffect, useMemo, and useCallback dependencies if enableHookLogging is true.
  - Smart Suggestions: Provides intelligent suggestions for variables to log based on the cursor's immediate vicinity (e.g., variables in return statements, assignment expressions, or
    function arguments).
  - Parent Context Linking: Can identify and link parent function/component contexts, allowing for logging of variables from outer scopes.
  - Unused Variable Filtering: Filters out variables that are not referenced in the code if filterUnusedVariables is true.
  - Sensitive Key Filtering: Prevents logging of variables matching a configurable list of sensitiveKeys (e.g., password, token).
- Intelligent Log Generation (`src/logGenerator.ts`):
  - Dynamically constructs console.log statements based on the extracted code context and user configurations.
  - Handles different log levels (log, warn, debug, info, customMethod).
  - Supports custom log functions (e.g., myLogger.log instead of console.log).
  - Can wrap logs in if (process.env.NODE_ENV !== 'production') checks.
  - Inserts debugger; statements if configured.
- User Interaction (`src/quickPick.ts`):
  - Presents a Quick Pick menu to the user, allowing them to select specific variables to include in the log statement. This includes variables from the current scope and parent scopes.
- File System & Ignore Patterns (`src/commands.ts`):
  - Respects .eslintignore and .prettierignore files, as well as a custom ignore setting, to prevent log insertion in ignored files.
  - Handles adding custom logger import statements at the top of the file if configured.
- Preview Mode (`src/commands.ts`):
  - Offers a preview of the changes before applying them, using VS Code's built-in diff view, if showPreview is enabled.
- Duplicate Log Prevention (`src/commands.ts`):
  - Intelligently checks for and skips the insertion of duplicate log statements if enableDuplicatePrevention is true.
- Robust Logging & Telemetry (`src/logger.ts`):
  - Provides internal logging for the extension's operations (info, log, warn, error) to an output channel.
  - Includes a placeholder for telemetry reporting (though currently commented out, it indicates an intention for anonymous usage data collection if enableTelemetry is true).

In essence, the extension is far more sophisticated than just a simple log inserter. It performs deep code analysis to provide highly contextual and customizable logging, aiming to
streamline the debugging workflow for developers.
