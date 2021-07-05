// Git repository: <https://github.com/davidhs/asexp-ts>

export type NodeTypeLeaf = 0 | 1 | 2 | 3 | 4;
export type NodeTypeList = 5;
export type NodeType = NodeTypeLeaf | NodeTypeList;

export type Token = {
  type: NodeTypeLeaf,
  lexeme: string,
  index: number,
  length: number,
  lineIndex: number,
  columnIndex: number
};

// export type ASExpressionAtom = Token;
// export type ASExpressionList = ASExpression[];
// export type ASExpression = ASExpressionAtom | ASExpressionList;

export type ParseNodeAtom = Token;
export type ParseNodeList = {
  type: 5,
  list: ParseNode[],
}
export type ParseNode = ParseNodeAtom | ParseNodeList;

export type TokenizeOptions = { whitespace?: boolean, comment?: boolean };
export type ParseOptions = {
  whitespace?: boolean,
  comment?: boolean,
  delimiter?: boolean
};

type TokenizationState = 1 | 2 | 3 | 4;



export const NODE_TYPE_SYMBOL: NodeTypeLeaf = 0;
export const NODE_TYPE_COMMENT: NodeTypeLeaf = 1;
export const NODE_TYPE_STRING: NodeTypeLeaf = 2;
export const NODE_TYPE_DELIM: NodeTypeLeaf = 3;
export const NODE_TYPE_WS: NodeTypeLeaf = 4;
export const NODE_TYPE_LIST: NodeTypeList = 5;

const regex_ws = /\s/;

const STATE_NEW: TokenizationState = 1;
const STATE_COMMENT: TokenizationState = 2;
const STATE_STRING: TokenizationState = 3;
const STATE_WS: TokenizationState = 4;


function assert(condition: unknown, message = ""): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

/**
 * Create error message
 * 
 * @param code
 * @param token
 * @param message
 */
function createErrorMessage(code: string, token: Token | null, message = "") {
  // NOTE(Davíð): it's OK that this code is not performant.  This code doesn't run often,
  //              and should cause an error if invoked.
  
  if (token === null) {
    return message;
  }

  const line_index = token.lineIndex;
  const column_index = token.columnIndex;

  // TODO: is "\n" the only symbol of new line?
  const lines = code.split("\n");

  const line = lines[line_index];

  const msg: string[] = [];

  const line_number = line_index + 1;

  const sub_gutter_1 = `${line_number}`;
  const gutter_1 = ` ${sub_gutter_1} | `;

  const sub_gutter_2 = " ".repeat(sub_gutter_1.length);
  const gutter_2 = ` ${sub_gutter_2} | `;

  msg.push(`\n`);
  msg.push(`\n`);
  msg.push(`${gutter_1}${line}`);
  msg.push(`\n`);
  msg.push(`${gutter_2}${" ".repeat(column_index)}^`);
  msg.push(`\n`);
  msg.push(`${gutter_2}${" ".repeat(column_index)}'- ${message}`);
  msg.push(`\n`);

  return msg.join("");
}

/**
 * 
 * @param code 
 * @param index 
 */
function getLineAndColumnIndexInCode(code: string, index: number) {
  let lineIndex = 0;
  let columnIndex = 0;
  
  // TODO: optimize this code at some point.
  
  for (let i = 0; i < code.length; i += 1) {
    const c = code[i];
    
    if (c === "\n") {
      lineIndex += 1;
      columnIndex = 0;
    } else {
      columnIndex += 1;
    }
    
    if (i === index) {
      break;
    }
  }
  
  return { lineIndex, columnIndex };
}

/**
 * 
 * @param code 
 * @param index 
 */
function pointInCode(code: string, index: number) {
  const { lineIndex, columnIndex } = getLineAndColumnIndexInCode(code, index);

  const lines = code.split("\n");

  const line = lines[lineIndex];

  const msg: string[] = [];

  const line_number = lineIndex + 1;

  const sub_gutter_1 = `${line_number}`;
  const gutter_1 = ` ${sub_gutter_1} | `;

  const sub_gutter_2 = " ".repeat(sub_gutter_1.length);
  const gutter_2 = ` ${sub_gutter_2} | `;

  msg.push(`\n`);
  msg.push(`\n`);
  msg.push(`${gutter_1}${line}`);
  msg.push(`\n`);
  msg.push(`${gutter_2}${" ".repeat(columnIndex)}^`);
  //msg.push(`\n`);
  //msg.push(`${gutter_2}${" ".repeat(column_index)}'- ${message}`);
  msg.push(`\n`);

  return msg.join("");
}


/**
 * 
 * @param code 
 * 
 * @throws
 */
export function tokenize(code: string, options: TokenizeOptions = {}): Token[] {
  const code_length = code.length;
  
  let code_index = 0;
  let code_line_index = 0;
  let code_column_index = 0;
  
  const tokens: Token[] = [];

  let token_type: NodeTypeLeaf = NODE_TYPE_COMMENT;
  let token_index = -1;
  let token_length = -1;
  let token_line_index = -1;
  let token_column_index = -1;

  let state: TokenizationState = STATE_NEW;
  
  let pc = ""; // Previous character.
  let cc = ""; // Current character.
  
  let deciding = true; // Whether through "state machine".
  
  let includeWhitespace = false;
  let includeComment = false;
  
  if (options.whitespace === true) includeWhitespace = true;
  if (options.comment === true) includeComment = true;
  
  /**
   * Creates a new token from the work-in-progress token.
   * 
   * @returns 
   */
  function createToken(): Token {
    const token: Token = {
      lexeme: code.substring(token_index, token_index + token_length),
      type: token_type,
      index: token_index,
      length: token_length,
      lineIndex: token_line_index,
      columnIndex: token_column_index,
    };
    
    return token;
  }
  
  /**
   * Starts a new empty work-in-progress token.
   * 
   * @param type 
   */
  function startToken(type: NodeTypeLeaf): void {
    token_index = code_index;
    token_type = type;
    token_length = 0;
    token_line_index = code_line_index;
    token_column_index = code_column_index;
  }
  
  /**
   * Extend current token to include next character
   */
  function extendToken(): void {
    token_length += 1;
  }
  
  /**
   * Check if we're currently working on a work-in-progress token.
   * 
   * @returns 
   */
  function hasToken(): boolean {
    return token_index >= 0;
  }
  
  /**
   * Resets the current work-in-progress token.
   */
  function resetToken(): void {
    token_type = NODE_TYPE_COMMENT;
    token_index = -1;
    token_length = -1;
    token_line_index = -1;
    token_column_index = -1;
  }
  
  /**
   * Completes the work-in-progress token.  A token is created and returned
   * and the work-in-progress token is reset.  
   * 
   * @returns 
   */
  function completeToken(): Token {
    const token = createToken();
    
    resetToken();
    
    return token;
  }
  
  /**
   * Completes a token, pushes onto the token stack, and returns the
   * token.
   * 
   * @returns 
   */
  function flushToken(): Token {
    const token = completeToken();
    
    if (token.type === NODE_TYPE_WS) {
      if (includeWhitespace) tokens.push(token);
    } 
    else if (token.type === NODE_TYPE_COMMENT) {
      if (includeComment) tokens.push(token);
    } else {
      tokens.push(token);
    }
    
    return token;
  }
  
  /**
   * Set the state of the state machine.
   * 
   * @param nextState 
   */
  function setNextState(nextState: TokenizationState) {
    state = nextState;
  }
  
  /**
   * Conclude decision on what to do given the character
   * that we've just seen and continue.
   */
  function conclude() {
    deciding = false;
  }
  
  /**
   * Checks if character is whitespace
   * 
   * @param c 
   */
  function isWhitespace(c: string) {
    return c.match(regex_ws) !== null;
  }

  // Walk over code
  while (code_index < code_length) {
    cc = code[code_index];
    
    // Decide what action to do or what state to transition to.
    deciding = true;
    
    // Loop while we're deciding.
    while (deciding) {
      switch (state) {
        case STATE_NEW:
          // Comment
          if (cc === ";") {
            if (hasToken()) flushToken();
            startToken(NODE_TYPE_COMMENT);
            extendToken();
            setNextState(STATE_COMMENT);
            conclude();
          }
          // Whitespace
          else if (isWhitespace(cc)) {
            if (hasToken()) flushToken();
            startToken(NODE_TYPE_WS);
            extendToken();
            setNextState(STATE_WS);
            conclude();
          }
          // Delimiter
          else if (cc === "(" || cc === ")") {
            if (hasToken()) flushToken();
            startToken(NODE_TYPE_DELIM);
            extendToken();
            flushToken();
            conclude();
          }
          // String
          else if (cc === "\"") {
            if (hasToken()) flushToken();
            startToken(NODE_TYPE_STRING);
            extendToken();
            setNextState(STATE_STRING);
            conclude();
          }
          // Symbol
          else {
            if (!hasToken()) startToken(NODE_TYPE_SYMBOL);
            extendToken();
            conclude();
          }
          
          break;
        case STATE_COMMENT:
          extendToken();
          conclude();
          
          if (cc === "\n") {
            flushToken();
            setNextState(STATE_NEW);
          }
          
          break;
        case STATE_STRING:
          extendToken();
      
          if (pc !== "\\" && cc === "\"") {
            flushToken();
            setNextState(STATE_NEW);
          }
          
          conclude();
          
          break;
        case STATE_WS:
          if (isWhitespace(cc)) {
            extendToken();
            conclude();
          } else {
            flushToken();
            setNextState(STATE_NEW);
          }
          
          break;
        default:
          throw new Error("Should not happen.");
      }
    }

    // Update column and line index.
    if (cc === "\n") {
      code_line_index += 1;
      code_column_index = 0;
    } else {
      code_column_index += 1;
    }

    // Have previous copy current character to compare in
    // next iteration.
    pc = cc;
    
    // Increment
    code_index += 1;
  }

  // See if we have a work-in-progress token that we need to deal with.
  
  if (hasToken()) {
    if (state === STATE_STRING) {
      // If we're in a partial string, throw error.
      throw new SyntaxError(
        createErrorMessage(
          code,
          completeToken(),
          `unclosed string`
        ));
    }
    else {
      // If we're add end of code, add token to tokens.
      flushToken();
    }
  }

  return tokens;
}

/**
 * Parses code into a list of abbreviated s-expressions.
 * 
 * @param code 
 * @throws
 */
export function parse(code: string, options: ParseOptions = {}): ParseNode[] {
  let includeWhitespace = false;
  let includeComment = false;
  let includeDelimiter = false;
  
  if (options.whitespace === true) includeWhitespace = true;
  if (options.comment === true) includeComment = true;
  if (options.delimiter === true) includeDelimiter = true;
  
  const tokens = tokenize(code, { whitespace: includeWhitespace, comment: includeComment });
  
  // We use this stack when we're constructing the parse tree.
  const stack: ParseNode[][] = [[]];

  // To keep track of delimiters in case of error.
  const list_delim_stack: Token[] = [];
  
  for (const token of tokens) {
    if (token.lexeme === "(") {
      
      list_delim_stack.push(token);
      stack.push([]);
      if (includeDelimiter) stack[stack.length - 1].push(token);
    } else if (token.lexeme === ")") {
      if (stack.length === 1) {
        throw new SyntaxError(
          createErrorMessage(
            code,
            token,
            `unexpected closing delimiter`
          )
        );
      }
      
      if (includeDelimiter) stack[stack.length - 1].push(token);
      
      list_delim_stack.pop();
      const level = stack.pop();
      
      assert(typeof level !== "undefined");
      
      
      
      const list: ParseNodeList = {
        type: NODE_TYPE_LIST,
        list: level
      };
      stack[stack.length - 1].push(list);
    } else {
      stack[stack.length - 1].push(token);
    }
  }

  if (stack.length !== 1) {
    throw new SyntaxError(
      createErrorMessage(
        code,
        list_delim_stack[list_delim_stack.length - 1],
        `needs a matching closing delimiter`
      )
    );
  }
  
  const parse_nodes = stack.pop();
  
  assert(typeof parse_nodes !== "undefined");

  return parse_nodes;
}

export function test() {
  function assert(condition: unknown, message = ""): asserts condition {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
  
  /**
   * 
   * @param fn 
   */
  function wrapFnExpectError(fn: () => void) {
    return () => {
      let ok = true;
      try {
        fn();
        ok = false;
      } catch (e) {}
      
      if (!ok) {
        throw new Error(`Error`);
      }
    };
  }
  
  const tests = [
    () => {
      const t = tokenize("()");
      
      assert(t[0].lexeme === "(");
      assert(t[0].type === NODE_TYPE_DELIM);
      assert(t[1].lexeme === ")");
      assert(t[1].type === NODE_TYPE_DELIM);
    },
    // Test unclosed string
    wrapFnExpectError(() => {
      tokenize(String.raw`"abc`);
    }),
    // Test unexpected closing delimiter
    wrapFnExpectError(() => {
      parse(")");
    }),
    // Test needs a matching closing delimiter
    wrapFnExpectError(() => {
      parse("(");
    }),
    // Nesting test
    () => {
      const code = String.raw`
        a b
        ( c d )
        e f
      `;
      
      const p: any = parse(code);
      
      assert(p.length === 5);
      assert(Array.isArray(p[2].list));
      assert(p[2].list.length === 2);
      
      assert(p[0].lexeme === "a");
      assert(p[1].lexeme === "b");
      assert(p[2].list[0].lexeme === "c");
      assert(p[2].list[1].lexeme === "d");
      assert(p[3].lexeme === "e");
      assert(p[4].lexeme === "f");
    },
    // all test
    () => {
      const code = String.raw`
        1; hello
        2 ;"world
        3
      `;
      
      const p: any = parse(code);
      
      assert(p.length === 3);
      assert(p[0].lexeme === "1");
      assert(p[1].lexeme === "2");
      assert(p[2].lexeme === "3");
    },
    // TODO: write more tests
  ];
  
  const n = tests.length;
  
  for (let i = 0; i < n; i += 1) {
    const test = tests[i];
    
    try {
      test();
      console.info(`Success (${i + 1} of ${n})`);
    } catch (e) {
      console.info(`Error (${i + 1} of ${n}):`, e);
    }
  }
}
