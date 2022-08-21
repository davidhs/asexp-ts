// Git repository: <https://github.com/davidhs/asexp-ts>
export var PARSE_NODE_TYPE_SYMBOL = 0;
export var PARSE_NODE_TYPE_COMMENT = 1;
export var PARSE_NODE_TYPE_STRING = 2;
export var PARSE_NODE_TYPE_DELIMITER = 3;
export var PARSE_NODE_TYPE_WHITESPACE = 4;
export var PARSE_NODE_TYPE_LIST = 5;
var regex_ws = /\s/;
var STATE_NEW = 1;
var STATE_COMMENT = 2;
var STATE_STRING = 3;
var STATE_WS = 4;
function assert(condition, message) {
    if (message === void 0) { message = ""; }
    if (!condition)
        throw new Error("Assertion failed: ".concat(message));
}
/**
 * Returns the line (row) and column index in the code from the index.
 *
 * @param code
 * @param index
 *
 * @throws
 */
function getLineAndColumnIndexInCode(code, index) {
    var lineIndex = 0;
    var columnIndex = 0;
    assert(0 <= index && index < code.length, "Out of bounds");
    // TODO: optimize this code at some point.
    for (var i = 0; i < index; i += 1) {
        var c = code[i];
        if (c === "\n") {
            lineIndex += 1;
            columnIndex = 0;
        }
        else {
            columnIndex += 1;
        }
    }
    return { lineIndex: lineIndex, columnIndex: columnIndex };
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
function msgPointToCode(code, index, message) {
    if (message === void 0) { message = undefined; }
    var _a = getLineAndColumnIndexInCode(code, index), line_index = _a.lineIndex, column_index = _a.columnIndex;
    // TODO: maybe this can be optimized.
    var lines = code.split("\n");
    var msg = [];
    // The biggest number that is displayed in the gutter.
    var max_number = line_index + 1;
    // The size of the gutter is the same size as the number
    // of characters in the largest number.
    var gutter_size = "".concat(max_number).length;
    function gutter_number(k) {
        assert(Number.isInteger(k));
        assert(k >= 0 && k <= lines.length, "gutter_number: expected ".concat(0, " <= ").concat(k, " < ").concat(lines.length, "."));
        var n = "".concat(k).padStart(gutter_size, ' ');
        return " ".concat(n, " ");
    }
    function gutter_empty(k) {
        assert(Number.isInteger(k));
        assert(k >= 0 && k <= lines.length, "gutter_number: expected ".concat(0, " <= ").concat(k, " < ").concat(lines.length, "."));
        return " ".concat(" ".repeat(gutter_size), " ");
    }
    {
        var l = lines;
        var li = line_index;
        var ci = column_index;
        var ge = gutter_empty;
        var gn = gutter_number;
        var p = function (s) {
            msg.push(s);
        };
        // Check if index is in bounds w.r.t. lines.
        var ib = function (i) {
            if (!(Number.isInteger(i)))
                return false;
            if (!(i >= 0 && i < lines.length))
                return false;
            return true;
        };
        // whitespace / padding
        var w = function (n) {
            return " ".repeat(n);
        };
        var __________ = true;
        var has_msg___ = typeof message === "string";
        if (__________)
            p("");
        if (__________)
            p("");
        if (__________)
            p(ge(0.0000) + "| " + w(ci));
        if (ib(li - 1))
            p(gn(li + 0) + "| " + l[li - 1]);
        if (__________)
            p(gn(li + 1) + "| " + l[li + 0]);
        if (__________)
            p(ge(li + 1) + ": " + w(ci) + "^");
        if (has_msg___)
            p(ge(li + 1) + ": " + w(ci) + "'- " + message);
        if (ib(li + 1))
            p(gn(li + 2) + "| " + l[li + 1]);
        if (__________)
            p(ge(0.0000) + "| " + w(ci));
        if (__________)
            p("");
    }
    return msg.join("\n");
}
export var utils = {
    getLineAndColumnIndexInCode: getLineAndColumnIndexInCode,
    msgPointToCode: msgPointToCode
};
/**
 *
 * @param code
 *
 * @throws
 */
export function tokenize(code, options) {
    if (options === void 0) { options = {}; }
    var code_length = code.length;
    var code_index = 0;
    var code_line_index = 0;
    var code_column_index = 0;
    var tokens = [];
    var token_type = PARSE_NODE_TYPE_COMMENT;
    var token_index = -1;
    var token_length = -1;
    var token_line_index = -1;
    var token_column_index = -1;
    var state = STATE_NEW;
    var pc = ""; // Previous character.
    var cc = ""; // Current character.
    var deciding = true; // Whether through "state machine".
    var includeWhitespace = false;
    var includeComment = false;
    if (options.whitespace === true)
        includeWhitespace = true;
    if (options.comment === true)
        includeComment = true;
    /**
     * Creates a new token from the work-in-progress token.
     *
     * @returns
     */
    function createToken() {
        var token = {
            value: code.substring(token_index, token_index + token_length),
            type: token_type,
            index: token_index,
            length: token_length,
            lineIndex: token_line_index,
            columnIndex: token_column_index
        };
        return token;
    }
    /**
     * Starts a new empty work-in-progress token.
     *
     * @param type
     */
    function startToken(type) {
        token_index = code_index;
        token_type = type;
        token_length = 0;
        token_line_index = code_line_index;
        token_column_index = code_column_index;
    }
    /**
     * Extend current token to include next character
     */
    function extendToken() {
        token_length += 1;
    }
    /**
     * Check if we're currently working on a work-in-progress token.
     *
     * @returns
     */
    function hasToken() {
        return token_index >= 0;
    }
    /**
     * Resets the current work-in-progress token.
     */
    function resetToken() {
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
    function completeToken() {
        var token = createToken();
        resetToken();
        return token;
    }
    /**
     * Completes a token, pushes onto the token stack, and returns the
     * token.
     *
     * @returns
     */
    function flushToken() {
        var token = completeToken();
        if (token.type === PARSE_NODE_TYPE_WHITESPACE) {
            if (includeWhitespace)
                tokens.push(token);
        }
        else if (token.type === PARSE_NODE_TYPE_COMMENT) {
            if (includeComment)
                tokens.push(token);
        }
        else {
            tokens.push(token);
        }
        return token;
    }
    /**
     * Set the state of the state machine.
     *
     * @param nextState
     */
    function setNextState(nextState) {
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
    function isWhitespace(c) {
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
                        if (hasToken())
                            flushToken();
                        startToken(PARSE_NODE_TYPE_COMMENT);
                        extendToken();
                        setNextState(STATE_COMMENT);
                        conclude();
                    }
                    // Whitespace
                    else if (isWhitespace(cc)) {
                        if (hasToken())
                            flushToken();
                        startToken(PARSE_NODE_TYPE_WHITESPACE);
                        extendToken();
                        setNextState(STATE_WS);
                        conclude();
                    }
                    // Delimiter
                    else if (cc === "(" || cc === ")") {
                        if (hasToken())
                            flushToken();
                        startToken(PARSE_NODE_TYPE_DELIMITER);
                        extendToken();
                        flushToken();
                        conclude();
                    }
                    // String
                    else if (cc === "\"") {
                        if (hasToken())
                            flushToken();
                        startToken(PARSE_NODE_TYPE_STRING);
                        extendToken();
                        setNextState(STATE_STRING);
                        conclude();
                    }
                    // Symbol
                    else {
                        if (!hasToken())
                            startToken(PARSE_NODE_TYPE_SYMBOL);
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
                    }
                    else {
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
        }
        else {
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
            throw new SyntaxError(msgPointToCode(code, token_index, "unclosed string"));
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
export function parse(code, options) {
    if (options === void 0) { options = {}; }
    var includeWhitespace = false;
    var includeComment = false;
    var includeDelimiter = false;
    if (options.whitespace === true)
        includeWhitespace = true;
    if (options.comment === true)
        includeComment = true;
    if (options.delimiter === true)
        includeDelimiter = true;
    var tokens = tokenize(code, { whitespace: includeWhitespace, comment: includeComment });
    // Stack used when constructing the parse tree.  It constructs the parse
    // tree in a depth-first way.  This stack keeps track of children, and the
    // parent is simply an array.
    var stack_list_children = [[]];
    // Another stack used when constructing the parse tree.  This stack builds up
    // the internal nodes, or the lists.
    var stack_list_parent = [];
    // Keeps track of nesting and when nesting begins.  Used for error checking
    // to make sure each opened parantheses has been closed.
    var stack_nesting = [];
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var token = tokens_1[_i];
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
        }
        else if (token.value === ")") {
            // Raise an syntax error if there are too many closing parentheses
            // at this point in parsing.
            if (stack_list_children.length === 1) {
                throw new SyntaxError(msgPointToCode(code, token.index, "unexpected closing delimiter"));
            }
            if (includeDelimiter) {
                stack_list_children[stack_list_children.length - 1].push(token);
            }
            stack_nesting.pop();
            var children = stack_list_children.pop();
            assert(typeof children !== "undefined");
            var parse_node = stack_list_parent.pop();
            assert(typeof parse_node !== "undefined");
            parse_node.length = token.index - parse_node.index + 1;
            parse_node.value = children;
            stack_list_children[stack_list_children.length - 1].push(parse_node);
        }
        else {
            stack_list_children[stack_list_children.length - 1].push(token);
        }
    }
    if (stack_list_children.length !== 1) {
        var index = stack_nesting[stack_nesting.length - 1];
        throw new SyntaxError(msgPointToCode(code, index, "needs a matching closing delimiter"));
    }
    var parse_nodes = stack_list_children.pop();
    assert(typeof parse_nodes !== "undefined");
    return parse_nodes;
}
