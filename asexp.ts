// Git repository: <https://github.com/davidhs/asexp-ts>

export type ParseNodeTypePrimitive = 0 | 1 | 2 | 3 | 4;
export type ParseNodeTypeList = 5;
export type ParseNodeType = ParseNodeTypePrimitive | ParseNodeTypeList;


/**
 * A.k.a. token.
 */
export type ParseNodePrimitive = {
  type: ParseNodeTypePrimitive,
  value: string,
  
  index: number,
  length: number,
  lineIndex: number,
  columnIndex: number
};

export type ParseNodeList = {
  type: ParseNodeTypeList,
  value: ParseNode[],
  
  index: number,
  length: number,
  lineIndex: number,
  columnIndex: number
};

export type ParseNode = ParseNodePrimitive | ParseNodeList;


export type TokenizeOptions = { whitespace?: boolean, comment?: boolean };
export type ParseOptions = { whitespace?: boolean, comment?: boolean, delimiter?: boolean };


type TokenizationState = 1 | 2 | 3 | 4;


export const PARSE_NODE_TYPE_SYMBOL: ParseNodeTypePrimitive = 0;
export const PARSE_NODE_TYPE_COMMENT: ParseNodeTypePrimitive = 1;
export const PARSE_NODE_TYPE_STRING: ParseNodeTypePrimitive = 2;
export const PARSE_NODE_TYPE_DELIMITER: ParseNodeTypePrimitive = 3;
export const PARSE_NODE_TYPE_WHITESPACE: ParseNodeTypePrimitive = 4;
export const PARSE_NODE_TYPE_LIST: ParseNodeTypeList = 5;

const regex_ws = /\s/;

const STATE_NEW: TokenizationState = 1;
const STATE_COMMENT: TokenizationState = 2;
const STATE_STRING: TokenizationState = 3;
const STATE_WS: TokenizationState = 4;


function assert(condition: unknown, message = ""): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

/**
 * Returns the line (row) and column index in the code from the index.
 * 
 * @param code 
 * @param index 
 * 
 * @throws
 */
function getLineAndColumnIndexInCode(code: string, index: number) {
  let lineIndex = 0;
  let columnIndex = 0;

  assert(0 <= index && index < code.length, "Out of bounds");
  
  // TODO: optimize this code at some point.
  
  for (let i = 0; i < index; i += 1) {
    const c = code[i];
    
    if (c === "\n") {
      lineIndex += 1;
      columnIndex = 0;
    } else {
      columnIndex += 1;
    }
  }
  
  return { lineIndex, columnIndex };
}

/**
 * Creates a string that points index in code.  Used for creating error messages.
 * 
 * @param code 
 * @param index 
 * @returns 
 * 
 * @throws
 */
function msgPointToCode(code: string, index: number, message: undefined | string = undefined) {
  const { lineIndex: line_index, columnIndex: column_index } = getLineAndColumnIndexInCode(code, index);

  // TODO: maybe this can be optimized.
  const lines = code.split("\n");

  const msg: string[] = [];

  // The biggest number that is displayed in the gutter.
  const max_number = line_index + 1;

  // The size of the gutter is the same size as the number
  // of characters in the largest number.
  const gutter_size = `${max_number}`.length;


  function gutter_number(k: number) {
    assert(Number.isInteger(k));
    assert(k >= 0 && k <= lines.length, `gutter_number: expected ${0} <= ${k} < ${lines.length}.`);

    const n = `${k}`.padStart(gutter_size, ' ');

    return ` ${n} `;
  }

  function gutter_empty(k: number) {
    assert(Number.isInteger(k));
    assert(k >= 0 && k <= lines.length, `gutter_number: expected ${0} <= ${k} < ${lines.length}.`);

    return ` ${" ".repeat(gutter_size)} `;
  }

  {
    const l = lines;
    
    const li = line_index;
    const ci = column_index;

    const ge = gutter_empty;
    const gn = gutter_number;

    const p = (s: string) => {
      msg.push(s);
    };

    // Check if index is in bounds w.r.t. lines.
    const ib = (i: number) => {
      if (!(Number.isInteger(i))) return false;
      if (!(i >= 0 && i < lines.length)) return false;
      
      return true;
    }

    // whitespace / padding
    const w = (n: number) => {
      return " ".repeat(n);
    };
    
    const __________ = true;
    const has_msg___ = typeof message === "string";

    if (__________) p("");
    if (__________) p("");
    if (__________) p(ge(0.0000) + "| " + w(ci));
    if (ib(li - 1)) p(gn(li + 0) + "| " + l[li - 1]);
    if (__________) p(gn(li + 1) + "| " + l[li + 0]);
    if (__________) p(ge(li + 1) + ": " + w(ci) + "^");
    if (has_msg___) p(ge(li + 1) + ": " + w(ci) + "'- " + message);
    if (ib(li + 1)) p(gn(li + 2) + "| " + l[li + 1]);
    if (__________) p(ge(0.0000) + "| " + w(ci));
    if (__________) p("");
  }

  return msg.join("\n");
}

export const utils = {
  getLineAndColumnIndexInCode,
  msgPointToCode,
};

/**
 * 
 * @param code 
 * 
 * @throws
 */
export function tokenize(code: string, options: TokenizeOptions = {}): ParseNodePrimitive[] {
  const code_length = code.length;
  
  let code_index = 0;
  let code_line_index = 0;
  let code_column_index = 0;
  
  const tokens: ParseNodePrimitive[] = [];

  let token_type: ParseNodeTypePrimitive = PARSE_NODE_TYPE_COMMENT;
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
  function createToken(): ParseNodePrimitive {
    const token: ParseNodePrimitive = {
      value: code.substring(token_index, token_index + token_length),
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
  function startToken(type: ParseNodeTypePrimitive): void {
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
    token_type = PARSE_NODE_TYPE_COMMENT;
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
  function completeToken(): ParseNodePrimitive {
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
  function flushToken(): ParseNodePrimitive {
    const token = completeToken();
    
    if (token.type === PARSE_NODE_TYPE_WHITESPACE) {
      if (includeWhitespace) tokens.push(token);
    } 
    else if (token.type === PARSE_NODE_TYPE_COMMENT) {
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
            startToken(PARSE_NODE_TYPE_COMMENT);
            extendToken();
            setNextState(STATE_COMMENT);
            conclude();
          }
          // Whitespace
          else if (isWhitespace(cc)) {
            if (hasToken()) flushToken();
            startToken(PARSE_NODE_TYPE_WHITESPACE);
            extendToken();
            setNextState(STATE_WS);
            conclude();
          }
          // Delimiter
          else if (cc === "(" || cc === ")") {
            if (hasToken()) flushToken();
            startToken(PARSE_NODE_TYPE_DELIMITER);
            extendToken();
            flushToken();
            conclude();
          }
          // String
          else if (cc === "\"") {
            if (hasToken()) flushToken();
            startToken(PARSE_NODE_TYPE_STRING);
            extendToken();
            setNextState(STATE_STRING);
            conclude();
          }
          // Symbol
          else {
            if (!hasToken()) startToken(PARSE_NODE_TYPE_SYMBOL);
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
        msgPointToCode(
          code,
          token_index,
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
  
  // Stack used when constructing the parse tree.  It constructs the parse
  // tree in a depth-first way.  This stack keeps track of children, and the
  // parent is simply an array.
  const stack_list_children: ParseNode[][] = [[]];
  
  // Another stack used when constructing the parse tree.  This stack builds up
  // the internal nodes, or the lists.
  const stack_list_parent: ParseNode[] = [];

  // Keeps track of nesting and when nesting begins.  Used for error checking
  // to make sure each opened parantheses has been closed.
  const stack_nesting: number[] = [];
  
  for (const token of tokens) {
    if (token.value === "(") {
      
      stack_nesting.push(token.index);
      stack_list_children.push([]);
      
      stack_list_parent.push({
        type: PARSE_NODE_TYPE_LIST,
        value: [],
        
        index: token.index,
        length: 0,
        lineIndex: token.lineIndex,
        columnIndex: token.columnIndex
      });
      
      if (includeDelimiter) {
        stack_list_children[stack_list_children.length - 1].push(token);
      }
    } else if (token.value === ")") {
      // Raise an syntax error if there are too many closing parentheses
      // at this point in parsing.
      if (stack_list_children.length === 1) {
        throw new SyntaxError(
          msgPointToCode(
            code,
            token.index,
            `unexpected closing delimiter`
          )
        );
      }
      
      if (includeDelimiter) {
        stack_list_children[stack_list_children.length - 1].push(token);
      }
      
      stack_nesting.pop();
      const children = stack_list_children.pop();
      
      assert(typeof children !== "undefined");
      
      const parse_node = stack_list_parent.pop();
      
      assert(typeof parse_node !== "undefined");
      
      parse_node.length = token.index - parse_node.index + 1;
      parse_node.value = children;
      
      stack_list_children[stack_list_children.length - 1].push(parse_node);
    } else {
      stack_list_children[stack_list_children.length - 1].push(token);
    }
  }

  if (stack_list_children.length !== 1) {
    const index = stack_nesting[stack_nesting.length - 1];
    throw new SyntaxError(
      msgPointToCode(
        code,
        index,
        `needs a matching closing delimiter`
      )
    );
  }
  
  const parse_nodes = stack_list_children.pop();
  
  assert(typeof parse_nodes !== "undefined");

  return parse_nodes;
}

