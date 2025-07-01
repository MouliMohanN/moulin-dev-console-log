# Contextual Console Log

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

### Cleaning Up Logs

Easily remove all logs inserted by the extension using a single command.

- **Scenario**: You've finished debugging and want to remove all `console.log` statements added by the extension.
- **Action**: Run the `Clean Logs` command from the VS Code Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).

### Bulk Logging for File Analysis

Insert logs throughout an entire file to get a comprehensive overview of execution flow.

- **Scenario**: You're trying to understand a new or complex file and want to log all function and component entries.
- **Action**: Run the `Insert logs throughout the entire file` command from the VS Code Command Palette.

## Configuration

Customize the extension by editing the VS Code settings (`settings.json`). Below are usage examples for each configuration option.

### Customizing Log Template

Change the format of the log message prefix.

- **Scenario**: You want your logs to show only the function name.
- **Action**: Configure `contextualConsoleLog.logTemplate` in your `settings.json`.

```json
{
  "contextualConsoleLog.logTemplate": "[${functionName}]"
}
```

- **Before**:

```javascript
function greet(name) {
  // Cursor is here
  return `Hello, ${name}!`;
}
```

- **After**:

```javascript
function greet(name) {
  console.log('[greet]', { name });
  return `Hello, ${name}!`;
}
```

### Changing Log Level

Use different console methods like `warn`, `error`, or `info`.

- **Scenario**: You want your logs to appear as warnings in the console.
- **Action**: Configure `contextualConsoleLog.logLevel` in your `settings.json`.

```json
{
  "contextualConsoleLog.logLevel": "warn"
}
```

- **Before**:

```javascript
function processWarning(message) {
  // Cursor is here
  console.log(message);
}
```

- **After**:

```javascript
function processWarning(message) {
  console.warn('[script.js > processWarning]', { message });
  console.log(message);
}
```

### Using a Custom Logger

Integrate with your existing logging library instead of the default `console`.

- **Scenario**: Your project uses a custom logger, e.g., `myLogger`, and you want the extension to use it.
- **Action**: Configure `contextualConsoleLog.logFunction` and `contextualConsoleLog.customLoggerImportStatement` in your `settings.json`.

```json
{
  "contextualConsoleLog.logFunction": "myLogger",
  "contextualConsoleLog.customLoggerImportStatement": "import myLogger from '@/utils/myLogger';"
}
```

- **Before**:

```javascript
// myFile.js
function processData(data) {
  // Cursor is here
  return data.length;
}
```

- **After**:

```javascript
// myFile.js
import myLogger from '@/utils/myLogger'; // Added automatically if not present

function processData(data) {
  myLogger.log('[myFile.js > processData]', { data });
  return data.length;
}
```

### Including Specific Log Items

Control which types of variables (props, state, locals, etc.) are included in the log.

- **Scenario**: You only want to log `props` and `locals` in your React components.
- **Action**: Configure `contextualConsoleLog.logItems` in your `settings.json`.

```json
{
  "contextualConsoleLog.logItems": ["props", "locals"]
}
```

- **Before**:

```jsx
function MyComponent({ prop1 }) {
  const local1 = 'value';
  // Cursor is here
  return <div>{prop1}</div>;
}
```

- **After**:

```jsx
function MyComponent({ prop1 }) {
  const local1 = 'value';
  console.log('[MyComponent.jsx > MyComponent]', { props: { prop1 }, locals: { local1 } });
  return <div>{prop1}</div>;
}
```

### Adding a Debugger Statement

Automatically insert a `debugger;` statement before the log line for easy breakpoint debugging.

- **Scenario**: You want to pause execution at the log point to inspect variables in your browser's developer tools.
- **Action**: Configure `contextualConsoleLog.addDebugger` in your `settings.json`.

```json
{
  "contextualConsoleLog.addDebugger": true
}
```

- **Before**:

```javascript
function calculate(a, b) {
  // Cursor is here
  return a + b;
}
```

- **After**:

```javascript
function calculate(a, b) {
  debugger;
  console.log('[script.js > calculate]', { a, b });
  return a + b;
}
```

### Wrapping Logs in Development Check

Ensure logs only appear in development environments, keeping production bundles clean.

- **Scenario**: You want to prevent `console.log` statements from appearing in your production build.
- **Action**: Configure `contextualConsoleLog.wrapInDevCheck` in your `settings.json`.

```json
{
  "contextualConsoleLog.wrapInDevCheck": true
}
```

- **Before**:

```javascript
function fetchData() {
  // Cursor is here
  return 'data';
}
```

- **After**:

```javascript
function fetchData() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[script.js > fetchData]', {});
  }
  return 'data';
}
```

### Customizing Log Tag for Cleanup

Define a unique comment tag to identify and clean up logs inserted by the extension.

- **Scenario**: You want to use a specific tag, e.g., `// MY_APP_LOG`, for logs inserted by the extension, so you can easily clean them up later.
- **Action**: Configure `contextualConsoleLog.logTag` in your `settings.json`.

```json
{
  "contextualConsoleLog.logTag": "// MY_APP_LOG"
}
```

- **Before**:

```javascript
function processItem(item) {
  // Cursor is here
  return item;
}
```

- **After**:

```javascript
function processItem(item) {
  console.log('[script.js > processItem]', { item }); // MY_APP_LOG
  return item;
}
```

### Excluding Sensitive Data

Prevent specific variable names from being logged to avoid exposing sensitive information.

- **Scenario**: You have variables like `password` or `token` that you never want to appear in logs.
- **Action**: Configure `contextualConsoleLog.sensitiveKeys` in your `settings.json`.

```json
{
  "contextualConsoleLog.sensitiveKeys": ["password", "token", "secret"]
}
```

- **Before**:

```javascript
function login(username, password) {
  // Cursor is here
  return { username, password };
}
```

- **After**:

```javascript
function login(username, password) {
  console.log('[script.js > login]', { username }); // 'password' is excluded
  return { username, password };
}
```

### Enabling Class Method Logging

Allow logging inside class component methods, including `this.props` and `this.state`.

- **Scenario**: You are working with legacy React class components and need to log their internal state or props.
- **Action**: Configure `contextualConsoleLog.enableClassMethodLogging` in your `settings.json`.

```json
{
  "contextualConsoleLog.enableClassMethodLogging": true
}
```

- **Before**:

```javascript
class MyClassComponent extends React.Component {
  render() {
    // Cursor is here
    return <div>{this.props.data}</div>;
  }
}
```

- **After**:

```javascript
class MyClassComponent extends React.Component {
  render() {
    console.log('[MyClassComponent.jsx > MyClassComponent]', { props: { data: this.props.data }, state: this.state });
    return <div>{this.props.data}</div>;
  }
}
```

### Enabling Hook Logging

Log variables within React hooks like `useEffect`, `useMemo`, and `useCallback`.

- **Scenario**: You want to inspect the dependencies or internal variables of your React hooks.
- **Action**: Configure `contextualConsoleLog.enableHookLogging` in your `settings.json`.

```json
{
  "contextualConsoleLog.enableHookLogging": true
}
```

- **Before**:

```javascript
function MyHookComponent() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Cursor is here
    console.log('Count changed');
  }, [count]);
  return <div>{count}</div>;
}
```

- **After**:

```javascript
function MyHookComponent() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    console.log('[MyHookComponent.jsx > useEffect]', { count });
    console.log('Count changed');
  }, [count]);
  return <div>{count}</div>;
}
```

### Enabling Redux/Context Logging

Log values from Redux stores (via `useSelector`) or React Context (via `useContext`).

- **Scenario**: You want to see the values retrieved from your Redux store or a React Context.
- **Action**: Configure `contextualConsoleLog.enableReduxContextLogging` in your `settings.json`.

```json
{
  "contextualConsoleLog.enableReduxContextLogging": true
}
```

- **Before**:

```javascript
import { useSelector } from 'react-redux';
import { MyContext } from './MyContext';

function MyReduxComponent() {
  const user = useSelector((state) => state.user);
  const theme = useContext(MyContext);
  // Cursor is here
  return (
    <div>
      {user.name} - {theme}
    </div>
  );
}
```

- **After**:

```javascript
import { useSelector } from 'react-redux';
import { MyContext } from './MyContext';

function MyReduxComponent() {
  const user = useSelector((state) => state.user);
  const theme = useContext(MyContext);
  console.log('[MyReduxComponent.jsx > MyReduxComponent]', { reduxContext: { user }, context: { theme } });
  return (
    <div>
      {user.name} - {theme}
    </div>
  );
}
```

### Ignoring Files and Folders

Prevent log insertion in specific files or directories using glob patterns.

- **Scenario**: You want to exclude logs from your `utils` folder and all `.test.js` files.
- **Action**: Configure `contextualConsoleLog.ignore` in your `settings.json`.

```json
{
  "contextualConsoleLog.ignore": ["**/utils/**", "**/*.test.js"]
}
```

### Filtering Unused Variables

Reduce log clutter by automatically excluding variables that are not referenced in the code.

- **Scenario**: You want your logs to be as clean as possible, showing only variables that are actually used.
- **Action**: Configure `contextualConsoleLog.filterUnusedVariables` in your `settings.json`.

```json
{
  "contextualConsoleLog.filterUnusedVariables": true
}
```

- **Before**:

```javascript
function processData(data) {
  const unusedVar = 123; // This variable is not used
  const usedVar = data + 1;
  // Cursor is here
  return usedVar;
}
```

- **After**:

```javascript
function processData(data) {
  const unusedVar = 123;
  const usedVar = data + 1;
  console.log('[script.js > processData]', { data, usedVar }); // 'unusedVar' is filtered out
  return usedVar;
}
```

### Preventing Duplicate Logs

Avoid inserting a log statement if a similar one already exists nearby.

- **Scenario**: You accidentally trigger the log insertion command multiple times in the same location, and you want to avoid redundant logs.
- **Action**: Configure `contextualConsoleLog.enableDuplicatePrevention` in your `settings.json`.

```json
{
  "contextualConsoleLog.enableDuplicatePrevention": true
}
```

- **Before**:

```javascript
function calculate(a, b) {
  console.log('[script.js > calculate]', { a, b });
  // Cursor is here, and you trigger the command again
  return a + b;
}
```

- **After**: (No change, as the duplicate log is prevented)

```javascript
function calculate(a, b) {
  console.log('[script.js > calculate]', { a, b });
  return a + b;
}
```

### Including Line Number in Log Message

Add the line number to the log message prefix for more precise debugging.

- **Scenario**: You want to quickly identify the exact line number of a log message in your console output.
- **Action**: Configure `contextualConsoleLog.includeLineNumber` in your `settings.json`.

```json
{
  "contextualConsoleLog.includeLineNumber": true
}
```

- **Before**:

```javascript
function debugMe() {
  // Cursor is here (e.g., line 5)
  return 'done';
}
```

- **After**:

```javascript
function debugMe() {
  console.log('[script.js > debugMe > line: 5]', {});
  return 'done';
}
```

## Default Configuration

Here are the default values for all configuration options, as defined in `package.json`:

```json
{
  "contextualConsoleLog.logTemplate": "[${fileName} > ${functionName}]",
  "contextualConsoleLog.includeLineNumber": false,
  "contextualConsoleLog.logLevel": "log",
  "contextualConsoleLog.logFunction": "console",
  "contextualConsoleLog.logItems": ["props", "state", "refs", "context", "reducers", "locals", "args"],
  "contextualConsoleLog.addDebugger": false,
  "contextualConsoleLog.enableClassMethodLogging": true,
  "contextualConsoleLog.enableHookLogging": true,
  "contextualConsoleLog.logTag": "",
  "contextualConsoleLog.wrapInDevCheck": false,
  "contextualConsoleLog.enableContextLogging": true,
  "contextualConsoleLog.enableReduxContextLogging": false,
  "contextualConsoleLog.customLoggerImportStatement": "",
  "contextualConsoleLog.sensitiveKeys": ["password", "token", "secret", "api_key"],
  "contextualConsoleLog.ignore": [],
  "contextualConsoleLog.filterUnusedVariables": true,
  "contextualConsoleLog.enableDuplicatePrevention": true
}
```
