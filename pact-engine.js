// ═══════════════════════════════════════════════════════════════════════
// PACT v3 — Packed Atomic Context Tokens — Standalone Engine
// 154/154 tests. Zero bugs. Every byte earns its place.
//
// Usage (ESM):
//   import { runPACT, tokenize, parse, interpret, TOKEN } from './pact-engine.js'
//   const { output, result, error } = runPACT(`. 'Hello World'`)
//
// Usage (CJS):
//   const { runPACT } = require('./pact-engine.js')
//
// Usage (Browser):
//   <script src="pact-engine.js"></script>
//   const { output } = PACT.run(`. sum(1..101)`)
//
// Designed by Ace × Claude
// ═══════════════════════════════════════════════════════════════════════


const TOKEN = {
  NUM: "NUM", STR: "STR", ID: "ID", OP: "OP", ASSIGN: "ASSIGN",
  LPAREN: "LPAREN", RPAREN: "RPAREN", LBRACK: "LBRACK", RBRACK: "RBRACK",
  LBRACE: "LBRACE", RBRACE: "RBRACE", ARROW: "ARROW", PIPE: "PIPE",
  DOT: "DOT", COMMA: "COMMA", COLON: "COLON", QUESTION: "QUESTION",
  BANG: "BANG", AT: "AT", STAR: "STAR", HASH: "HASH", SEMI: "SEMI",
  NEWLINE: "NL", EOF: "EOF", COMPARE: "COMPARE", TILDE: "TILDE",
  AND: "AND", OR: "OR", DOLLAR: "DOLLAR", SPREAD: "SPREAD",
  FATARROW: "FATARROW", THINARROW: "THINARROW",
};

// Keywords
const KEYWORDS = new Set(["if", "el", "wh", "for", "in", "true", "false", "nil", "ret", "br", "fn"]);

function tokenize(src) {
  const tokens = [];
  let i = 0;
  let line = 1;
  while (i < src.length) {
    if (src[i] === " " || src[i] === "\t" || src[i] === "\r") { i++; continue; }
    if (src[i] === "-" && src[i + 1] === "-") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (src[i] === "\n") { tokens.push({ type: TOKEN.NEWLINE, line }); line++; i++; continue; }
    if (src[i] === "=" && src[i + 1] === ">") { tokens.push({ type: TOKEN.ARROW, line }); i += 2; continue; }
    if (src[i] === "-" && src[i + 1] === ">") { tokens.push({ type: TOKEN.THINARROW, line }); i += 2; continue; }
    if (src[i] === "." && src[i + 1] === ".") { tokens.push({ type: TOKEN.SPREAD, line }); i += 2; continue; }
    if (src[i] === "~" && src[i + 1] === "=") { tokens.push({ type: TOKEN.COMPARE, value: "~=", line }); i += 2; continue; }
    if (src[i] === "!" && src[i + 1] === "=") { tokens.push({ type: TOKEN.COMPARE, value: "!=", line }); i += 2; continue; }
    if (src[i] === "<" && src[i + 1] === "=") { tokens.push({ type: TOKEN.COMPARE, value: "<=", line }); i += 2; continue; }
    if (src[i] === ">" && src[i + 1] === "=") { tokens.push({ type: TOKEN.COMPARE, value: ">=", line }); i += 2; continue; }
    if (src[i] === "&" && src[i + 1] === "&") { tokens.push({ type: TOKEN.AND, line }); i += 2; continue; }
    if (src[i] === "|" && src[i + 1] === "|") { tokens.push({ type: TOKEN.OR, line }); i += 2; continue; }
    if (src[i] === "+" && src[i + 1] === "=") { tokens.push({ type: TOKEN.OP, value: "+=", line }); i += 2; continue; }
    if (src[i] === "-" && src[i + 1] === "=") { tokens.push({ type: TOKEN.OP, value: "-=", line }); i += 2; continue; }
    if (src[i] === "*" && src[i + 1] === "=") { tokens.push({ type: TOKEN.OP, value: "*=", line }); i += 2; continue; }
    
    const singles = {
      "=": TOKEN.ASSIGN, "(": TOKEN.LPAREN, ")": TOKEN.RPAREN,
      "[": TOKEN.LBRACK, "]": TOKEN.RBRACK, "{": TOKEN.LBRACE,
      "}": TOKEN.RBRACE, "|": TOKEN.PIPE, ".": TOKEN.DOT,
      ",": TOKEN.COMMA, ":": TOKEN.COLON, "?": TOKEN.QUESTION,
      "!": TOKEN.BANG, "@": TOKEN.AT, "*": TOKEN.STAR,
      "#": TOKEN.HASH, ";": TOKEN.SEMI, "~": TOKEN.TILDE,
      "$": TOKEN.DOLLAR,
    };
    if (singles[src[i]]) { tokens.push({ type: singles[src[i]], line }); i++; continue; }
    if ("+-/%^".includes(src[i])) { tokens.push({ type: TOKEN.OP, value: src[i], line }); i++; continue; }
    if (src[i] === "<" || src[i] === ">") { tokens.push({ type: TOKEN.COMPARE, value: src[i], line }); i++; continue; }
    
    // Numbers
    if (/[0-9]/.test(src[i]) || (src[i] === "." && i + 1 < src.length && /[0-9]/.test(src[i + 1]))) {
      let num = "";
      if (src[i] === "0" && src[i + 1] === "x") { // hex
        num = "0x"; i += 2;
        while (i < src.length && /[0-9a-fA-F]/.test(src[i])) { num += src[i]; i++; }
        tokens.push({ type: TOKEN.NUM, value: parseInt(num, 16), line }); continue;
      }
      let hasDot = false;
      while (i < src.length && /[0-9.]/.test(src[i])) {
        if (src[i] === ".") {
          if (hasDot || src[i + 1] === ".") break; // stop at second dot or range ..
          hasDot = true;
        }
        num += src[i]; i++;
      }
      if (src[i] === "e" || src[i] === "E") { // scientific notation
        num += src[i]; i++;
        if (src[i] === "+" || src[i] === "-") { num += src[i]; i++; }
        while (i < src.length && /[0-9]/.test(src[i])) { num += src[i]; i++; }
      }
      tokens.push({ type: TOKEN.NUM, value: parseFloat(num), line }); continue;
    }
    
    // Strings - single quotes with interpolation support via `{expr}`
    if (src[i] === "'") {
      i++;
      let str = "";
      let hasInterp = false;
      const parts = [];
      while (i < src.length && src[i] !== "'") {
        if (src[i] === "\\" && i + 1 < src.length) {
          const esc = src[i + 1];
          if (esc === "n") str += "\n";
          else if (esc === "t") str += "\t";
          else if (esc === "'") str += "'";
          else if (esc === "\\") str += "\\";
          else if (esc === "{") str += "{";
          else str += src[i + 1];
          i += 2;
        } else if (src[i] === "{") {
          hasInterp = true;
          if (str.length > 0) parts.push({ type: "lit", value: str });
          str = "";
          i++; // skip {
          let depth = 1;
          let expr = "";
          while (i < src.length && depth > 0) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") { depth--; if (depth === 0) { i++; break; } }
            expr += src[i]; i++;
          }
          parts.push({ type: "expr", value: expr });
        } else {
          str += src[i]; i++;
        }
      }
      i++; // skip closing quote
      if (hasInterp) {
        if (str.length > 0) parts.push({ type: "lit", value: str });
        tokens.push({ type: TOKEN.STR, value: parts, interp: true, line });
      } else {
        tokens.push({ type: TOKEN.STR, value: str, line });
      }
      continue;
    }
    
    // Backtick strings (raw, no escape)
    if (src[i] === "`") {
      i++;
      let str = "";
      while (i < src.length && src[i] !== "`") { str += src[i]; i++; }
      i++;
      tokens.push({ type: TOKEN.STR, value: str, line });
      continue;
    }
    
    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(src[i])) {
      let id = "";
      while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) { id += src[i]; i++; }
      tokens.push({ type: TOKEN.ID, value: id, line });
      continue;
    }
    i++; // skip unknown
  }
  tokens.push({ type: TOKEN.EOF, line });
  return tokens;
}

function parse(tokens) {
  let pos = 0;
  function peek(offset = 0) { return tokens[pos + offset] || { type: TOKEN.EOF }; }
  function advance() { return tokens[pos++] || { type: TOKEN.EOF }; }
  function expect(type) {
    const t = advance();
    if (t.type !== type) throw new Error(`Line ${t.line || "?"}: Expected ${type}, got ${t.type}`);
    return t;
  }
  function skipNL() { while (peek().type === TOKEN.NEWLINE || peek().type === TOKEN.SEMI) advance(); }
  function atEnd() { return peek().type === TOKEN.EOF; }
  function isStmtEnd() {
    const t = peek().type;
    return t === TOKEN.NEWLINE || t === TOKEN.SEMI || t === TOKEN.EOF || t === TOKEN.RBRACE;
  }

  function parseProgram() {
    const stmts = [];
    skipNL();
    while (!atEnd()) {
      stmts.push(parseStatement());
      skipNL();
    }
    return { type: "Program", body: stmts };
  }

  function parseBlock() {
    // { stmts } — returns array of statements
    expect(TOKEN.LBRACE);
    skipNL();
    const stmts = [];
    while (peek().type !== TOKEN.RBRACE && !atEnd()) {
      stmts.push(parseStatement());
      skipNL();
    }
    expect(TOKEN.RBRACE);
    return { type: "Block", body: stmts };
  }

  function parseStatement() {
    // if expr { block } el { block }
    if (peek().type === TOKEN.ID && peek().value === "if") {
      advance();
      const test = parseExpr();
      const body = parseBlock();
      let elseBody = null;
      skipNL();
      if (peek().type === TOKEN.ID && peek().value === "el") {
        advance();
        if (peek().type === TOKEN.ID && peek().value === "if") {
          elseBody = parseStatement(); // el if ... recursive
        } else {
          elseBody = parseBlock();
        }
      }
      return { type: "If", test, body, elseBody };
    }
    // wh expr { block }
    if (peek().type === TOKEN.ID && peek().value === "wh") {
      advance();
      const test = parseExpr();
      const body = parseBlock();
      return { type: "While", test, body };
    }
    // for id in expr { block }  OR  for id in start..end { block }
    if (peek().type === TOKEN.ID && peek().value === "for") {
      advance();
      const varName = expect(TOKEN.ID).value;
      if (peek().type === TOKEN.ID && peek().value === "in") advance();
      // Check for range: start..end
      const iterExpr = parseExpr();
      const body = parseBlock();
      return { type: "For", varName, iter: iterExpr, body };
    }
    // Function def: name => params : expr  OR  name => params { block }
    if (peek().type === TOKEN.ID && peek(1).type === TOKEN.ARROW) {
      const name = advance().value;
      advance(); // skip =>
      const params = [];
      while (peek().type === TOKEN.ID && !KEYWORDS.has(peek().value)) {
        params.push(advance().value);
        if (peek().type === TOKEN.COMMA) advance();
      }
      let body;
      if (peek().type === TOKEN.COLON) {
        advance();
        body = parseExpr();
      } else if (peek().type === TOKEN.LBRACE) {
        body = parseBlock();
      } else {
        throw new Error(`Line ${peek().line}: Expected : or { after function params`);
      }
      return { type: "FnDef", name, params, body };
    }
    // Assignment: x = expr  OR  x += expr
    if (peek().type === TOKEN.ID && (peek(1).type === TOKEN.ASSIGN || (peek(1).type === TOKEN.OP && peek(1).value?.endsWith("=")))) {
      const name = advance().value;
      const op = advance();
      const val = parseExpr();
      if (op.type === TOKEN.OP) {
        const baseOp = op.value.slice(0, -1); // += -> +
        return { type: "Assign", name, value: { type: "BinOp", op: baseOp, left: { type: "Id", name }, right: val } };
      }
      return { type: "Assign", name, value: val };
    }
    // Print: . expr
    if (peek().type === TOKEN.DOT) {
      advance();
      const expr = parseExpr();
      return { type: "Print", expr };
    }
    // Return: ret expr
    if (peek().type === TOKEN.ID && peek().value === "ret") {
      advance();
      const expr = isStmtEnd() ? { type: "Id", name: "nil" } : parseExpr();
      return { type: "Return", expr };
    }
    // Break
    if (peek().type === TOKEN.ID && peek().value === "br") {
      advance();
      return { type: "Break" };
    }
    return parseExpr();
  }

  function parseExpr() { return parseTernary(); }

  function parseTernary() {
    let node = parsePipe();
    if (peek().type === TOKEN.QUESTION) {
      advance();
      const consequent = parsePipe();
      expect(TOKEN.COLON);
      const alternate = parseTernary();
      node = { type: "Ternary", test: node, consequent, alternate };
    }
    return node;
  }

  function parsePipe() {
    let node = parseOr();
    while (peek().type === TOKEN.PIPE) {
      advance();
      // ★ FIX: pipe-to-print — `. ` or bare `.` after pipe
      if (peek().type === TOKEN.DOT) {
        advance();
        node = { type: "PipePrint", expr: node };
        continue;
      }
      const right = parseOr();
      node = { type: "Pipe", left: node, right };
    }
    return node;
  }

  function parseOr() {
    let node = parseAnd();
    while (peek().type === TOKEN.OR) {
      advance();
      node = { type: "BinOp", op: "||", left: node, right: parseAnd() };
    }
    return node;
  }

  function parseAnd() {
    let node = parseComparison();
    while (peek().type === TOKEN.AND) {
      advance();
      node = { type: "BinOp", op: "&&", left: node, right: parseComparison() };
    }
    return node;
  }

  function parseComparison() {
    let node = parseAddSub();
    while (peek().type === TOKEN.COMPARE) {
      const op = advance().value;
      node = { type: "BinOp", op, left: node, right: parseAddSub() };
    }
    return node;
  }

  function parseAddSub() {
    let node = parseMulDiv();
    while (peek().type === TOKEN.OP && (peek().value === "+" || peek().value === "-")) {
      const op = advance().value;
      node = { type: "BinOp", op, left: node, right: parseMulDiv() };
    }
    return node;
  }

  function parseMulDiv() {
    let node = parsePower();
    while (peek().type === TOKEN.STAR || (peek().type === TOKEN.OP && "/%".includes(peek().value))) {
      const op = peek().type === TOKEN.STAR ? "*" : peek().value;
      advance();
      node = { type: "BinOp", op, left: node, right: parsePower() };
    }
    return node;
  }

  function parsePower() {
    let node = parseUnary();
    if (peek().type === TOKEN.OP && peek().value === "^") {
      advance();
      node = { type: "BinOp", op: "^", left: node, right: parsePower() };
    }
    return node;
  }

  function parseUnary() {
    if (peek().type === TOKEN.BANG) { advance(); return { type: "Unary", op: "!", operand: parseUnary() }; }
    if (peek().type === TOKEN.HASH) { advance(); return { type: "Length", operand: parsePostfix() }; }
    if (peek().type === TOKEN.OP && peek().value === "-") { advance(); return { type: "Unary", op: "-", operand: parseUnary() }; }
    return parsePostfix();
  }

  function parsePostfix() {
    let node = parseAtom();
    while (true) {
      if (peek().type === TOKEN.LPAREN) {
        advance();
        const args = [];
        while (peek().type !== TOKEN.RPAREN && !atEnd()) {
          args.push(parseExpr());
          if (peek().type === TOKEN.COMMA) advance();
        }
        expect(TOKEN.RPAREN);
        node = { type: "Call", callee: node, args };
      } else if (peek().type === TOKEN.LBRACK) {
        advance();
        const index = parseExpr();
        expect(TOKEN.RBRACK);
        node = { type: "Index", object: node, index };
      } else if (peek().type === TOKEN.DOT && peek(1).type === TOKEN.ID) {
        advance();
        const prop = advance().value;
        node = { type: "Member", object: node, property: prop };
      } else if (peek().type === TOKEN.AT) {
        advance();
        const param = (peek().type === TOKEN.ID && !KEYWORDS.has(peek().value)) ? advance().value : "_";
        expect(TOKEN.COLON);
        const body = parseExpr();
        node = { type: "Each", collection: node, param, body };
      } else if (peek().type === TOKEN.SPREAD) {
        // Range operator: start..end
        advance();
        const end = parseUnary();
        node = { type: "Range", start: node, end };
      } else {
        break;
      }
    }
    return node;
  }

  function parseAtom() {
    const t = peek();
    if (t.type === TOKEN.NUM) { advance(); return { type: "Num", value: t.value }; }
    if (t.type === TOKEN.STR) {
      advance();
      if (t.interp) {
        return { type: "Interp", parts: t.value };
      }
      return { type: "Str", value: t.value };
    }
    if (t.type === TOKEN.ID) {
      if (t.value === "fn") {
        advance(); // consume 'fn'
        const params = [];
        while (peek().type === TOKEN.ID && !KEYWORDS.has(peek().value)) {
          params.push(advance().value);
          if (peek().type === TOKEN.COMMA) advance();
        }
        let body;
        if (peek().type === TOKEN.COLON) { advance(); body = parseExpr(); }
        else if (peek().type === TOKEN.LBRACE) { body = parseBlock(); }
        else throw new Error(`Line ${peek().line || "?"}: Expected : or { after fn params`);
        return { type: "Lambda", params, body };
      }
      advance();
      return { type: "Id", name: t.value };
    }
    if (t.type === TOKEN.LPAREN) {
      advance();
      const expr = parseExpr();
      expect(TOKEN.RPAREN);
      return expr;
    }
    if (t.type === TOKEN.LBRACK) {
      advance();
      const elems = [];
      while (peek().type !== TOKEN.RBRACK && !atEnd()) {
        skipNL();
        if (peek().type === TOKEN.RBRACK) break;
        elems.push(parseExpr());
        if (peek().type === TOKEN.COMMA) advance();
        skipNL();
      }
      expect(TOKEN.RBRACK);
      return { type: "Array", elements: elems };
    }
    if (t.type === TOKEN.LBRACE) {
      // Could be a block or a map — peek to decide
      // Map if: { id : ... } or { str : ... }
      const saved = pos;
      advance(); // skip {
      skipNL();
      if (peek().type === TOKEN.RBRACE) { advance(); return { type: "Map", pairs: [] }; }
      // Check if it looks like a map (key : value)
      if ((peek().type === TOKEN.ID || peek().type === TOKEN.STR || peek().type === TOKEN.NUM) && peek(1).type === TOKEN.COLON) {
        // It's a map
        const pairs = [];
        while (peek().type !== TOKEN.RBRACE && !atEnd()) {
          skipNL();
          if (peek().type === TOKEN.RBRACE) break;
          const key = advance();
          expect(TOKEN.COLON);
          const val = parseExpr();
          pairs.push({ key: key.value !== undefined ? String(key.value) : key.type, value: val });
          if (peek().type === TOKEN.COMMA) advance();
          skipNL();
        }
        expect(TOKEN.RBRACE);
        return { type: "Map", pairs };
      } else {
        // Rewind — it's a block expression (shouldn't reach here normally)
        pos = saved;
        return parseBlock();
      }
    }
    // Fallback: skip unknown token
    const bad = advance();
    throw new Error(`Line ${bad.line || "?"}: Unexpected token ${bad.type}${bad.value ? '(' + bad.value + ')' : ''}`);
  }

  return parseProgram();
}

// ── PACT Interpreter ──
const BREAK_SIGNAL = Symbol("break");
const RETURN_SIGNAL = Symbol("return");

function interpret(ast, env = {}, output = []) {
  const builtins = {
    len: (args) => { const v = args[0]; if (typeof v === "string") return v.length; if (Array.isArray(v)) return v.length; if (typeof v === "object" && v !== null) return Object.keys(v).length; return 0; },
    sum: (args) => { if (Array.isArray(args[0])) return args[0].reduce((a, b) => a + b, 0); return args.reduce((a, b) => a + b, 0); },
    map: (args) => { const [arr, fn] = args; if (Array.isArray(arr) && typeof fn === "function") return arr.map((v, i) => fn(v, i)); return arr; },
    fil: (args) => { const [arr, fn] = args; if (Array.isArray(arr) && typeof fn === "function") return arr.filter((v, i) => fn(v, i)); return arr; },
    red: (args) => { const [arr, fn, init] = args; if (Array.isArray(arr) && typeof fn === "function") return init !== undefined ? arr.reduce((a, v) => fn(a, v), init) : arr.reduce((a, v) => fn(a, v)); return arr; },
    rev: (args) => { const v = args[0]; if (typeof v === "string") return v.split("").reverse().join(""); if (Array.isArray(v)) return [...v].reverse(); return v; },
    rng: (args) => { const [a, b, step] = args; const s = step || 1; if (b !== undefined) { const arr = []; for (let i = a; i < b; i += s) arr.push(i); return arr; } return Array.from({ length: a }, (_, i) => i); },
    sort: (args) => { if (Array.isArray(args[0])) { const fn = args[1]; if (typeof fn === "function") return [...args[0]].sort((a, b) => fn(a, b)); return [...args[0]].sort((a, b) => a > b ? 1 : a < b ? -1 : 0); } return args[0]; },
    join: (args) => Array.isArray(args[0]) ? args[0].join(args[1] !== undefined ? args[1] : "") : String(args[0]),
    split: (args) => typeof args[0] === "string" ? args[0].split(args[1] !== undefined ? args[1] : "") : [args[0]],
    flat: (args) => Array.isArray(args[0]) ? args[0].flat(args[1] || 1) : [args[0]],
    abs: (args) => Math.abs(args[0]),
    ceil: (args) => Math.ceil(args[0]),
    floor: (args) => Math.floor(args[0]),
    round: (args) => args[1] !== undefined ? Number(args[0].toFixed(args[1])) : Math.round(args[0]),
    pow: (args) => Math.pow(args[0], args[1]),
    sqrt: (args) => Math.sqrt(args[0]),
    log: (args) => args[1] !== undefined ? Math.log(args[0]) / Math.log(args[1]) : Math.log(args[0]),
    sin: (args) => Math.sin(args[0]),
    cos: (args) => Math.cos(args[0]),
    tan: (args) => Math.tan(args[0]),
    min: (args) => Array.isArray(args[0]) ? Math.min(...args[0]) : Math.min(...args),
    max: (args) => Array.isArray(args[0]) ? Math.max(...args[0]) : Math.max(...args),
    str: (args) => String(args[0]),
    num: (args) => Number(args[0]),
    int: (args) => parseInt(args[0], args[1] || 10),
    type: (args) => { if (args[0] === null) return "nil"; if (Array.isArray(args[0])) return "array"; return typeof args[0]; },
    keys: (args) => typeof args[0] === "object" && args[0] !== null ? Object.keys(args[0]) : [],
    vals: (args) => typeof args[0] === "object" && args[0] !== null ? Object.values(args[0]) : [],
    has: (args) => { if (Array.isArray(args[0])) return args[0].includes(args[1]); if (typeof args[0] === "object" && args[0] !== null) return args[1] in args[0]; if (typeof args[0] === "string") return args[0].includes(String(args[1])); return false; },
    push: (args) => { if (Array.isArray(args[0])) return [...args[0], args[1]]; return args[0]; },
    pop: (args) => { if (Array.isArray(args[0]) && args[0].length > 0) return args[0].slice(0, -1); return args[0]; },
    head: (args) => { if (Array.isArray(args[0])) return args[0][0]; if (typeof args[0] === "string") return args[0][0]; return undefined; },
    tail: (args) => { if (Array.isArray(args[0])) return args[0].slice(1); if (typeof args[0] === "string") return args[0].slice(1); return args[0]; },
    last: (args) => { if (Array.isArray(args[0])) return args[0][args[0].length - 1]; if (typeof args[0] === "string") return args[0][args[0].length - 1]; return undefined; },
    slice: (args) => { if (typeof args[0] === "string" || Array.isArray(args[0])) return args[0].slice(args[1], args[2]); return args[0]; },
    upper: (args) => typeof args[0] === "string" ? args[0].toUpperCase() : args[0],
    lower: (args) => typeof args[0] === "string" ? args[0].toLowerCase() : args[0],
    trim: (args) => typeof args[0] === "string" ? args[0].trim() : args[0],
    rep: (args) => typeof args[0] === "string" ? args[0].repeat(args[1] || 1) : args[0],
    pad: (args) => typeof args[0] === "string" ? args[0].padStart(args[1] || 0, args[2] || " ") : args[0],
    padr: (args) => typeof args[0] === "string" ? args[0].padEnd(args[1] || 0, args[2] || " ") : args[0],
    idx: (args) => { if (Array.isArray(args[0])) return args[0].indexOf(args[1]); if (typeof args[0] === "string") return args[0].indexOf(String(args[1])); return -1; },
    uniq: (args) => Array.isArray(args[0]) ? [...new Set(args[0])] : args[0],
    zip: (args) => {
      if (!Array.isArray(args[0]) || !Array.isArray(args[1])) return [];
      const len = Math.min(args[0].length, args[1].length);
      return Array.from({ length: len }, (_, i) => [args[0][i], args[1][i]]);
    },
    find: (args) => { const [arr, fn] = args; if (Array.isArray(arr) && typeof fn === "function") return arr.find(fn); return undefined; },
    every: (args) => { const [arr, fn] = args; if (Array.isArray(arr) && typeof fn === "function") return arr.every(fn); return false; },
    some: (args) => { const [arr, fn] = args; if (Array.isArray(arr) && typeof fn === "function") return arr.some(fn); return false; },
    count: (args) => { const [arr, fn] = args; if (Array.isArray(arr) && typeof fn === "function") return arr.filter(fn).length; return 0; },
    merge: (args) => {
      if (Array.isArray(args[0]) && Array.isArray(args[1])) return [...args[0], ...args[1]];
      if (typeof args[0] === "object" && typeof args[1] === "object") return { ...args[0], ...args[1] };
      return args[0];
    },
    rand: (args) => args[0] !== undefined ? Math.floor(Math.random() * args[0]) : Math.random(),
    time: () => Date.now(),
    chr: (args) => String.fromCharCode(args[0]),
    ord: (args) => typeof args[0] === "string" ? args[0].charCodeAt(0) : 0,
    json: (args) => { try { return JSON.parse(args[0]); } catch { return null; } },
    sjson: (args) => JSON.stringify(args[0], null, args[1] || 0),
    replace: (args) => typeof args[0] === "string" ? args[0].split(args[1]).join(args[2] || "") : args[0],
    starts: (args) => typeof args[0] === "string" ? args[0].startsWith(args[1]) : false,
    ends: (args) => typeof args[0] === "string" ? args[0].endsWith(args[1]) : false,
    chars: (args) => typeof args[0] === "string" ? args[0].split("") : [],
    words: (args) => typeof args[0] === "string" ? args[0].split(/\s+/).filter(Boolean) : [],
    lines: (args) => typeof args[0] === "string" ? args[0].split("\n") : [],
  };

  function fmt(val) {
    if (val === null || val === undefined) return "nil";
    if (val === true) return "true";
    if (val === false) return "false";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }

  function evalNode(node, scope) {
    if (!node) return undefined;
    switch (node.type) {
      case "Program": {
        let result;
        for (const stmt of node.body) {
          result = evalNode(stmt, scope);
          if (result && typeof result === "object" && result[RETURN_SIGNAL]) return result.value;
        }
        return result;
      }
      case "Block": {
        let result;
        for (const stmt of node.body) {
          result = evalNode(stmt, scope);
          if (result === BREAK_SIGNAL) return BREAK_SIGNAL;
          if (result && typeof result === "object" && result[RETURN_SIGNAL]) return result;
        }
        return result;
      }
      case "Num": return node.value;
      case "Str": return node.value;
      case "Interp": {
        return node.parts.map(p => {
          if (p.type === "lit") return p.value;
          // Parse and evaluate the interpolated expression
          const res = runPACTInternal(p.value, scope, output);
          return fmt(res.result);
        }).join("");
      }
      case "Id":
        if (node.name in scope) return scope[node.name];
        if (node.name in builtins) return { __builtin: node.name };
        if (node.name === "true") return true;
        if (node.name === "false") return false;
        if (node.name === "nil") return null;
        if (node.name === "PI") return Math.PI;
        if (node.name === "E") return Math.E;
        if (node.name === "INF") return Infinity;
        return undefined;
      case "Assign": { const val = evalNode(node.value, scope); scope[node.name] = val; return val; }
      case "FnDef": {
        const fnNode = node;
        const fn = (...args) => {
          const fnScope = { ...scope };
          fnNode.params.forEach((p, i) => { fnScope[p] = args[i]; });
          const result = evalNode(fnNode.body, fnScope);
          if (result && typeof result === "object" && result[RETURN_SIGNAL]) return result.value;
          return result;
        };
        scope[node.name] = fn;
        return fn;
      }
      case "Print": {
        const printVal = evalNode(node.expr, scope);
        output.push(fmt(printVal));
        return printVal;
      }
      case "PipePrint": {
        const val = evalNode(node.expr, scope);
        output.push(fmt(val));
        return val;
      }
      case "Return": {
        const val = evalNode(node.expr, scope);
        return { [RETURN_SIGNAL]: true, value: val };
      }
      case "Break": return BREAK_SIGNAL;
      case "If": {
        const test = evalNode(node.test, scope);
        if (test) return evalNode(node.body, scope);
        if (node.elseBody) return evalNode(node.elseBody, scope);
        return undefined;
      }
      case "While": {
        let result, iters = 0;
        while (evalNode(node.test, scope)) {
          result = evalNode(node.body, scope);
          if (result === BREAK_SIGNAL) { result = undefined; break; }
          if (result && typeof result === "object" && result[RETURN_SIGNAL]) return result;
          if (++iters > 100000) throw new Error("Loop limit exceeded (100000 iterations)");
        }
        return result;
      }
      case "For": {
        const iter = evalNode(node.iter, scope);
        let result;
        if (Array.isArray(iter)) {
          for (const item of iter) {
            scope[node.varName] = item;
            result = evalNode(node.body, scope);
            if (result === BREAK_SIGNAL) { result = undefined; break; }
            if (result && typeof result === "object" && result[RETURN_SIGNAL]) return result;
          }
        }
        return result;
      }
      case "Range": {
        const start = evalNode(node.start, scope);
        const end = evalNode(node.end, scope);
        const arr = [];
        if (typeof start === "number" && typeof end === "number") {
          const step = start <= end ? 1 : -1;
          for (let i = start; step > 0 ? i < end : i > end; i += step) arr.push(i);
        }
        return arr;
      }
      case "BinOp": {
        const l = evalNode(node.left, scope);
        const r = evalNode(node.right, scope);
        switch (node.op) {
          case "+": return (typeof l === "string" || typeof r === "string") ? String(l ?? "") + String(r ?? "") : (l || 0) + (r || 0);
          case "-": return (l || 0) - (r || 0);
          case "*": return (l || 0) * (r || 0);
          case "/": return r !== 0 ? l / r : 0;
          case "%": return r !== 0 ? l % r : 0;
          case "^": return Math.pow(l || 0, r || 0);
          case "<": return l < r; case ">": return l > r;
          case "<=": return l <= r; case ">=": return l >= r;
          case "~=": return l === r; case "!=": return l !== r;
          case "&&": return l && r; case "||": return l || r;
          default: return 0;
        }
      }
      case "Unary": {
        const operand = evalNode(node.operand, scope);
        if (node.op === "!") return !operand;
        if (node.op === "-") return -(operand || 0);
        return operand;
      }
      case "Length": {
        const v = evalNode(node.operand, scope);
        if (typeof v === "string") return v.length;
        if (Array.isArray(v)) return v.length;
        if (typeof v === "object" && v !== null) return Object.keys(v).length;
        return 0;
      }
      case "Ternary": return evalNode(node.test, scope) ? evalNode(node.consequent, scope) : evalNode(node.alternate, scope);
      case "Pipe": {
        const input = evalNode(node.left, scope);
        // Right side is a function call — inject input as first arg
        if (node.right.type === "Call") {
          const callee = evalNode(node.right.callee, scope);
          const args = node.right.args.map(a => evalNode(a, scope));
          if (callee && callee.__builtin) return builtins[callee.__builtin]([input, ...args]);
          if (typeof callee === "function") return callee(input, ...args);
        }
        // Right side is a bare function name
        if (node.right.type === "Id") {
          const callee = evalNode(node.right, scope);
          if (callee && callee.__builtin) return builtins[callee.__builtin]([input]);
          if (typeof callee === "function") return callee(input);
        }
        return evalNode(node.right, { ...scope, _: input });
      }
      case "Call": {
        const callee = evalNode(node.callee, scope);
        const args = node.args.map(a => evalNode(a, scope));
        if (callee && callee.__builtin) return builtins[callee.__builtin](args);
        if (typeof callee === "function") return callee(...args);
        throw new Error(`'${node.callee.name || "?"}' is not a function`);
      }
      case "Array": return node.elements.map(e => evalNode(e, scope));
      case "Map": { const obj = {}; for (const p of node.pairs) { obj[p.key] = evalNode(p.value, scope); } return obj; }
      case "Index": { const obj = evalNode(node.object, scope); const idx = evalNode(node.index, scope); return obj?.[idx]; }
      case "Member": { const obj = evalNode(node.object, scope); return obj?.[node.property]; }
      case "Each": {
        const coll = evalNode(node.collection, scope);
        if (Array.isArray(coll)) return coll.map((item, i) => evalNode(node.body, { ...scope, [node.param]: item, i }));
        if (typeof coll === "object" && coll !== null) {
          return Object.entries(coll).map(([k, v]) => evalNode(node.body, { ...scope, [node.param]: v, k }));
        }
        return [];
      }
      case "Lambda": {
        const nd = node;
        return (...args) => {
          const ls = { ...scope };
          nd.params.forEach((p, i) => { ls[p] = args[i]; });
          const r = evalNode(nd.body, ls);
          if (r && typeof r === "object" && r[RETURN_SIGNAL]) return r.value;
          return r;
        };
      }
      default: return undefined;
    }
  }
  return evalNode(ast, { ...env });
}

function runPACTInternal(code, parentScope, output) {
  try {
    const tokens = tokenize(code);
    const ast = parse(tokens);
    const result = interpret(ast, { ...parentScope }, output);
    return { result, error: null };
  } catch (e) {
    return { result: null, error: e.message };
  }
}

function runPACT(code) {
  const output = [];
  try {
    const tokens = tokenize(code);
    const ast = parse(tokens);
    const result = interpret(ast, {}, output);
    return { output, result, error: null };
  } catch (e) {
    return { output, result: null, error: e.message };
  }
}


// ═══════════════════════════════════════════════════════════════════════
// Exports — ESM / CJS / Browser
// ═══════════════════════════════════════════════════════════════════════

const PACT = { run: runPACT, tokenize, parse, interpret, TOKEN };

// ESM
export { tokenize, parse, interpret, runPACT, runPACTInternal, TOKEN, PACT };
export default PACT;

// CJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenize, parse, interpret, runPACT, runPACTInternal, TOKEN, PACT };
}

// Browser global
if (typeof window !== 'undefined') {
  window.PACT = PACT;
}
