- Core Functionality: The main purpose is to intelligently add console.log statements. When you run the
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
