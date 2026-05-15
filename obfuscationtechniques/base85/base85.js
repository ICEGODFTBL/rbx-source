const B85 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";
const B62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const b85 = {
    enc: (s) => {
        let r = "";
        const pad = (4 - s.length % 4) % 4;
        const d = s + "\x00".repeat(pad);
        for (let i = 0; i < d.length; i += 4) {
            let n = (d.charCodeAt(i) << 24) | (d.charCodeAt(i+1) << 16) | (d.charCodeAt(i+2) << 8) | d.charCodeAt(i+3);
            if (n === 0) { r += "z"; continue; }
            let c = "";
            for (let j = 0; j < 5; j++) { c = B85[n % 85] + c; n = Math.floor(n / 85); }
            r += c;
        }
        if (pad) r = r.slice(0, -pad);
        return r;
    }
};

const b62 = {
    enc: (s) => {
        let n = 0;
        for (let i = 0; i < s.length; i++) {
            n = (n << 8) | s.charCodeAt(i);
        }
        if (n === 0) return "a";
        let r = "";
        while (n > 0) {
            r = B62[n % 62] + r;
            n = Math.floor(n / 62);
        }
        return r;
    }
};

function obfLua(src) {
    const ast = parseLua(src);
    function w(n) {
        if (!n) return "";
        switch (n.type) {
            case "Chunk":
            case "Block":
                return n.body.map(w).join(" ");
            case "Literal":
                if (typeof n.value === "string") {
                    return "b85("" + b85.enc(n.value) + "")";
                }
                return n.raw || String(n.value);
            case "Identifier":
                return "_" + b62.enc(n.name);
            case "Vararg":
                return "...";
            case "BinaryExpression":
                return w(n.left) + " " + n.operator + " " + w(n.right);
            case "UnaryExpression":
                return n.operator + " " + w(n.argument);
            case "IndexExpression":
                return w(n.base) + "[" + w(n.index) + "]";
            case "MemberExpression":
                return w(n.base) + "." + w(n.identifier);
            case "CallExpression":
                return w(n.base) + "(" + n.arguments.map(w).join(",") + ")";
            case "Table":
                return "{" + n.fields.map(f => (f.key ? "[" + w(f.key) + "]=" + w(f.value) : w(f.value))).join(",") + "}";
            case "TableField":
                return n.key ? "[" + w(n.key) + "]=" + w(n.value) : w(n.value);
            case "FunctionDeclaration":
                return "function(" + n.params.map(w).join(",") + ")" + w(n.body) + " end";
            case "LocalDeclaration":
                return "local " + n.names.map(w).join(",") + (n.inits.length ? "=" + n.inits.map(w).join(",") : "");
            case "AssignmentStatement":
                return n.names.map(w).join(",") + "=" + n.values.map(w).join(",");
            case "IfStatement":
                let r = "if " + w(n.condition) + " then " + w(n.then);
                if (n.else) r += " else " + w(n.else);
                return r + " end";
            case "WhileStatement":
                return "while " + w(n.condition) + " do " + w(n.body) + " end";
            case "RepeatStatement":
                return "repeat " + w(n.body) + " until " + w(n.condition);
            case "ForNumericStatement":
                return "for " + w(n.name) + "=" + w(n.start) + "," + w(n.end) + "," + w(n.step) + " do " + w(n.body) + " end";
            case "ForGenericStatement":
                return "for " + n.names.map(w).join(",") + " in " + n.expressions.map(w).join(",") + " do " + w(n.body) + " end";
            case "ReturnStatement":
                return "return " + n.arguments.map(w).join(",");
            case "BreakStatement":
                return "break";
            case "DoStatement":
                return "do " + w(n.body) + " end";
            case "ExpressionStatement":
                return w(n.expression);
            default:
                return "";
        }
    }
    return w(ast);
}

if (typeof module !== "undefined") module.exports = { b85, b62, obfLua };

