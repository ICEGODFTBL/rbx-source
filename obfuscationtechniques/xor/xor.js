    

                 //        .@%(/*,.......      ...,,*/(#%&@@.
                  //   (*   ,/(#%%&&@@@@&%((////(((##%###((/**,,.     ,//(&.
                   /* .%@@@@@@@@%,  .(&@@@&&&&&&@@@@@@&#(*,........*%@@@(.  ,#.
      //           */ //.&@@@@@@@*  (%,   *(&&@@@@@&%(*,.             .,*(#%(*@@&*  *,
        //        #, /@@@@@@* *&( ,&&/.,/#%&&@@@&(&@@@@@@@@@@@@#*,.....,/&@@@@@@@@( .%
       //        #  #@@@@@*/@% .#%./(,.,/*,//*,.,/(*@@@@@@@@@@@@%@@@@@@@@@#.#@@@@@@&. %
   //           /  &@@@@@@@@(%@# *&&*&@@@@#/&@@@@/%%.,%@@@@@@@%/@@&(,  ,,,...  *%@@@# *
     //       #  .&@@@@@@@@@@@,((%@@@@@#.    ,&@@#@@&* .&@@@@@&,.#@@@@/&@@%(@@@&(/,(&, /,
   //      (/   (@&&&%&@@@&/, ,@#(@@@@,        #@@/,&@& /@@@@@,%#%@@@@@(     *@@@@@&,%%. .
    //    /  #/,#@@@&#(//#@@@/ %@@@&@@@(.    ,&@@(.*/*  %@@*   %@@@@@@%       (@@&(*...%&.
         ///@@&,  (&@@#,   /@/ ,*&@@@@#&@@%#%((%@&* /@@@@@@&. #@@@#&@@@&%%@@@@@@&,/(*@/#
    //    %%.&@# .&@@@# /@@@@%&@@@&/.   ,/((/*,  ./&@@@@@@@@@@,*&(./%@@#*&@@@(#(....,&#*@/
     //   @%.&& .&@@@&*    /&@@@@@@@@@@@@@@@@&@@#/(%@@@@@@@@@@&,  (@@@@@@@@@@@@/,@@@@@#.&*
     //   &&,%% .&*    /@@@(.  ,(@@@@@&/(////#( /&@@@@@@@@@@@@@@@(  ,&@@@@@@@@&, (@@&*/@(/
    //    .%*#@( /@@@@( *@@@@@@/     *%@@@@@@@&.,@& ,#, .&@@@@@@# .#*%&/,#@@@@*   *@@&/*&*
      //  .&/.#@@@@@@@,   *&@@%.,&@@&(,    ,(%@%&@@@@@@@@@(.*,  /@@@@@@@@@&,      %@@@@..
     //   @* .%@@@@@@@@(       .   (@@@@@@@@(       .*(%&@@@@@@@@@@@@&(,  ./.*@%   /@@% ./
     //     @* .&@@@@@@&.             ./&@@@*.&@@@@@@@&, ,**,.    .,*(&(.%@@# %@*  ,@@% ,#
     //       &, /@@@@@@*                    .#@@@@@@@@*.%@@@@@(,@@@@@@& ,%(.      .&@% ,#
    //          / *@@@@@#                                                           %@&.,#
    //          (( .&@@@@*                                                          #@&.,#
    //           .&. ,&@@@,                                                         (@&.,#
     //             #. .%@@* /@@/                                                   /@&.,(
    //                ./  #@%. %@&,,#,                                              /@@,./
   //                *(  #@%. . (@@@@@%/,                                        /@@,.*
  //                      //  %@&, *@@@@@@@@( (@%/.                                 #@@, (
  //                        #* .&@@#. (@@@@&.*@@@@@@@@%. */.                  *..%*.&@@, /
   //                         @* .%@@@%, ,/ .@@@@@@@@@@,.%@@@@@% .&@@@* #@&..&@*,* %@@&. *
 //                              /  *&@@@@%,   *(&@@@@&. #@@@@@* #@@@% (@@* ,.   /@@@@* (
   //                              @#. .#@@@@@@&(,.                      .,*(%&@@@@@&..(
  //                                   &(.   ./%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@(. ((
//                                          ,#/*.       ..,,,,,,,,....          ,/#
//
const xor = {
    encode: (s, k) => {
        let r = "";
        for (let i = 0; i < s.length; i++) {
            r += String.fromCharCode(s.charCodeAt(i) ^ k.charCodeAt(i % k.length));
        }
        return r;
    },
    decode: (s, k) => xor.encode(s, k)
};

function obfLua(src, key) {
    if (!key) key = "rbx-source";
    const ast = parseLua(src);
    function walk(n) {
        if (!n) return "";
        switch (n.type) {
            case "Chunk":
            case "Block":
                return n.body.map(walk).join(" ");
            case "Literal":
                if (typeof n.value === "string") {
                    const enc = xor.encode(n.value, key);
                    const hex = enc.split("").map(c => "\\x" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
                    return """ + hex + """;
                }
                return n.raw || String(n.value);
            case "Identifier":
                const mangled = xor.encode(n.name, key).split("").map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");
                return "_" + mangled;
            case "Vararg":
                return "...";
            case "BinaryExpression":
                return walk(n.left) + " " + n.operator + " " + walk(n.right);
            case "UnaryExpression":
                return n.operator + " " + walk(n.argument);
            case "IndexExpression":
                return walk(n.base) + "[" + walk(n.index) + "]";
            case "MemberExpression":
                return walk(n.base) + "." + walk(n.identifier);
            case "CallExpression":
                return walk(n.base) + "(" + n.arguments.map(walk).join(",") + ")";
            case "Table":
                return "{" + n.fields.map(f => (f.key ? "[" + walk(f.key) + "]=" + walk(f.value) : walk(f.value))).join(",") + "}";
            case "TableField":
                return n.key ? "[" + walk(n.key) + "]=" + walk(n.value) : walk(n.value);
            case "FunctionDeclaration":
                return "function(" + n.params.map(walk).join(",") + ")" + walk(n.body) + " end";
            case "LocalDeclaration":
                return "local " + n.names.map(walk).join(",") + (n.inits.length ? "=" + n.inits.map(walk).join(",") : "");
            case "AssignmentStatement":
                return n.names.map(walk).join(",") + "=" + n.values.map(walk).join(",");
            case "IfStatement":
                let r = "if " + walk(n.condition) + " then " + walk(n.then);
                if (n.else) r += " else " + walk(n.else);
                return r + " end";
            case "WhileStatement":
                return "while " + walk(n.condition) + " do " + walk(n.body) + " end";
            case "RepeatStatement":
                return "repeat " + walk(n.body) + " until " + walk(n.condition);
            case "ForNumericStatement":
                return "for " + walk(n.name) + "=" + walk(n.start) + "," + walk(n.end) + "," + walk(n.step) + " do " + walk(n.body) + " end";
            case "ForGenericStatement":
                return "for " + n.names.map(walk).join(",") + " in " + n.expressions.map(walk).join(",") + " do " + walk(n.body) + " end";
            case "ReturnStatement":
                return "return " + n.arguments.map(walk).join(",");
            case "BreakStatement":
                return "break";
            case "DoStatement":
                return "do " + walk(n.body) + " end";
            case "ExpressionStatement":
                return walk(n.expression);
            default:
                return "";
        }
    }
    return walk(ast);
}

if (typeof module !== "undefined") module.exports = { xor, obfLua };

