# Contextual Console Log

Debugging is a core part of development, but manually writing `console.log` statements is tedious and error-prone. You have to find the right place to log, figure out which variables are in scope, and then clean them all up afterward. This extension automates that entire process.

Contextual Console Log is a powerful VS Code tool that acts as your debugging assistant. It intelligently analyzes your code in real-time to generate highly relevant and informative log statements exactly where you need them. Whether you're working with simple functions, complex React components, or legacy class-based code, this extension provides the context you need to find and fix bugs faster.

## Features

- **Deep Contextual Analysis**: This is the core of the extension. It doesn't just find variables; it understands your code's structure using Abstract Syntax Trees (ASTs). It knows the difference between a function's arguments, a React component's props, state variables from the `useState` hook, and refs from `useRef`. This deep analysis results in logs that are incredibly insightful.

- **Smart Suggestions**: The extension is intelligent about which variables to log. It analyzes the code at your cursor's position and provides suggestions for the most relevant variables. For example, it will prioritize variables found within a `return` statement or in the same line of code, assuming those are the most likely candidates for debugging.

- **Intelligent Log Generation**: The extension automatically formats logs to be as readable as possible. It includes the filename and the name of the function or component, so you always know the exact origin of a log message in your console.

- **React and Hooks Support**: Built with modern web development in mind, it has first-class support for React. It correctly identifies and logs props, state, refs, context from `useContext`, and state/dispatch from `useReducer`. It's also smart enough to log the `.current` value of a ref and to ignore `setState` functions.

- **Full Customization**: Every developer and team has their own style. The extension is highly configurable, allowing you to control everything from the log message prefix to the logging function itself. You can make it work with your existing logger (like MyLogger or AppLogger) and enforce a consistent style across your project.

- **Effortless Cleanup**: Forget hunting for `console.log` statements before a commit. The extension can tag every log it creates with a unique comment. A single command, `Clean Logs`, will then instantly remove all of these tagged logs from a file, ensuring your production code stays clean.

- **Bulk Logging**: When you're new to a file or trying to understand a complex flow, you can use the `Insert Logs for File` command to automatically inject a contextual log into every function and component in the file, giving you a complete execution trace.

## Usage Examples

### Your First Log: A Simple Function

This shows the basic functionality of inserting a log into a standard JavaScript function.

- **Scenario**: You want to see the values of the arguments and local variables inside `calculateTotal`.
- **Action**: Place your cursor inside the function and press `ctrl+shift+l`.

- **Before**:

  ```javascript
  function calculateTotal(price, quantity) {
    const tax = 0.08;
    // Cursor is here
    return price * quantity * (1 + tax);
  }
  ```

- **After**:
  ```javascript
  function calculateTotal(price, quantity) {
    const tax = 0.08;
    console.log('[script.js > calculateTotal]', { price, quantity, tax });
    return price * quantity * (1 + tax);
  }
  ```

### Advanced Usage: A React Component

Here, the extension demonstrates its understanding of React-specific hooks and props.

- **Scenario**: You need to debug a `UserProfile` component and want to inspect its props and internal state.
- **Action**: Place your cursor inside the component and trigger the `Insert Contextual Log` command.

- **Before**:

  ```jsx
  function UserProfile({ user }) {
    const [isActive, setIsActive] = useState(true);
    const profileRef = useRef(null);
    // Cursor is here
    return <div ref={profileRef}>{user.name}</div>;
  }
  ```

- **After**:
  ```jsx
  function UserProfile({ user }) {
    const [isActive, setIsActive] = useState(true);
    const profileRef = useRef(null);
    console.log('[UserProfile.jsx > UserProfile]', {
      props: { user },
      state: { isActive },
      refs: { profileRef: profileRef.current },
    });
    return <div ref={profileRef}>{user.name}</div>;
  }
  ```

## Configuration

Customize the extension by editing the VS Code settings (`settings.json`). Below is a complete list of all available options.

| Setting                                            | Description                                                                                                                                                  | Default Value                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `contextualConsoleLog.logTemplate`                 | A template string for the log message prefix. Available variables: `${fileName}`, `${functionName}`.                                                         | `"[${fileName} > ${functionName}]"`                           |
| `contextualConsoleLog.logLevel`                    | The console method to use (e.g., `log`, `warn`, `debug`, `info`).                                                                                            | `"log"`                                                       |
| `contextualConsoleLog.logFunction`                 | The logging object to call. Change this to use a custom logger like `MyLogger` or `AppLogger`.                                                               | `"console"`                                                   |
| `contextualConsoleLog.logItems`                    | An array of context items to automatically include in the log suggestions.                                                                                   | `["props", "state", "refs", "context", "reducers", "locals"]` |
| `contextualConsoleLog.addDebugger`                 | If true, inserts a `debugger;` statement before the log line for breakpoint debugging.                                                                       | `false`                                                       |
| `contextualConsoleLog.wrapInDevCheck`              | If true, wraps the log statement in an environment check (`if (process.env.NODE_ENV !== 'production') { ... }`).                                             | `false`                                                       |
| `contextualConsoleLog.logTag`                      | A comment tag to append to logs (e.g., `// @ccl-log`). This enables the `Clean Logs` command to find and remove them.                                        | `""`                                                          |
| `contextualConsoleLog.customLoggerImportStatement` | If you use a custom logger, specify the import statement here (e.g., `"import logger from '@/utils/logger';"`). It will be added to the file if not present. | `""`                                                          |
| `contextualConsoleLog.sensitiveKeys`               | An array of variable names to automatically exclude from logs to prevent leaking sensitive data.                                                             | `["password", "token", "secret", "api_key"]`                  |
| `contextualConsoleLog.enableClassMethodLogging`    | Set to `true` to enable logging inside class component methods (e.g., `this.props`, `this.state`).                                                           | `true`                                                        |
| `contextualConsoleLog.enableHookLogging`           | Set to `true` to enable logging for variables within React hooks like `useEffect`, `useMemo`, and `useCallback`.                                             | `true`                                                        |
| `contextualConsoleLog.enableReduxContextLogging`   | Set to `true` to enable logging for Redux/Context stores (e.g., `useSelector`, `useContext`).                                                                | `false`                                                       |
| `contextualConsoleLog.showPreview`                 | If true, shows a diff preview of the changes before inserting the log statement.                                                                             | `false`                                                       |
| `contextualConsoleLog.ignore`                      | An array of glob patterns for files/folders to ignore. This is in addition to `.eslintignore` and `.prettierignore`.                                         | `[]`                                                          |
| `contextualConsoleLog.filterUnusedVariables`       | If true, filters out unused variables from the log suggestions to reduce clutter.                                                                            | `true`                                                        |
| `contextualConsoleLog.enableDuplicatePrevention`   | If true, prevents the extension from inserting a log statement if a similar one already exists.                                                              | `true`                                                        |
| `contextualConsoleLog.enableTelemetry`             | Enable anonymous telemetry to help improve the extension.                                                                                                    | `true`                                                        |
