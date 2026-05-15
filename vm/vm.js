const TokenType = {
    NIL: "NIL", TRUE: "TRUE", FALSE: "FALSE",
    NUMBER: "NUMBER", STRING: "STRING", IDENT: "IDENT",
    LOCAL: "LOCAL", IF: "IF", THEN: "THEN", ELSE: "ELSE",
    ELSEIF: "ELSEIF", END: "END", WHILE: "WHILE", DO: "DO",
    REPEAT: "REPEAT", UNTIL: "UNTIL", FOR: "FOR", IN: "IN",
    FUNCTION: "FUNCTION", RETURN: "RETURN", BREAK: "BREAK",
    AND: "AND", OR: "OR", NOT: "NOT",
    PLUS: "PLUS", MINUS: "MINUS", STAR: "STAR", SLASH: "SLASH",
    PERCENT: "PERCENT", CARET: "CARET", DOT: "DOT",
    DOT2: "DOT2", DOT3: "DOT3", EQ: "EQ", NEQ: "NEQ",
    LTE: "LTE", GTE: "GTE", LT: "LT", GT: "GT",
    ASSIGN: "ASSIGN", LPAREN: "LPAREN", RPAREN: "RPAREN",
    LBRACE: "LBRACE", RBRACE: "RBRACE", LBRACKET: "LBRACKET",
    RBRACKET: "RBRACKET", SEMI: "SEMI", COLON: "COLON",
    COMMA: "COMMA", HASH: "HASH",
    EOF: "EOF"
};

const Keywords = {
    "nil": "NIL", "true": "TRUE", "false": "FALSE",
    "local": "LOCAL", "if": "IF", "then": "THEN", "else": "ELSE",
    "elseif": "ELSEIF", "end": "END", "while": "WHILE", "do": "DO",
    "repeat": "REPEAT", "until": "UNTIL", "for": "FOR", "in": "IN",
    "function": "FUNCTION", "return": "RETURN", "break": "BREAK",
    "and": "AND", "or": "OR", "not": "NOT"
};

class Lexer {
    constructor(src) {
        this.src = src;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
    }
    peek(off = 0) { return this.src[this.pos + off] || "\0"; }
    advance() {
        const c = this.src[this.pos];
        this.pos++;
        if (c === "\n") { this.line++; this.col = 1; }
        else { this.col++; }
        return c;
    }
    skip() {
        while (" \t\r\n".includes(this.peek())) this.advance();
        if (this.peek() === "-" && this.peek(1) === "-") {
            if (this.peek(2) === "[") {
                if (this.peek(3) === "[" || this.peek(3) === "=") this.readBlockComment();
                else this.readLineComment();
            } else this.readLineComment();
            this.skip();
        }
    }
    readLineComment() { while (this.peek() !== "\n" && this.peek() !== "\0") this.advance(); }
    readBlockComment() {
        this.advance(); this.advance(); this.advance();
        let depth = 0;
        while (this.peek() === "=") { depth++; this.advance(); }
        if (this.peek() !== "[") {
            while (this.peek() !== "\n" && this.peek() !== "\0") this.advance();
            return;
        }
        this.advance();
        const end = "]" + "=".repeat(depth) + "]";
        while (this.pos + end.length <= this.src.length) {
            if (this.src.slice(this.pos, this.pos + end.length) === end) { this.pos += end.length; return; }
            this.advance();
        }
    }
    readString(q) {
        let s = ""; this.advance();
        while (this.peek() !== q && this.peek() !== "\0") {
            if (this.peek() === "\\") {
                this.advance();
                const e = this.advance();
                const m = { n: "\n", t: "\t", r: "\r", '"': '"', "'": "'", "\\": "\\" };
                if (m[e]) s += m[e];
                else if (e === "x") {
                    let hex = this.advance() + this.advance();
                    s += String.fromCharCode(parseInt(hex, 16));
                } else if (/[0-9]/.test(e)) {
                    let code = e;
                    if (/[0-9]/.test(this.peek())) code += this.advance();
                    if (/[0-9]/.test(this.peek())) code += this.advance();
                    s += String.fromCharCode(parseInt(code, 10));
                } else s += e;
            } else s += this.advance();
        }
        this.advance();
        return { type: TokenType.STRING, value: s, line: this.line, col: this.col };
    }
    readLongString() {
        this.advance();
        let depth = 0;
        while (this.peek() === "=") { depth++; this.advance(); }
        if (this.peek() !== "[") {
            this.tokens.push({ type: TokenType.LBRACKET, value: "[", line: this.line, col: this.col });
            for (let i = 0; i < depth; i++) this.tokens.push({ type: TokenType.ASSIGN, value: "=", line: this.line, col: this.col });
            return;
        }
        this.advance();
        const end = "]" + "=".repeat(depth) + "]";
        let s = "";
        while (this.pos + end.length <= this.src.length) {
            if (this.src.slice(this.pos, this.pos + end.length) === end) { this.pos += end.length; return { type: TokenType.STRING, value: s, line: this.line, col: this.col }; }
            s += this.advance();
        }
        throw new Error("Unterminated long string at line " + this.line);
    }
    readNumber() {
        let s = "";
        if (this.peek() === "0" && (this.peek(1) === "x" || this.peek(1) === "X")) {
            s += this.advance(); s += this.advance();
            while (/[0-9a-fA-F]/.test(this.peek())) s += this.advance();
        } else {
            let dotCount = 0;
            while (/[0-9]/.test(this.peek()) || (this.peek() === "." && dotCount === 0)) {
                if (this.peek() === ".") dotCount++;
                s += this.advance();
            }
            if (this.peek() === "e" || this.peek() === "E") {
                s += this.advance();
                if (this.peek() === "+" || this.peek() === "-") s += this.advance();
                while (/[0-9]/.test(this.peek())) s += this.advance();
            }
        }
        return { type: TokenType.NUMBER, value: parseFloat(s), raw: s, line: this.line, col: this.col };
    }
    readIdent() {
        let s = "";
        while (/[a-zA-Z0-9_]/.test(this.peek())) s += this.advance();
        const kw = Keywords[s];
        return { type: kw ? TokenType[kw] : TokenType.IDENT, value: s, line: this.line, col: this.col };
    }
    tokenize() {
        while (this.peek() !== "\0") {
            this.skip();
            const c = this.peek();
            if (c === "\0") break;
            const line = this.line, col = this.col;
            if (c === '"' || c === "'") { this.tokens.push(this.readString(c)); continue; }
            if (c === "[") {
                if (this.peek(1) === "[") { this.tokens.push(this.readLongString()); continue; }
                if (this.peek(1) === "=") {
                    let d = 2;
                    while (this.peek(d) === "=") d++;
                    if (this.peek(d) === "[") { this.tokens.push(this.readLongString()); continue; }
                }
            }
            if (/[0-9]/.test(c)) { this.tokens.push(this.readNumber()); continue; }
            if (/[a-zA-Z_]/.test(c)) { this.tokens.push(this.readIdent()); continue; }
            const two = c + this.peek(1);
            const mc = { "..": "DOT2", "...": "DOT3", "==": "EQ", "~=": "NEQ", "<=": "LTE", ">=": "GTE" };
            if (two === "...") { this.advance(); this.advance(); this.advance(); this.tokens.push({ type: TokenType.DOT3, line, col }); continue; }
            if (mc[two]) { this.advance(); this.advance(); this.tokens.push({ type: TokenType[mc[two]], line, col }); continue; }
            const sc = {
                "+": "PLUS", "-": "MINUS", "*": "STAR", "/": "SLASH", "%": "PERCENT", "^": "CARET", "#": "HASH",
                "(": "LPAREN", ")": "RPAREN", "{": "LBRACE", "}": "RBRACE", "[": "LBRACKET", "]": "RBRACKET",
                ";": "SEMI", ":": "COLON", ",": "COMMA", ".": "DOT"
            };
            if (sc[c]) { this.advance(); this.tokens.push({ type: TokenType[sc[c]], value: c, line, col }); continue; }
            if (c === "<" || c === ">") { this.advance(); this.tokens.push({ type: TokenType[c === "<" ? "LT" : "GT"], line, col }); continue; }
            if (c === "=") { this.advance(); this.tokens.push({ type: TokenType.ASSIGN, line, col }); continue; }
            this.advance();
        }
        this.tokens.push({ type: TokenType.EOF, line: this.line, col: this.col });
        return this.tokens;
    }
}

const AST = {
    Chunk: (body) => ({ type: "Chunk", body }),
    Block: (body) => ({ type: "Block", body }),
    Do: (body) => ({ type: "DoStatement", body }),
    Literal: (val, raw) => ({ type: "Literal", value: val, raw }),
    Identifier: (name) => ({ type: "Identifier", name }),
    Vararg: () => ({ type: "Vararg" }),
    BinaryExpr: (op, left, right) => ({ type: "BinaryExpression", operator: op, left, right }),
    UnaryExpr: (op, arg) => ({ type: "UnaryExpression", operator: op, argument: arg }),
    IndexExpr: (base, index) => ({ type: "IndexExpression", base, index }),
    MemberExpr: (base, id, computed) => ({ type: "MemberExpression", base, identifier: id, computed }),
    CallExpr: (base, args) => ({ type: "CallExpression", base, arguments: args }),
    Table: (fields) => ({ type: "Table", fields }),
    TableField: (key, val) => ({ type: "TableField", key, value: val }),
    Function: (params, body, local) => ({ type: "FunctionDeclaration", params, body, local }),
    LocalDeclaration: (names, inits) => ({ type: "LocalDeclaration", names, inits }),
    Assignment: (names, vals) => ({ type: "AssignmentStatement", names, values: vals }),
    If: (cond, thenBody, elseBody) => ({ type: "IfStatement", condition: cond, then: thenBody, else: elseBody }),
    While: (cond, body) => ({ type: "WhileStatement", condition: cond, body }),
    Repeat: (body, cond) => ({ type: "RepeatStatement", body, condition: cond }),
    ForNumeric: (name, start, end, step, body) => ({ type: "ForNumericStatement", name, start, end, step, body }),
    ForGeneric: (names, exps, body) => ({ type: "ForGenericStatement", names, expressions: exps, body }),
    Return: (args) => ({ type: "ReturnStatement", arguments: args }),
    Break: () => ({ type: "BreakStatement" }),
    ExpressionStatement: (expr) => ({ type: "ExpressionStatement", expression: expr })
};

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }
    cur() { return this.tokens[this.pos] || this.tokens[this.tokens.length - 1]; }
    peek(off = 1) { return this.tokens[this.pos + off] || this.cur(); }
    advance() { return this.tokens[this.pos++]; }
    eat(t) {
        if (this.cur().type === t) return this.advance();
        throw new Error("Expected " + t + " at line " + this.cur().line);
    }
    match(...ts) { return ts.includes(this.cur().type); }
    parse() {
        const body = [];
        while (!this.match(TokenType.EOF)) { body.push(this.stat()); if (this.match(TokenType.SEMI)) this.advance(); }
        return AST.Chunk(body);
    }
    stat() {
        const t = this.cur();
        if (this.match(TokenType.LOCAL)) return this.localStat();
        if (this.match(TokenType.IF)) return this.ifStat();
        if (this.match(TokenType.WHILE)) return this.whileStat();
        if (this.match(TokenType.REPEAT)) return this.repeatStat();
        if (this.match(TokenType.FOR)) return this.forStat();
        if (this.match(TokenType.FUNCTION)) return this.funcStat();
        if (this.match(TokenType.RETURN)) return this.retStat();
        if (this.match(TokenType.BREAK)) { this.advance(); return AST.Break(); }
        if (this.match(TokenType.DO)) return this.doStat();
        return this.assignOrCall();
    }
    block() {
        const body = [];
        while (!this.match(TokenType.END, TokenType.ELSE, TokenType.ELSEIF, TokenType.UNTIL, TokenType.EOF)) {
            if (this.match(TokenType.BREAK)) { body.push(this.stat()); break; }
            if (this.match(TokenType.RETURN)) { body.push(this.retStat()); break; }
            body.push(this.stat());
            if (this.match(TokenType.SEMI)) this.advance();
        }
        return AST.Block(body);
    }
    doStat() { this.eat(TokenType.DO); const body = this.block(); this.eat(TokenType.END); return AST.Do(body); }
    localStat() {
        this.eat(TokenType.LOCAL);
        if (this.match(TokenType.FUNCTION)) return this.localFunc();
        const names = this.nameList();
        let inits = [];
        if (this.match(TokenType.ASSIGN)) { this.advance(); inits = this.expList(); }
        return AST.LocalDeclaration(names, inits);
    }
    localFunc() {
        this.eat(TokenType.FUNCTION);
        const name = this.eat(TokenType.IDENT).value;
        const [params, body] = this.funcBody();
        return AST.LocalDeclaration([AST.Identifier(name)], [AST.Function(params.map(AST.Identifier), body, true)]);
    }
    funcStat() {
        this.eat(TokenType.FUNCTION);
        const names = [this.eat(TokenType.IDENT).value];
        while (this.match(TokenType.DOT)) { this.advance(); names.push(this.eat(TokenType.IDENT).value); }
        let self = false;
        if (this.match(TokenType.COLON)) { this.advance(); names.push(this.eat(TokenType.IDENT).value); self = true; }
        const [params, body] = this.funcBody();
        if (self) params.unshift("self");
        let base = AST.Identifier(names[0]);
        for (let i = 1; i < names.length; i++) {
            base = AST.MemberExpr(base, AST.Identifier(names[i]), false);
        }
        const fn = AST.Function(params.map(AST.Identifier), body, false);
        return AST.Assignment([base], [fn]);
    }
    funcBody() {
        this.eat(TokenType.LPAREN);
        const params = [];
        if (!this.match(TokenType.RPAREN)) {
            while (true) {
                if (this.match(TokenType.DOT3)) { this.advance(); params.push("..."); break; }
                params.push(this.eat(TokenType.IDENT).value);
                if (this.match(TokenType.COMMA)) this.advance(); else break;
            }
        }
        this.eat(TokenType.RPAREN);
        const body = this.block();
        this.eat(TokenType.END);
        return [params, body];
    }
    ifStat() {
        this.eat(TokenType.IF);
        const cond = this.exp();
        this.eat(TokenType.THEN);
        const thenBody = this.block();
        const elseifs = [];
        while (this.match(TokenType.ELSEIF)) {
            this.advance();
            const econd = this.exp();
            this.eat(TokenType.THEN);
            const ethen = this.block();
            elseifs.push({ cond: econd, body: ethen });
        }
        let elseBody = null;
        if (this.match(TokenType.ELSE)) { this.advance(); elseBody = this.block(); }
        this.eat(TokenType.END);
        let chain = elseBody;
        for (let i = elseifs.length - 1; i >= 0; i--) {
            chain = AST.If(elseifs[i].cond, elseifs[i].body, chain);
        }
        return AST.If(cond, thenBody, chain);
    }
    whileStat() {
        this.eat(TokenType.WHILE);
        const cond = this.exp();
        this.eat(TokenType.DO);
        const body = this.block();
        this.eat(TokenType.END);
        return AST.While(cond, body);
    }
    repeatStat() {
        this.eat(TokenType.REPEAT);
        const body = this.block();
        this.eat(TokenType.UNTIL);
        const cond = this.exp();
        return AST.Repeat(body, cond);
    }
    forStat() {
        this.eat(TokenType.FOR);
        const name = this.eat(TokenType.IDENT).value;
        if (this.match(TokenType.ASSIGN)) {
            this.advance();
            const start = this.exp();
            this.eat(TokenType.COMMA);
            const end = this.exp();
            let step = AST.Literal(1, "1");
            if (this.match(TokenType.COMMA)) { this.advance(); step = this.exp(); }
            this.eat(TokenType.DO);
            const body = this.block();
            this.eat(TokenType.END);
            return AST.ForNumeric(AST.Identifier(name), start, end, step, body);
        }
        const names = [AST.Identifier(name)];
        while (this.match(TokenType.COMMA)) { this.advance(); names.push(AST.Identifier(this.eat(TokenType.IDENT).value)); }
        this.eat(TokenType.IN);
        const exps = this.expList();
        this.eat(TokenType.DO);
        const body = this.block();
        this.eat(TokenType.END);
        return AST.ForGeneric(names, exps, body);
    }
    retStat() {
        this.eat(TokenType.RETURN);
        let args = [];
        if (!this.match(TokenType.END, TokenType.ELSE, TokenType.ELSEIF, TokenType.UNTIL, TokenType.EOF, TokenType.SEMI)) args = this.expList();
        return AST.Return(args);
    }
    assignOrCall() {
        const exps = this.expList();
        if (exps.length === 1 && this.match(TokenType.ASSIGN)) {
            this.advance();
            const vals = this.expList();
            return AST.Assignment([exps[0]], vals);
        }
        if (exps.length === 1 && (exps[0].type === "CallExpression" || exps[0].type === "MemberExpression")) return AST.ExpressionStatement(exps[0]);
        if (this.match(TokenType.ASSIGN)) { this.advance(); const vals = this.expList(); return AST.Assignment(exps, vals); }
        return AST.ExpressionStatement(exps[0]);
    }
    expList() { const list = [this.exp()]; while (this.match(TokenType.COMMA)) { this.advance(); list.push(this.exp()); } return list; }
    nameList() { const list = [AST.Identifier(this.eat(TokenType.IDENT).value)]; while (this.match(TokenType.COMMA)) { this.advance(); list.push(AST.Identifier(this.eat(TokenType.IDENT).value)); } return list; }
    exp() { return this.or(); }
    or() { let n = this.and(); while (this.match(TokenType.OR)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.and()); } return n; }
    and() { let n = this.rel(); while (this.match(TokenType.AND)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.rel()); } return n; }
    rel() { let n = this.concat(); while (this.match(TokenType.EQ, TokenType.NEQ, TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.concat()); } return n; }
    concat() { let n = this.add(); if (this.match(TokenType.DOT2)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.concat()); } return n; }
    add() { let n = this.mul(); while (this.match(TokenType.PLUS, TokenType.MINUS)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.mul()); } return n; }
    mul() { let n = this.unary(); while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.unary()); } return n; }
    unary() { if (this.match(TokenType.MINUS, TokenType.NOT, TokenType.HASH)) { const op = this.advance().type; return AST.UnaryExpr(op, this.unary()); } return this.pow(); }
    pow() { let n = this.primary(); if (this.match(TokenType.CARET)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.unary()); } return n; }
    primary() {
        let n;
        const t = this.cur();
        if (this.match(TokenType.NIL)) { this.advance(); n = AST.Literal(null, "nil"); }
        else if (this.match(TokenType.TRUE)) { this.advance(); n = AST.Literal(true, "true"); }
        else if (this.match(TokenType.FALSE)) { this.advance(); n = AST.Literal(false, "false"); }
        else if (this.match(TokenType.NUMBER)) { const v = this.advance(); n = AST.Literal(v.value, v.raw); }
        else if (this.match(TokenType.STRING)) { const v = this.advance(); n = AST.Literal(v.value, v.value); }
        else if (this.match(TokenType.DOT3)) { this.advance(); n = AST.Vararg(); }
        else if (this.match(TokenType.FUNCTION)) { this.advance(); const [params, body] = this.funcBody(); n = AST.Function(params.map(AST.Identifier), body, false); }
        else if (this.match(TokenType.LBRACE)) { n = this.table(); }
        else if (this.match(TokenType.IDENT)) { n = AST.Identifier(this.advance().value); }
        else if (this.match(TokenType.LPAREN)) { this.advance(); n = this.exp(); this.eat(TokenType.RPAREN); }
        else throw new Error("Unexpected " + t.type + " at line " + t.line);
        while (true) {
            if (this.match(TokenType.LPAREN) || this.match(TokenType.LBRACE) || this.match(TokenType.STRING)) { const args = this.args(); n = AST.CallExpr(n, args); }
            else if (this.match(TokenType.COLON)) { this.advance(); const id = AST.Identifier(this.eat(TokenType.IDENT).value); const args = this.args(); n = AST.CallExpr(AST.MemberExpr(n, id, false), [n, ...args]); }
            else if (this.match(TokenType.LBRACKET)) { this.advance(); const idx = this.exp(); this.eat(TokenType.RBRACKET); n = AST.IndexExpr(n, idx); }
            else if (this.match(TokenType.DOT)) { this.advance(); n = AST.MemberExpr(n, AST.Identifier(this.eat(TokenType.IDENT).value), false); }
            else break;
        }
        return n;
    }
    args() {
        if (this.match(TokenType.LPAREN)) { this.advance(); const args = []; if (!this.match(TokenType.RPAREN)) args.push(...this.expList()); this.eat(TokenType.RPAREN); return args; }
        if (this.match(TokenType.LBRACE)) return [this.table()];
        if (this.match(TokenType.STRING)) { const v = this.advance(); return [AST.Literal(v.value, v.value)]; }
        return [];
    }
    table() {
        this.eat(TokenType.LBRACE);
        const fields = [];
        while (!this.match(TokenType.RBRACE)) {
            let key = null, val;
            if (this.match(TokenType.LBRACKET)) { this.advance(); key = this.exp(); this.eat(TokenType.RBRACKET); this.eat(TokenType.ASSIGN); val = this.exp(); }
            else if (this.match(TokenType.IDENT) && this.peek().type === TokenType.ASSIGN) { key = AST.Literal(this.advance().value, null); this.eat(TokenType.ASSIGN); val = this.exp(); }
            else val = this.exp();
            fields.push(AST.TableField(key, val));
            if (this.match(TokenType.COMMA) || this.match(TokenType.SEMI)) this.advance(); else break;
        }
        this.eat(TokenType.RBRACE);
        return AST.Table(fields);
    }
}

function parseLua(src) {
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
}

function luaPatternToRegex(p) {
    return p.replace(/%%/g, "\x00")
        .replace(/%a/g, "[a-zA-Z]")
        .replace(/%c/g, "[\\x00-\\x1f]")
        .replace(/%d/g, "[0-9]")
        .replace(/%l/g, "[a-z]")
        .replace(/%p/g, "[!\"#$%&'()*+,\\-./:;<=>?@[\\\\\\]^_`{|}~]")
        .replace(/%s/g, "[\\t\\r\\n\\f\\v ]")
        .replace(/%u/g, "[A-Z]")
        .replace(/%w/g, "[a-zA-Z0-9]")
        .replace(/%x/g, "[0-9a-fA-F]")
        .replace(/%z/g, "\\x00")
        .replace(/\x00/g, "%");
}

function tableLen(t) {
    let len = 0;
    for (const k in t) {
        const nk = Number(k);
        if (typeof nk === "number" && nk > 0 && Math.floor(nk) === nk && nk > len) len = nk;
    }
    return len;
}

const VM = {
    env: {},
    callstack: [],
    running: false,

    init: function() {
        this.env = {
            print: function(...args) { console.log(...args); return []; },
            type: function(v) { return [typeof v]; },
            tonumber: function(v) { return [parseFloat(v)]; },
            tostring: function(v) { return [String(v)]; },
            ipairs: function(t) {
                return [function(state, i) {
                    i = (i === undefined || i === null) ? 0 : i;
                    i++;
                    if (state[i] !== undefined && state[i] !== null) return [i, state[i]];
                    return [undefined];
                }, t, 0];
            },
            pairs: function(t) {
                const keys = Object.keys(t);
                let i = 0;
                return [function(state) {
                    if (i < keys.length) {
                        const k = keys[i++];
                        return [k, state[k]];
                    }
                    return [undefined];
                }, t, undefined];
            },
            next: function(t, k) {
                const keys = Object.keys(t);
                const i = (k === undefined || k === null) ? 0 : keys.indexOf(String(k)) + 1;
                if (i < keys.length) return [keys[i], t[keys[i]]];
                return [undefined];
            },
            getmetatable: function(t) { return [t && t.__metatable]; },
            setmetatable: function(t, mt) { t.__metatable = mt; return [t]; },
            rawget: function(t, k) { return [t[k]]; },
            rawset: function(t, k, v) { t[k] = v; return [t]; },
            rawequal: function(a, b) { return [a === b]; },
            assert: function(v, m) { if (!v) throw new Error(m || "assertion failed"); return [v]; },
            error: function(m) { throw new Error(m); },
            pcall: function(f, ...args) {
                try {
                    const r = f(...args);
                    if (Array.isArray(r)) return [true, ...r];
                    return [true, r];
                } catch(e) {
                    return [false, e.message];
                }
            },
            loadstring: function(s) { return [parseLua(s)]; },
            collectgarbage: function() { return [0]; },
            math: {
                abs: function(x) { return [Math.abs(x)]; },
                acos: function(x) { return [Math.acos(x)]; },
                asin: function(x) { return [Math.asin(x)]; },
                atan: function(x) { return [Math.atan(x)]; },
                atan2: function(y, x) { return [Math.atan2(y, x)]; },
                ceil: function(x) { return [Math.ceil(x)]; },
                cos: function(x) { return [Math.cos(x)]; },
                cosh: function(x) { return [Math.cosh(x)]; },
                deg: function(x) { return [x * 180 / Math.PI]; },
                exp: function(x) { return [Math.exp(x)]; },
                floor: function(x) { return [Math.floor(x)]; },
                fmod: function(x, y) { return [x % y]; },
                frexp: function(x) { return [x, 0]; },
                ldexp: function(m, e) { return [m * Math.pow(2, e)]; },
                log: function(x) { return [Math.log(x)]; },
                log10: function(x) { return [Math.log10(x)]; },
                max: function(...args) { return [Math.max(...args)]; },
                min: function(...args) { return [Math.min(...args)]; },
                modf: function(x) { return [Math.floor(x), x - Math.floor(x)]; },
                pow: function(x, y) { return [Math.pow(x, y)]; },
                rad: function(x) { return [x * Math.PI / 180]; },
                random: function(m, n) {
                    if (m === undefined) return [Math.random()];
                    if (n === undefined) return [Math.floor(Math.random() * m) + 1];
                    return [Math.floor(Math.random() * (n - m + 1)) + m];
                },
                randomseed: function(s) { },
                sin: function(x) { return [Math.sin(x)]; },
                sinh: function(x) { return [Math.sinh(x)]; },
                sqrt: function(x) { return [Math.sqrt(x)]; },
                tan: function(x) { return [Math.tan(x)]; },
                tanh: function(x) { return [Math.tanh(x)]; },
                pi: Math.PI,
                huge: Infinity
            },
            string: {
                byte: function(s, i, j) {
                    i = i || 1;
                    if (j === undefined || j === null) j = i;
                    const r = [];
                    for (let k = i; k <= j; k++) r.push(s.charCodeAt(k - 1));
                    return r;
                },
                char: function(...args) { return [String.fromCharCode(...args)]; },
                find: function(s, p, i, plain) {
                    i = i || 1;
                    if (plain) {
                        const idx = s.indexOf(p, i - 1);
                        return idx === -1 ? [undefined] : [idx + 1, idx + p.length];
                    }
                    const re = new RegExp(luaPatternToRegex(p), "g");
                    re.lastIndex = i - 1;
                    const m = re.exec(s);
                    if (m) return [m.index + 1, m.index + m[0].length];
                    return [undefined];
                },
                format: function(f, ...args) { return [f.replace(/%s/g, () => args.shift()).replace(/%d/g, () => args.shift()).replace(/%f/g, () => args.shift())]; },
                gmatch: function(s, p) {
                    const re = new RegExp(luaPatternToRegex(p), "g");
                    const r = []; let m;
                    while ((m = re.exec(s)) !== null) r.push(m[0]);
                    let i = 0;
                    return [function() { if (i < r.length) return [r[i++]]; return [undefined]; }];
                },
                gsub: function(s, p, r) { return [s.replace(new RegExp(luaPatternToRegex(p), "g"), r)]; },
                len: function(s) { return [s.length]; },
                lower: function(s) { return [s.toLowerCase()]; },
                match: function(s, p, i) {
                    i = i || 1;
                    const re = new RegExp(luaPatternToRegex(p), "g");
                    re.lastIndex = i - 1;
                    const m = re.exec(s);
                    return m ? [m[0]] : [undefined];
                },
                rep: function(s, n) { return [s.repeat(n)]; },
                reverse: function(s) { return [s.split("").reverse().join("")]; },
                sub: function(s, i, j) {
                    if (i === undefined || i === null) i = 1;
                    if (j === undefined || j === null) j = s.length;
                    if (i < 0) i = s.length + i + 1;
                    if (j < 0) j = s.length + j + 1;
                    return [s.substring(i - 1, j)];
                },
                upper: function(s) { return [s.toUpperCase()]; }
            },
            table: {
                concat: function(t, sep, i, j) {
                    sep = sep || "";
                    i = i || 1;
                    const len = tableLen(t);
                    j = j || len;
                    const arr = [];
                    for (let k = i; k <= j; k++) arr.push(t[k] !== undefined && t[k] !== null ? t[k] : "");
                    return [arr.join(sep)];
                },
                insert: function(t, pos, v) {
                    if (v === undefined || v === null) { v = pos; pos = null; }
                    const len = tableLen(t);
                    if (pos === null || pos === undefined) pos = len + 1;
                    for (let i = len; i >= pos; i--) t[i + 1] = t[i];
                    t[pos] = v;
                    return [];
                },
                maxn: function(t) { return [tableLen(t)]; },
                remove: function(t, pos) {
                    const len = tableLen(t);
                    if (pos === undefined || pos === null) pos = len;
                    const val = t[pos];
                    for (let i = pos; i < len; i++) t[i] = t[i + 1];
                    delete t[len];
                    return [val];
                },
                sort: function(t, f) {
                    const arr = [];
                    const len = tableLen(t);
                    for (let i = 1; i <= len; i++) arr.push(t[i]);
                    arr.sort(f);
                    for (let i = 1; i <= len; i++) t[i] = arr[i - 1];
                    return [];
                }
            }
        };
        this.env._G = this.env;
        return this;
    },

    run: function(src) {
        this.init();
        this.callstack.push({});
        this.running = true;
        const ast = parseLua(src);
        const result = this.execChunk(ast);
        this.running = false;
        this.callstack.pop();
        return result;
    },

    execChunk: function(chunk) { return this.execBlock(chunk.body); },

    execBlock: function(stmts) {
        for (const stmt of stmts) {
            const r = this.execStmt(stmt);
            if (r && r.type === "return") return r;
            if (r && r.type === "break") return r;
        }
        return undefined;
    },

    execStmt: function(stmt) {
        if (!stmt) return undefined;
        switch (stmt.type) {
            case "LocalDeclaration": {
                const vals = stmt.inits.length ? this.evalExpList(stmt.inits) : [];
                for (let i = 0; i < stmt.names.length; i++) this.setLocal(stmt.names[i].name, vals[i] !== undefined ? vals[i] : null);
                return undefined;
            }
            case "AssignmentStatement": {
                const vals = this.evalExpList(stmt.values);
                for (let i = 0; i < stmt.names.length; i++) this.assign(stmt.names[i], vals[i] !== undefined ? vals[i] : null);
                return undefined;
            }
            case "ExpressionStatement": { this.evalExpr(stmt.expression); return undefined; }
            case "IfStatement": {
                const cond = this.evalExpr(stmt.condition);
                if (cond) {
                    const r = this.execBlock(stmt.then.body);
                    if (r && r.type === "return") return r;
                    if (r && r.type === "break") return r;
                } else if (stmt.else) {
                    let elseBody = stmt.else;
                    while (elseBody && elseBody.type === "IfStatement") {
                        const econd = this.evalExpr(elseBody.condition);
                        if (econd) {
                            const r = this.execBlock(elseBody.then.body);
                            if (r && r.type === "return") return r;
                            if (r && r.type === "break") return r;
                            return undefined;
                        }
                        elseBody = elseBody.else;
                    }
                    if (elseBody && elseBody.type === "Block") {
                        const r = this.execBlock(elseBody.body);
                        if (r && r.type === "return") return r;
                        if (r && r.type === "break") return r;
                    }
                }
                return undefined;
            }
            case "WhileStatement": {
                while (this.evalExpr(stmt.condition)) {
                    const r = this.execBlock(stmt.body.body);
                    if (r && r.type === "return") return r;
                    if (r && r.type === "break") break;
                }
                return undefined;
            }
            case "RepeatStatement": {
                do {
                    const r = this.execBlock(stmt.body.body);
                    if (r && r.type === "return") return r;
                    if (r && r.type === "break") break;
                } while (!this.evalExpr(stmt.condition));
                return undefined;
            }
            case "ForNumericStatement": {
                const start = this.evalExpr(stmt.start);
                const end = this.evalExpr(stmt.end);
                const step = this.evalExpr(stmt.step);
                this.callstack.push({});
                let result = undefined;
                for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
                    this.setLocal(stmt.name.name, i);
                    const r = this.execBlock(stmt.body.body);
                    if (r && r.type === "return") { result = r; break; }
                    if (r && r.type === "break") break;
                }
                this.callstack.pop();
                return result;
            }
            case "ForGenericStatement": {
                const exps = this.evalExpList(stmt.expressions);
                const iter = exps[0];
                const state = exps[1];
                const init = exps[2];
                this.callstack.push({});
                let result = undefined;
                let vals = iter(state, init);
                while (vals[0] !== undefined && vals[0] !== null) {
                    for (let i = 0; i < stmt.names.length; i++) this.setLocal(stmt.names[i].name, vals[i]);
                    const r = this.execBlock(stmt.body.body);
                    if (r && r.type === "return") { result = r; break; }
                    if (r && r.type === "break") break;
                    vals = iter(state, vals[0]);
                }
                this.callstack.pop();
                return result;
            }
            case "FunctionDeclaration": {
                const fn = this.createFunc(stmt.params, stmt.body);
                if (stmt.local) this.setLocal("_", fn);
                return undefined;
            }
            case "ReturnStatement": return { type: "return", values: this.evalExpList(stmt.arguments) };
            case "BreakStatement": return { type: "break" };
            case "DoStatement": {
                const r = this.execBlock(stmt.body.body);
                if (r && r.type === "return") return r;
                if (r && r.type === "break") return r;
                return undefined;
            }
            default: return undefined;
        }
    },

    evalExpr: function(expr) {
        if (!expr) return undefined;
        switch (expr.type) {
            case "Literal": return expr.value;
            case "Identifier": return this.getVar(expr.name);
            case "Vararg": return undefined;
            case "BinaryExpression": {
                const l = this.evalExpr(expr.left);
                const r = this.evalExpr(expr.right);
                switch (expr.operator) {
                    case "PLUS": return l + r;
                    case "MINUS": return l - r;
                    case "STAR": return l * r;
                    case "SLASH": return l / r;
                    case "PERCENT": return l % r;
                    case "CARET": return Math.pow(l, r);
                    case "DOT2": return String(l) + String(r);
                    case "EQ": return l === r;
                    case "NEQ": return l !== r;
                    case "LT": return l < r;
                    case "GT": return l > r;
                    case "LTE": return l <= r;
                    case "GTE": return l >= r;
                    case "AND": return l && r;
                    case "OR": return l || r;
                    default: return undefined;
                }
            }
            case "UnaryExpression": {
                const a = this.evalExpr(expr.argument);
                switch (expr.operator) {
                    case "MINUS": return -a;
                    case "NOT": return !a;
                    case "HASH": {
                        if (typeof a === "string") return a.length;
                        if (Array.isArray(a)) return a.length;
                        if (typeof a === "object" && a !== null) return tableLen(a);
                        return 0;
                    }
                    default: return undefined;
                }
            }
            case "IndexExpression": { const base = this.evalExpr(expr.base); const idx = this.evalExpr(expr.index); return base ? base[idx] : undefined; }
            case "MemberExpression": { const base = this.evalExpr(expr.base); return base ? base[expr.identifier.name] : undefined; }
            case "CallExpression": {
                const base = this.evalExpr(expr.base);
                const args = this.evalExpList(expr.arguments);
                if (typeof base === "function") {
                    const r = base(...args);
                    return Array.isArray(r) ? r[0] : r;
                }
                return undefined;
            }
            case "Table": {
                const t = {};
                let idx = 1;
                for (const f of expr.fields) {
                    if (f.key) { const k = this.evalExpr(f.key); t[k] = this.evalExpr(f.value); }
                    else { t[idx++] = this.evalExpr(f.value); }
                }
                return t;
            }
            case "FunctionDeclaration": return this.createFunc(expr.params, expr.body);
            default: return undefined;
        }
    },

    evalExpList: function(exps) {
        const result = [];
        for (let i = 0; i < exps.length; i++) {
            if (i === exps.length - 1 && exps[i].type === "CallExpression") {
                const base = this.evalExpr(exps[i].base);
                const args = this.evalExpList(exps[i].arguments);
                if (typeof base === "function") {
                    const r = base(...args);
                    if (Array.isArray(r)) {
                        for (const v of r) result.push(v);
                    } else {
                        result.push(r);
                    }
                }
            } else {
                const val = this.evalExpr(exps[i]);
                result.push(val !== undefined ? val : null);
            }
        }
        return result;
    },

    createFunc: function(params, body) {
        const self = this;
        const paramNames = params.map(p => p.name);
        const capturedStack = this.callstack.slice();
        return function(...args) {
            const savedStack = self.callstack;
            self.callstack = capturedStack.concat([{}]);
            for (let i = 0; i < paramNames.length; i++) self.setLocal(paramNames[i], args[i] !== undefined ? args[i] : null);
            const r = self.execBlock(body.body);
            self.callstack = savedStack;
            if (r && r.type === "return") return r.values;
            return [];
        };
    },

    getVar: function(name) {
        for (let i = this.callstack.length - 1; i >= 0; i--) {
            if (this.callstack[i].hasOwnProperty(name)) return this.callstack[i][name];
        }
        return this.env[name];
    },

    setLocal: function(name, val) {
        if (this.callstack.length === 0) throw new Error("No active scope for local variable " + name);
        this.callstack[this.callstack.length - 1][name] = val;
    },

    assign: function(target, val) {
        if (target.type === "Identifier") {
            for (let i = this.callstack.length - 1; i >= 0; i--) {
                if (this.callstack[i].hasOwnProperty(target.name)) { this.callstack[i][target.name] = val; return; }
            }
            this.env[target.name] = val;
        } else if (target.type === "IndexExpression") { const base = this.evalExpr(target.base); const idx = this.evalExpr(target.index); if (base) base[idx] = val; }
        else if (target.type === "MemberExpression") { const base = this.evalExpr(target.base); if (base) base[target.identifier.name] = val; }
    }
};

function runLua(src) { return VM.run(src); }

if (typeof module !== "undefined") module.exports = { VM, runLua, parseLua };

