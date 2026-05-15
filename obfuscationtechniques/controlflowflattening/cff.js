const B62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const b62 = {
    enc: (s) => {
        let n = 0n;
        for (let i = 0; i < s.length; i++) n = (n << 8n) | BigInt(s.charCodeAt(i));
        if (n === 0n) return "a";
        let r = "";
        while (n > 0n) { r = B62[Number(n % 62n)] + r; n = n / 62n; }
        return r;
    }
};

function obfLua(src) {
    const ast = parseLua(src);

    function mangle(name) { return "_" + b62.enc(name); }

    function expr(n) {
        if (!n) return "";
        switch (n.type) {
            case "Literal": return typeof n.value === "string" ? """ + n.value + """ : n.raw || String(n.value);
            case "Identifier": return mangle(n.name);
            case "Vararg": return "...";
            case "BinaryExpression": return expr(n.left) + " " + n.operator + " " + expr(n.right);
            case "UnaryExpression": return n.operator + " " + expr(n.argument);
            case "IndexExpression": return expr(n.base) + "[" + expr(n.index) + "]";
            case "MemberExpression": return expr(n.base) + "." + expr(n.identifier);
            case "CallExpression": return expr(n.base) + "(" + n.arguments.map(expr).join(",") + ")";
            case "Table": return "{" + n.fields.map(f => (f.key ? "[" + expr(f.key) + "]=" + expr(f.value) : expr(f.value))).join(",") + "}";
            case "FunctionDeclaration": return "function(" + n.params.map(expr).join(",") + ")" + genBlock(n.body) + " end";
            default: return "";
        }
    }

    function genStmt(n, parentPc, blocks) {
        if (!n) return parentPc;
        switch (n.type) {
            case "IfStatement": {
                let mypc = blocks.nextpc++;
                const tpc = blocks.nextpc++;
                const fpc = blocks.nextpc++;
                const epc = blocks.nextpc++;
                blocks.list.push({ pc: mypc, code: "if " + expr(n.condition) + " then _s=" + tpc + " else _s=" + fpc + " end" });
                genBlockList(n.then.body, epc, blocks);
                if (n.else) {
                    if (n.else.type === "Block") genBlockList(n.else.body, epc, blocks);
                    else genBlockList([n.else], epc, blocks);
                } else {
                    blocks.list.push({ pc: fpc, code: "_s=" + epc });
                }
                return epc;
            }
            case "WhileStatement": {
                let mypc = blocks.nextpc++;
                const loop = blocks.nextpc++;
                const body = blocks.nextpc++;
                const end = blocks.nextpc++;
                blocks.list.push({ pc: mypc, code: "_s=" + loop });
                blocks.list.push({ pc: loop, code: "if " + expr(n.condition) + " then _s=" + body + " else _s=" + end + " end" });
                genBlockList(n.body.body, loop, blocks);
                blocks.list.push({ pc: body + 1, code: "_s=" + loop });
                return end;
            }
            case "ForNumericStatement": {
                let mypc = blocks.nextpc++;
                const loop = blocks.nextpc++;
                const body = blocks.nextpc++;
                const end = blocks.nextpc++;
                blocks.list.push({ pc: mypc, code: "local " + mangle(n.name.name) + "=" + expr(n.start) + " _s=" + loop });
                blocks.list.push({ pc: loop, code: "if " + mangle(n.name.name) + "<=" + expr(n.end) + " then _s=" + body + " else _s=" + end + " end" });
                genBlockList(n.body.body, body + 1, blocks);
                blocks.list.push({ pc: body + 1, code: mangle(n.name.name) + "=" + mangle(n.name.name) + "+" + expr(n.step) + " _s=" + loop });
                return end;
            }
            case "BreakStatement": {
                let mypc = blocks.nextpc++;
                blocks.list.push({ pc: mypc, code: "_s=" + parentPc });
                return blocks.nextpc++;
            }
            case "ReturnStatement": {
                let mypc = blocks.nextpc++;
                blocks.list.push({ pc: mypc, code: "return " + n.arguments.map(expr).join(",") });
                return blocks.nextpc++;
            }
            case "DoStatement": {
                let mypc = blocks.nextpc++;
                let endpc = genBlockList(n.body.body, parentPc, blocks);
                return endpc;
            }
            case "RepeatStatement": {
                let mypc = blocks.nextpc++;
                const loop = blocks.nextpc++;
                const end = blocks.nextpc++;
                blocks.list.push({ pc: mypc, code: "_s=" + loop });
                genBlockList(n.body.body, loop, blocks);
                blocks.list.push({ pc: loop, code: "if " + expr(n.condition) + " then _s=" + end + " else _s=" + loop + " end" });
                return end;
            }
            case "ForGenericStatement": {
                let mypc = blocks.nextpc++;
                const body = blocks.nextpc++;
                const end = blocks.nextpc++;
                blocks.list.push({ pc: mypc, code: "local " + n.names.map(x => mangle(x.name)).join(",") + "=" + n.expressions.map(expr).join(",") + " _s=" + body });
                genBlockList(n.body.body, body, blocks);
                blocks.list.push({ pc: body, code: "_s=" + end });
                return end;
            }
            default: {
                let mypc = blocks.nextpc++;
                let code = "";
                if (n.type === "LocalDeclaration") code = "local " + n.names.map(x => mangle(x.name)).join(",") + (n.inits.length ? "=" + n.inits.map(expr).join(",") : "");
                else if (n.type === "AssignmentStatement") code = n.names.map(expr).join(",") + "=" + n.values.map(expr).join(",");
                else if (n.type === "ExpressionStatement") code = expr(n.expression);
                else code = expr(n);
                blocks.list.push({ pc: mypc, code: code });
                return blocks.nextpc++;
            }
        }
    }

    function genBlockList(body, parentPc, blocks) {
        let current = blocks.nextpc++;
        for (let i = 0; i < body.length; i++) {
            current = genStmt(body[i], parentPc, blocks);
        }
        blocks.list.push({ pc: current, code: "_s=" + parentPc });
        return current;
    }

    function genBlock(n) {
        if (!n) return "";
        if (n.type !== "Block" && n.type !== "Chunk") return "";
        const blocks = { list: [], nextpc: 1 };
        genBlockList(n.body, 0, blocks);
        let out = "local _s=1 ";
        out += "while true do ";
        out += "if _s==0 then break end ";
        for (const b of blocks.list) {
            if (b.code) out += "if _s==" + b.pc + " then " + b.code + " end ";
        }
        out += "end";
        return out;
    }

    return genBlock(ast);
}

if (typeof module !== "undefined") module.exports = { obfLua };
// this all is lua 5.1 nigger fuck off 
