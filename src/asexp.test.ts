// deno run test.ts

import * as asexp from "./asexp";


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
      const t = asexp.tokenize("()");
      
      assert(t[0].value === "(");
      assert(t[0].type === asexp.PARSE_NODE_TYPE_DELIMITER);
      assert(t[1].value === ")");
      assert(t[1].type === asexp.PARSE_NODE_TYPE_DELIMITER);
    },
    // Test unclosed string
    wrapFnExpectError(() => {
      asexp.tokenize(String.raw`"abc`);
    }),
    // Test unexpected closing delimiter
    wrapFnExpectError(() => {
      asexp.parse(")");
    }),
    // Test needs a matching closing delimiter
    wrapFnExpectError(() => {
      asexp.parse("(");
    }),
    // Nesting test
    () => {
      const code = String.raw`
        a b
        ( c d )
        e f
      `;
      
      const p: any = asexp.parse(code);
      
      assert(p.length === 5);
      assert(Array.isArray(p[2].value));
      assert(p[2].value.length === 2);
      
      assert(p[0].value === "a");
      assert(p[1].value === "b");
      assert(p[2].value[0].value === "c");
      assert(p[2].value[1].value === "d");
      assert(p[3].value === "e");
      assert(p[4].value === "f");
    },
    // all test
    () => {
      const code = String.raw`
        1; hello
        2 ;"world
        3
      `;
      
      const p: any = asexp.parse(code);
      
      assert(p.length === 3);
      assert(p[0].value === "1");
      assert(p[1].value === "2");
      assert(p[2].value === "3");
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


test();
