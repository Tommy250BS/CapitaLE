// Hand-inked simplified continent outlines
const paths=[
"M 73 112 L 95 91 123 74 151 68 177 75 192 91 213 101 225 121 217 137 204 144 196 163 183 176 169 178 153 171 145 158 129 153 115 143 105 129 89 125 78 120 Z",
"M 201 184 L 216 190 231 209 236 230 229 247 218 269 211 288 200 300 191 286 185 266 188 245 184 222 189 205 Z",
"M 316 91 L 335 79 358 76 374 83 386 95 405 91 420 101 438 109 454 116 467 129 459 143 445 147 430 159 414 166 399 179 388 191 375 185 361 174 348 164 337 151 327 137 314 126 304 112 Z",
"M 378 187 L 393 194 406 212 410 234 403 256 393 275 384 284 374 270 368 248 370 224 365 207 Z",
"M 466 131 L 479 138 484 150 477 161 466 155 Z",
"M 500 94 L 520 84 541 89 560 98 579 109 594 122 586 136 572 141 556 133 541 128 526 119 511 117 Z",
"M 567 209 L 581 216 589 229 584 240 573 236 565 225 Z",
"M 608 253 L 621 259 626 272 618 282 607 276 Z",
"M 266 85 L 279 80 290 85 288 98 278 104 268 99 Z"
];
export function drawAtlas(svg,guess=null,correct=null){
 const ns="http://www.w3.org/2000/svg";svg.innerHTML="";
 const add=(tag,attrs={})=>{let e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);svg.appendChild(e);return e};
 // Subtle latitude curves, not a grid
 [130,205,280,355].forEach(y=>add("path",{d:`M 35 ${y} Q 440 ${y-15} 865 ${y}`,fill:"none",stroke:"#b8b7a5","stroke-width":"0.7","stroke-dasharray":"2 7"}));
 paths.forEach((d,i)=>{add("path",{d,fill:"#d0d0b7",stroke:"#687c68","stroke-width":"1.5","stroke-linejoin":"round"});});
 // imperfect coastal hatch marks / land stipple
 const specks=[[120,103],[143,120],[170,98],[194,128],[210,114],[208,155],[202,220],[218,251],[350,109],[366,131],[390,116],[411,140],[426,126],[441,133],[385,222],[390,245],[516,103],[550,119],[572,126],[581,223],[611,266]];
 specks.forEach(([x,y],i)=>add("rect",{x,y,width:i%4===0?3:2,height:i%4===0?3:2,fill:"#7f927a",opacity:".65"}));
 // tiny hand-set labels
 [["N. AMERICA",146,135],["S. AMERICA",213,245],["EUROPA",379,129],["AFRICA",390,214],["ASIA",526,132],["OCEANIA",583,252]].forEach(([t,x,y])=>{let e=add("text",{x,y,fill:"#7b826f","font-size":"9","font-family":"monospace","letter-spacing":"1.4"});e.textContent=t});
 if(guess){const x=(guess.lon+180)/360*900,y=(90-guess.lat)/180*470;add("circle",{cx:x,cy:y,r:5,fill:"#b9543f"});add("circle",{cx:x,cy:y,r:10,fill:"none",stroke:"#b9543f","stroke-width":"1","stroke-dasharray":"2 3"})}
 if(correct){const x=(correct.lon+180)/360*900,y=(90-correct.lat)/180*470;add("circle",{cx:x,cy:y,r:4,fill:"#b9543f"})}
}
