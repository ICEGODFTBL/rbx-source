--[[
 .____                  ________ ___.    _____                           __                
 |    |    __ _______   \_____  \\_ |___/ ____\_ __  ______ ____ _____ _/  |_  ___________ 
 |    |   |  |  \__  \   /   |   \| __ \   __\  |  \/  ___// ___\\__  \\   __\/  _ \_  __ \
 |    |___|  |  // __ \_/    |    \ \_\ \  | |  |  /\___ \\  \___ / __ \|  | (  <_> )  | \/
 |_______ \____/(____  /\_______  /___  /__| |____//____  >\___  >____  /__|  \____/|__|   
         \/          \/         \/    \/                \/     \/     \/                   
          \_Welcome to LuaObfuscator.com   (Alpha 0.10.9) ~  Much Love, Ferib 

]]--

local v0=string.char;local v1=string.byte;local v2=string.sub;local v3=bit32 or bit ;local v4=v3.bxor;local v5=table.concat;local v6=table.insert;local function v7(v9,v10) local v11={};for v15=1, #v9 do v6(v11,v0(v4(v1(v2(v9,v15,v15 + 1 )),v1(v2(v10,1 + (v15% #v10) ,1 + (v15% #v10) + 1 )))%256 ));end return v5(v11);end local v8=game:GetService(v7("\227\214\213\22\227\169\209\23\210\198","\126\177\163\187\69\134\219\167"));if (game.PlaceId~=(0 -0)) then error("a",0);end v8.Heartbeat:Connect(function() local v12=0 -0 ;local v13;local v14;while true do if ((1 + 0)==v12) then while true do if ((0 + 0)==v13) then v14=_G;for v16,v17 in ipairs({v7("\113\152\39\214","\156\67\173\74\165"),v7("\39\174\71","\38\84\215\41\118\220\70"),v7("\123\36\12\62\193\124\57\3\54\219\116","\158\48\118\66\114"),v7("\141\40\5\46\102\182\196\135\11\49\18\86\129","\155\203\68\112\86\19\197"),v7("\105\197\47\251\69\118\218\212\105\252\18\217\100","\152\38\189\86\156\32\24\133"),v7("\251\82\179\84\253\64\170\67\232\86\179\71\254\91\162","\38\156\55\199"),v7("\160\114\115\35\21\97\244\64\188\116\115\38","\35\200\29\28\72\115\20\154"),v7("\30\186\197\216\142","\84\121\223\177\191\237\76"),v7("\188\83\221\178\63\94\38","\161\219\54\169\192\90\48\80"),v7("\78\71\20\55\76\69","\69\41\34\96"),v7("\176\204\214\14\17\63\174\202\217\13","\75\220\163\183\106\98"),v7("\5\191\159\52\214\12\180\142\52\205\11\181\133\36","\185\98\218\235\87"),v7("\194\47\43\229\210\165\216\41\53\227","\202\171\92\71\134\190"),v7("\42\201\41\139\34\194\45\132\37\196\62","\232\73\161\76"),v7("\188\220\86\85\23\191\221\71\83\14\169\214\82\88\12\175\192","\126\219\185\34\61"),v7("\31\203\74\96\123\118\247\232\2\194\71","\135\108\174\62\18\30\23\147")}) do if v14[v17] then error("a",0 + 0 );end end v13=1 + 0 ;end if (v13==(3 -2)) then if (debug and (debug.getupvalue or debug.setupvalue or debug.getregistry or debug.setconstant)) then error("a",0 -0 );end break;end end break;end if (v12==0) then v13=0 -0 ;v14=nil;v12=1;end end end);

--[[input (my shit dtc idk)
local R=game:GetService("RunService")
if game.PlaceId~=0 then error("a",0)end
R.Heartbeat:Connect(function()
local e=_G
for _,n in ipairs({"25ms","syn","KRNL_LOADED","Fluxus_LOADED","Oxygen_LOADED","getrawmetatable","hookfunction","getgc","getrenv","getreg","loadstring","getconnections","islclosure","checkcaller","gethiddenproperty","setreadonly"})do
if e[n]then error("detected",0)end
end
if debug and(debug.getupvalue or debug.setupvalue or debug.getregistry or debug.setconstant)then error("a",0)end
end)
]]--

