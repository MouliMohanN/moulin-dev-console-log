# Contextual Console Log

## Summary

Debugging can be a time-consuming process, especially when it involves manually inserting and removing `console.log` statements. This VS Code extension automates the generation of highly relevant and informative log statements, directly within your code, saving you time and reducing errors. It intelligently analyzes your code's context, from simple functions to complex React components, providing immediate insights to help you debug faster.

## Features

- **Deep Contextual Analysis**: Leverages Abstract Syntax Trees (ASTs) to understand your code's structure. It accurately identifies function arguments, React props, state variables (from `useState`), and refs (from `useRef`), generating logs that are incredibly insightful and tailored to your code.

- **Intelligent Log Generation**: Automatically formats logs for maximum readability. Each log includes the filename and the name of the function or component, ensuring you always know the exact origin of a log message in your console.

- **React and Hooks Support**: Built with modern web development in mind, it offers first-class support for React. It correctly identifies and logs props, state, refs, and variables from `useContext` and `useReducer`. It also intelligently logs the `.current` value of a ref and ignores `setState` functions.

- **Full Customization**: Highly configurable to fit your team's coding style. Control everything from the log message prefix to the logging function itself. Integrate with your existing logging setup to maintain consistency across your project.

- **Effortless Cleanup**: Say goodbye to manually removing `console.log` statements before commits. The extension can tag every log it creates with a unique comment. A single command, `Clean Logs`, will then instantly remove all of these tagged logs from a file, keeping your production code clean.

- **Bulk Logging**: When exploring new files or complex flows, use the `Insert Logs for File` command to automatically inject contextual logs into every function and component in the file, providing a comprehensive execution trace.

## Installation

1.  Open VS Code.
2.  Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3.  Search for "Contextual Console Log".
4.  Click "Install".

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
| `contextualConsoleLog.logTemplate`                 | A template string for the log message prefix. Available variables: `${fileName}`, `${functionName}`, `${lineNumber}`.                                        | `"[${fileName} > ${functionName}]"`                           |
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
| `contextualConsoleLog.ignore`                      | An array of glob patterns for files/folders to ignore. This is in addition to `.eslintignore` and `.prettierignore`.                                         | `[]`                                                          |
| `contextualConsoleLog.filterUnusedVariables`       | If true, filters out unused variables from the log suggestions to reduce clutter.                                                                            | `true`                                                        |
| `contextualConsoleLog.enableDuplicatePrevention`   | If true, prevents the extension from inserting a log statement if a similar one already exists.                                                              | `true`                                                        |
| `contextualConsoleLog.includeLineNumber`           | If true, includes the line number in the log message.                                                                                                        | `false`                                                       |
