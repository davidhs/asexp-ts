// Git repository: <https://github.com/davidhs/asexp-ts>

type Token = { v: string, li: number, ci: number };

type ASExpressionAtom = string;
type ASExpressionList = ASExpression[];
type ASExpression = ASExpressionAtom | ASExpressionList;

const ws = /\s/;

// TODO(Davíð): maybe replace with enum?
const STATE_NORMAL = 1;
const STATE_COMMENT = 2;
const STATE_STRING = 3;


/**
 * Create error message
 * 
 * @param text
 * @param token
 * @param message
 */
function cem(text: string, token: Token | null, message = "") {
  if (token === null) return message;

  const line_index = token.li;
  const column_index = token.ci;

  const lines = text.split("\n");

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
 * @param line_index 
 * @param column_index 
 */
function create_new_token(line_index: number, column_index: number): Token {
  return { v: "", li: line_index, ci: column_index }
}

/**
 * 
 * @param text 
 * 
 * @throws
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  let token: null | Token = null;

  const text_length = text.length;

  let token_line_index = 0;
  let token_column_index = 0;

  let line_index = 0;
  let column_index = 0;

  let state = STATE_NORMAL;

  let pc = "";
  let c = "";

  for (let text_index = 0; text_index < text_length; text_index += 1) {
    c = text[text_index];

    if (state === STATE_NORMAL) {
      if (c === ";") {
        if (token !== null) {
          tokens.push(token);
          token = null;
        }

        state = STATE_COMMENT;
      } else if (c.match(ws) !== null) {
        if (token !== null) {
          tokens.push(token);
          token = null;
        }
      } else if (c === "(" || c === ")") {
        if (token !== null) {
          tokens.push(token);
          token = null;
        }

        {
          const token = create_new_token(line_index, column_index);
          token.v += c;

          tokens.push(token);
        }
      } else if (c === "\"") {
        token_line_index = line_index;
        token_column_index = column_index;

        if (token !== null) {
          tokens.push(token);
          token = null;
        }

        token = create_new_token(line_index, column_index);
        token.v += c;

        state = STATE_STRING;
      } else {
        if (token === null) token = create_new_token(line_index, column_index);
        token.v += c;
      }
    } else if (state === STATE_COMMENT) {
      if (c === "\n") state = STATE_NORMAL;
    } else if (state === STATE_STRING) {
      (token as Token).v += c;

      if (pc !== "\\" && c === "\"") {
        tokens.push(token as Token);
        token = null;
        state = STATE_NORMAL;
      }
    } else throw new Error(cem(text, token, `Internal error: unknown state: ${state}`));

    if (c === "\n") {
      line_index += 1;
      column_index = 0;
    } else column_index += 1;

    pc = c;
  }

  if (token !== null) {
    if (state === STATE_STRING) throw new SyntaxError(cem(text, token, `unclosed string`));
    else {
      tokens.push(token);
      token = null;
    }
  }

  return tokens;
}


/**
 * 
 * @param text 
 * @throws
 */
export function parse(text: string): ASExpressionList {
  const tokens = tokenize(text);
  
  const stack: ASExpression[][] = [[]];

  const list_delim_stack: Token[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.v === "(") {
      list_delim_stack.push(token);
      stack.push([]);
    } else if (token.v === ")") {
      if (stack.length === 1) throw new SyntaxError(cem(text, token, `unexpected closing delimiter`))
      list_delim_stack.pop();
      const level = stack.pop() as ASExpressionList;
      stack[stack.length - 1].push(level);
    } else stack[stack.length - 1].push(token.v);
  }

  if (stack.length !== 1) throw new SyntaxError(cem(text, list_delim_stack[list_delim_stack.length - 1], `needs a matching closing delimiter`));
  
  const as_expressions: ASExpressionList = stack.pop() as ASExpressionList;

  return as_expressions;
}
