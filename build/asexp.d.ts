export declare type ParseNodeTypePrimitive = 0 | 1 | 2 | 3 | 4;
export declare type ParseNodeTypeList = 5;
export declare type ParseNodeType = ParseNodeTypePrimitive | ParseNodeTypeList;
/**
 * A.k.a. token.
 */
export declare type ParseNodePrimitive = {
    type: ParseNodeTypePrimitive;
    value: string;
    index: number;
    length: number;
    lineIndex: number;
    columnIndex: number;
};
export declare type ParseNodeList = {
    type: ParseNodeTypeList;
    value: ParseNode[];
    index: number;
    length: number;
    lineIndex: number;
    columnIndex: number;
};
export declare type ParseNode = ParseNodePrimitive | ParseNodeList;
export declare type TokenizeOptions = {
    whitespace?: boolean;
    comment?: boolean;
};
export declare type ParseOptions = {
    whitespace?: boolean;
    comment?: boolean;
    delimiter?: boolean;
};
export declare const PARSE_NODE_TYPE_SYMBOL: ParseNodeTypePrimitive;
export declare const PARSE_NODE_TYPE_COMMENT: ParseNodeTypePrimitive;
export declare const PARSE_NODE_TYPE_STRING: ParseNodeTypePrimitive;
export declare const PARSE_NODE_TYPE_DELIMITER: ParseNodeTypePrimitive;
export declare const PARSE_NODE_TYPE_WHITESPACE: ParseNodeTypePrimitive;
export declare const PARSE_NODE_TYPE_LIST: ParseNodeTypeList;
/**
 * Returns the line (row) and column index in the code from the index.
 *
 * @param code
 * @param index
 *
 * @throws
 */
declare function getLineAndColumnIndexInCode(code: string, index: number): {
    lineIndex: number;
    columnIndex: number;
};
/**
 * Creates a string that points index in code.  Used for creating error messages.
 *
 * @param code
 * @param index
 * @returns
 *
 * @throws
 */
declare function msgPointToCode(code: string, index: number, message?: undefined | string): string;
export declare const utils: {
    getLineAndColumnIndexInCode: typeof getLineAndColumnIndexInCode;
    msgPointToCode: typeof msgPointToCode;
};
/**
 *
 * @param code
 *
 * @throws
 */
export declare function tokenize(code: string, options?: TokenizeOptions): ParseNodePrimitive[];
/**
 * Parses code into a list of abbreviated s-expressions.
 *
 * @param code
 * @throws
 */
export declare function parse(code: string, options?: ParseOptions): ParseNode[];
export {};
