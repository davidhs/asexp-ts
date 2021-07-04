// Git repository: <https://github.com/davidhs/asexp-ts>

/**
 * 
 */
export type Token = {
  lexeme: string,
  index: number,
  length: number,
  lineIndex: number,
  columnIndex: number
};

export type ASExpressionAtom = string;
export type ASExpressionList = ASExpression[];
export type ASExpression = ASExpressionAtom | ASExpressionList;

const ws = /\s/;

const STATE_NORMAL = 1;
const STATE_COMMENT = 2;
const STATE_STRING = 3;

type TokenizationState 
  = typeof STATE_NORMAL
  | typeof STATE_COMMENT
  | typeof STATE_STRING
  ;


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
 * Creates a new token
 * 
 * @param code 
 * @param token_code_index 
 * @param token_length 
 * @param token_line_index 
 * @param token_column_index 
 * @returns 
 */
function createToken(
  code: string,
  token_code_index: number,
  token_length: number,
  token_line_index: number,
  token_column_index: number
): Token {
  const token: Token = {
    lexeme: code.substring(token_code_index, token_code_index + token_length),
    index: token_code_index,
    length: token_length,
    lineIndex: token_line_index,
    columnIndex: token_column_index,
  };
  
  return token;
}


/**
 * 
 * @param code 
 * 
 * @throws
 */
function tokenize(code: string): Token[] {
  const code_length = code.length;
  
  let code_index = 0;
  let code_line_index = 0;
  let code_column_index = 0;
  
  const tokens: Token[] = [];

  let token_index = -1;
  let token_length = -1;
  let token_line_index = -1;
  let token_column_index = -1;
  
  /**
   * Starts a new empty token.
   * 
   * @param index 
   * @param length 
   * @param lineIndex 
   * @param columnIndex 
   */
  function startToken(): void {
    token_index = code_index;
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
   * Check if we're currently working on a token.
   * 
   * @returns 
   */
  function hasToken(): boolean {
    return token_index >= 0;
  }
  
  /**
   * "Flush" to create a token and return the token.  Data
   * about creating a token is reset.
   * 
   * @returns 
   */
  function flushToken(): Token {
    const token = createToken(
      code,
      token_index,
      token_length,
      token_line_index,
      token_column_index
    );
    
    // Reset token
    token_index = -1;
    token_length = -1;
    token_line_index = -1;
    token_column_index = -1;
    
    return token;
  }

  let state: TokenizationState = STATE_NORMAL;

  let pc = ""; // Previous character.
  let cc = ""; // Current character.

  while (code_index < code_length) {
    cc = code[code_index];

    if (state === STATE_NORMAL) {
      if (cc === ";") {
        if (hasToken()) {
          tokens.push(flushToken());
        }

        state = STATE_COMMENT;
      } else if (cc.match(ws) !== null) {
        if (hasToken()) {
          tokens.push(flushToken());
        }
      } else if (cc === "(" || cc === ")") {
        if (hasToken()) {
          tokens.push(flushToken());
        }
        
        // Start a new token for delimiter and flush it.
        startToken();
        extendToken();
        
        tokens.push(flushToken());
      } else if (cc === "\"") {
        if (hasToken()) {
          tokens.push(flushToken());
        }
        
        startToken();
        extendToken();

        state = STATE_STRING;
      } else {
        if (!hasToken()) {
          // Start new token
          startToken();
        }
        
        extendToken();
      }
    } else if (state === STATE_COMMENT) {
      if (cc === "\n") {
        state = STATE_NORMAL;
      }
    } else if (state === STATE_STRING) {
      extendToken();
      
      if (pc !== "\\" && cc === "\"") {
        tokens.push(flushToken());
        
        state = STATE_NORMAL;
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
    
    code_index += 1;
  }

  if (hasToken()) {
    if (state === STATE_STRING) {
      // If we're in a partial string, throw error.
      throw new SyntaxError(
        createErrorMessage(
          code,
          flushToken(),
          `unclosed string`
        ));
    }
    else {
      // If we're add end of code, add token to tokens.
      tokens.push(flushToken());
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
export function parse(code: string): ASExpressionList {
  const tokens = tokenize(code);
  
  // We use this stack when we're constructing the parse tree.
  const stack: ASExpression[][] = [[]];

  const list_delim_stack: Token[] = [];
  
  for (const token of tokens) {
    if (token.lexeme === "(") {
      list_delim_stack.push(token);
      stack.push([]);
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
      
      list_delim_stack.pop();
      const level = stack.pop() as ASExpressionList;
      stack[stack.length - 1].push(level);
    } else {
      stack[stack.length - 1].push(token.lexeme);
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
  
  const as_expressions: ASExpressionList = stack.pop() as ASExpressionList;

  return as_expressions;
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
