// rbx-source Lua Parser
// Returns AST nodes

const TokenType = {
    // Literals
    NIL: "NIL", TRUE: "TRUE", FALSE: "FALSE",
    NUMBER: "NUMBER", STRING: "STRING",
    // Identifiers
    IDENT: "IDENT",
    // Keywords
    LOCAL: "LOCAL", IF: "IF", THEN: "THEN", ELSE: "ELSE",
    ELSEIF: "ELSEIF", END: "END", WHILE: "WHILE", DO: "DO",
    REPEAT: "REPEAT", UNTIL: "UNTIL", FOR: "FOR", IN: "IN",
    FUNCTION: "FUNCTION", RETURN: "RETURN", BREAK: "BREAK",
    AND: "AND", OR: "OR", NOT: "NOT",
    // Operators
    PLUS: "PLUS", MINUS: "MINUS", STAR: "STAR", SLASH: "SLASH",
    PERCENT: "PERCENT", CARET: "CARET", DOT: "DOT",
    DOT2: "DOT2", DOT3: "DOT3", EQ: "EQ", NEQ: "NEQ",
    LTE: "LTE", GTE: "GTE", LT: "LT", GT: "GT",
    ASSIGN: "ASSIGN", LPAREN: "LPAREN", RPAREN: "RPAREN",
    LBRACE: "LBRACE", RBRACE: "RBRACE", LBRACKET: "LBRACKET",
    RBRACKET: "RBRACKET", SEMI: "SEMI", COLON: "COLON",
    COMMA: "COMMA", HASH: "HASH",
    // Special
    EOF: "EOF", NEWLINE: "NEWLINE"
};

const Keywords = {
    "nil": "NIL", "true": "TRUE", "false": "FALSE",
    "local": "LOCAL", "if": "IF", "then": "THEN", "else": "ELSE",
    "elseif": "ELSEIF", "end": "END", "while": "WHILE", "do": "DO",
    "repeat": "REPEAT", "until": "UNTIL", "for": "FOR", "in": "IN",
    "function": "FUNCTION", "return": "RETURN", "break": "BREAK",
    "and": "AND", "or": "OR", "not": "NOT"
};

// Lexer
class Lexer {
    constructor(src) {
        this.src = src;
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.tokens = [];
    }

    peek(off = 0) {
        return this.src[this.pos + off] || "\0";
    }

    advance() {
        const c = this.src[this.pos];
        this.pos++;
        if (c === "\n") { this.line++; this.col = 1; }
        else { this.col++; }
        return c;
    }

    skip() {
        while (" \t\r\n".includes(this.peek())) this.advance();
        // block comment
        if (this.peek() === "-" && this.peek(1) === "-") {
            if (this.peek(2) === "[") this.readBlockComment();
            else this.readLineComment();
            this.skip();
        }
    }

    readLineComment() {
        while (this.peek() !== "\n" && this.peek() !== "\0") this.advance();
    }

    readBlockComment() {
        this.advance(); this.advance(); this.advance(); // skip --[
        let depth = 0;
        while (this.peek() === "=") { depth++; this.advance(); }
        this.advance(); // [
        const end = "]" + "=".repeat(depth) + "]";
        while (this.pos + end.length <= this.src.length) {
            if (this.src.slice(this.pos, this.pos + end.length) === end) {
                this.pos += end.length;
                return;
            }
            this.advance();
        }
    }

    readString(q) {
        let s = ""; this.advance();
        while (this.peek() !== q && this.peek() !== "\0") {
            if (this.peek() === "\\") {
                this.advance();
                const e = this.advance();
                const m = { n: "\n", t: "\t", r: "\r", "\": "\\", """: """, "'": "'" };
                s += m[e] || e;
            } else {
                s += this.advance();
            }
        }
        this.advance();
        return { type: TokenType.STRING, value: s, line: this.line, col: this.col };
    }

    readNumber() {
        let s = "";
        if (this.peek() === "0" && (this.peek(1) === "x" || this.peek(1) === "X")) {
            s += this.advance(); s += this.advance();
            while (/[0-9a-fA-F]/.test(this.peek())) s += this.advance();
        } else {
            while (/[0-9.]/.test(this.peek())) s += this.advance();
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

            if (c === """ || c === "'") { this.tokens.push(this.readString(c)); continue; }
            if (/[0-9]/.test(c)) { this.tokens.push(this.readNumber()); continue; }
            if (/[a-zA-Z_]/.test(c)) { this.tokens.push(this.readIdent()); continue; }

            // multi char
            const two = c + this.peek(1);
            const mc = {
                "..": "DOT2", "...": "DOT3", "==": "EQ", "~=": "NEQ",
                "<=": "LTE", ">=": "GTE", "--": null // handled in skip
            };
            if (two === "...") { this.advance(); this.advance(); this.advance(); this.tokens.push({ type: TokenType.DOT3, line, col }); continue; }
            if (mc[two]) { this.advance(); this.advance(); this.tokens.push({ type: TokenType[mc[two]], line, col }); continue; }

            const sc = {
                "+": "PLUS", "-": "MINUS", "*": "STAR", "/": "SLASH",
                "%": "PERCENT", "^": "CARET", "#": "HASH",
                "(": "LPAREN", ")": "RPAREN", "{": "LBRACE", "}": "RBRACE",
                "[": "LBRACKET", "]": "RBRACKET", ";": "SEMI", ":": "COLON",
                ",": "COMMA", ".": "DOT"
            };
            if (sc[c]) {
                this.advance();
                this.tokens.push({ type: TokenType[sc[c]], value: c, line, col });
                continue;
            }
            if (c === "<" || c === ">") {
                this.advance();
                this.tokens.push({ type: TokenType[c === "<" ? "LT" : "GT"], line, col });
                continue;
            }
            if (c === "=") {
                this.advance();
                this.tokens.push({ type: TokenType.ASSIGN, line, col });
                continue;
            }
            this.advance(); // skipppppppp
        }
        this.tokens.push({ type: TokenType.EOF, line: this.line, col: this.col });
        return this.tokens;
    }
}

// AST Nodes
const AST = {
    Chunk: (body) => ({ type: "Chunk", body }),
    Block: (body) => ({ type: "Block", body }),
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

// this might be a parser 
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
        throw new Error(`Expected ${t} at line ${this.cur().line}`);
    }
    match(...ts) { return ts.includes(this.cur().type); }

    parse() {
        const body = [];
        while (!this.match(TokenType.EOF)) body.push(this.stat());
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
        return this.assignOrCall();
    }

    block() {
        const body = [];
        while (!this.match(TokenType.END, TokenType.ELSE, TokenType.ELSEIF, TokenType.UNTIL, TokenType.EOF, TokenType.RETURN)) {
            if (this.match(TokenType.BREAK)) { body.push(this.stat()); break; }
            body.push(this.stat());
        }
        return AST.Block(body);
    }

    localStat() {
        this.eat(TokenType.LOCAL);
        if (this.match(TokenType.FUNCTION)) return this.localFunc();
        const names = this.nameList();
        let inits = [];
        if (this.match(TokenType.ASSIGN)) {
            this.advance();
            inits = this.expList();
        }
        return AST.LocalDeclaration(names, inits);
    }

    localFunc() {
        this.eat(TokenType.FUNCTION);
        const name = this.eat(TokenType.IDENT).value;
        const [params, body] = this.funcBody();
        return AST.LocalDeclaration([AST.Identifier(name)], [AST.Function(params, body, true)]);
    }

    funcStat() {
        this.eat(TokenType.FUNCTION);
        const names = [this.eat(TokenType.IDENT).value];
        while (this.match(TokenType.DOT)) {
            this.advance();
            names.push(this.eat(TokenType.IDENT).value);
        }
        let self = false;
        if (this.match(TokenType.COLON)) {
            this.advance();
            names.push(this.eat(TokenType.IDENT).value);
            self = true;
        }
        const [params, body] = this.funcBody();
        if (self) params.unshift("self");
        // build member chain
        let base = AST.Identifier(names[0]);
        for (let i = 1; i < names.length - (self ? 1 : 0); i++) {
            base = AST.MemberExpr(base, AST.Identifier(names[i]), false);
        }
        const fn = AST.Function(params.map(AST.Identifier), body, false);
        if (names.length === 1 && !self) return AST.LocalDeclaration([base], [fn]); // global func
        return AST.Assignment([base], [fn]);
    }

    funcBody() {
        this.eat(TokenType.LPAREN);
        const params = [];
        if (!this.match(TokenType.RPAREN)) {
            while (true) {
                if (this.match(TokenType.DOT3)) { this.advance(); params.push("..."); break; }
                params.push(this.eat(TokenType.IDENT).value);
                if (this.match(TokenType.COMMA)) this.advance();
                else break;
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
        let elseBody = null;
        while (this.match(TokenType.ELSEIF)) {
            this.advance();
            const econd = this.exp();
            this.eat(TokenType.THEN);
            const ethen = this.block();
            elseBody = AST.Block([AST.If(econd, ethen, elseBody)]);
        }
        if (this.match(TokenType.ELSE)) {
            this.advance();
            elseBody = this.block();
        }
        this.eat(TokenType.END);
        return AST.If(cond, thenBody, elseBody);
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
        const args = [];
        if (!this.match(TokenType.END, TokenType.ELSE, TokenType.ELSEIF, TokenType.UNTIL, TokenType.EOF)) args = this.expList();
        return AST.Return(args);
    }

    assignOrCall() {
        const exps = this.expList();
        if (exps.length === 1 && this.match(TokenType.ASSIGN)) {
            this.advance();
            const vals = this.expList();
            return AST.Assignment([exps[0]], vals);
        }
        if (exps.length === 1 && (exps[0].type === "CallExpression" || exps[0].type === "MemberExpression")) {
            return AST.ExpressionStatement(exps[0]);
        }
        // multi assign
        if (this.match(TokenType.ASSIGN)) {
            this.advance();
            const vals = this.expList();
            return AST.Assignment(exps, vals);
        }
        return AST.ExpressionStatement(exps[0]);
    }

    expList() {
        const list = [this.exp()];
        while (this.match(TokenType.COMMA)) { this.advance(); list.push(this.exp()); }
        return list;
    }

    nameList() {
        const list = [AST.Identifier(this.eat(TokenType.IDENT).value)];
        while (this.match(TokenType.COMMA)) { this.advance(); list.push(AST.Identifier(this.eat(TokenType.IDENT).value)); }
        return list;
    }

    // precedencecene 
    exp() { return this.or(); }

    or() { let n = this.and(); while (this.match(TokenType.OR)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.and()); } return n; }
    and() { let n = this.rel(); while (this.match(TokenType.AND)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.rel()); } return n; }
    rel() {
        let n = this.concat();
        while (this.match(TokenType.EQ, TokenType.NEQ, TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE)) {
            const op = this.advance().type; n = AST.BinaryExpr(op, n, this.concat());
        }
        return n;
    }
    concat() {
        let n = this.add();
        if (this.match(TokenType.DOT2)) {
            const op = this.advance().type;
            // right assoitiave
            n = AST.BinaryExpr(op, n, this.concat());
        }
        return n;
    }
    add() { let n = this.mul(); while (this.match(TokenType.PLUS, TokenType.MINUS)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.mul()); } return n; }
    mul() { let n = this.unary(); while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) { const op = this.advance().type; n = AST.BinaryExpr(op, n, this.unary()); } return n; }
    unary() {
        if (this.match(TokenType.MINUS, TokenType.NOT, TokenType.HASH)) {
            const op = this.advance().type;
            return AST.UnaryExpr(op, this.unary());
        }
        return this.pow();
    }
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
        else { throw new Error(`Unexpected ${t.type} at line ${t.line}`); }

        // suffixes
        while (true) {
            if (this.match(TokenType.LPAREN) || this.match(TokenType.LBRACE) || this.match(TokenType.STRING)) {
                const args = this.args();
                n = AST.CallExpr(n, args);
            } else if (this.match(TokenType.COLON)) {
                this.advance();
                const id = AST.Identifier(this.eat(TokenType.IDENT).value);
                const args = this.args();
                n = AST.CallExpr(AST.MemberExpr(n, id, false), args);
            } else if (this.match(TokenType.LBRACKET)) {
                this.advance();
                const idx = this.exp();
                this.eat(TokenType.RBRACKET);
                n = AST.IndexExpr(n, idx);
            } else if (this.match(TokenType.DOT)) {
                this.advance();
                n = AST.MemberExpr(n, AST.Identifier(this.eat(TokenType.IDENT).value), false);
            } else {
                break;
            }
        }
        return n;
    }

    args() {
        if (this.match(TokenType.LPAREN)) {
            this.advance();
            const args = [];
            if (!this.match(TokenType.RPAREN)) args.push(...this.expList());
            this.eat(TokenType.RPAREN);
            return args;
        }
        if (this.match(TokenType.LBRACE)) return [this.table()];
        if (this.match(TokenType.STRING)) { const v = this.advance(); return [AST.Literal(v.value, v.value)]; }
        return [];
    }

    table() {
        this.eat(TokenType.LBRACE);
        const fields = [];
        while (!this.match(TokenType.RBRACE)) {
            let key = null, val;
            if (this.match(TokenType.LBRACKET)) {
                this.advance();
                key = this.exp();
                this.eat(TokenType.RBRACKET);
                this.eat(TokenType.ASSIGN);
                val = this.exp();
            } else if (this.match(TokenType.IDENT) && this.peek().type === TokenType.ASSIGN) {
                key = AST.Literal(this.advance().value, null);
                this.eat(TokenType.ASSIGN);
                val = this.exp();
            } else {
                val = this.exp();
            }
            fields.push(AST.TableField(key, val));
            if (this.match(TokenType.COMMA) || this.match(TokenType.SEMI)) this.advance();
            else break;
        }
        this.eat(TokenType.RBRACE);
        return AST.Table(fields);
    }
}

// Export
function parseLua(src) {
    const lexer = new Lexer(src);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
}

if (typeof module !== "undefined") module.exports = { parseLua, Lexer, Parser, AST, TokenType };

