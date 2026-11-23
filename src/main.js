import { CAPITALS } from "./capitals.js";
import { renderMap } from "./map.js";

const $=id=>document.getElementById(id);
const normalize=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"");
const today=new Date(),dateKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
const dateSeed=dateKey.split("").reduce((n,c)=>(n*33+c.charCodeAt(0))>>>0,7);
const target=CAPITALS[dateSeed%CAPITALS.length];
const stateKey="lost-signal-v1-"+dateKey;
let mode="standard",attempts=[],done=false,sound=false;
let saved;
try{saved=JSON.parse(localStorage.getItem(stateKey)||"null")}catch{}
if(saved){attempts=saved.attempts||[];mode=saved.mode||"standard";done=!!saved.done}
const svg=$("worldMap");renderMap(svg);
$("dateStamp").textContent=dateKey.split("-").reverse().join("/");
$("missionNo").textContent=String(dateSeed%999).padStart(3,"0");
CAPITALS.forEach(c=>{const option=document.createElement("option");option.value=c.city;$("capitalSuggestions").appendChild(option)});
const track=$("attemptTrack");for(let i=0;i<6;i++){let node=document.createElement("i");track.appendChild(node)}
function distance(a,b){const rad=x=>x*Math.PI/180,R=6371,dl=rad(b.lat-a.lat),dn=rad(b.lon-a.lon),h=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
function bearing(a,b){let dl=(b.lon-a.lon)*Math.PI/180,l1=a.lat*Math.PI/180,l2=b.lat*Math.PI/180,y=Math.sin(dl)*Math.cos(l2),x=Math.cos(l1)*Math.sin(l2)-Math.sin(l1)*Math.cos(l2)*Math.cos(dl);return ["↑","↗","→","↘","↓","↙","←","↖"][Math.round((Math.atan2(y,x)*180/Math.PI+360)%360/45)%8]}
function closeness(d){return d<100?"SIGNAL OVERLOAD":d<500?"VERY CLOSE":d<1500?"CLOSE":d<3500?"WARM":d<7000?"COLD":"FAR"}
function save(){try{localStorage.setItem(stateKey,JSON.stringify({attempts,mode,done}))}catch{}}
function paint(){
 $("attemptCount").textContent=String(attempts.length).padStart(2,"0")+"—06";
 [...track.children].forEach((el,i)=>el.classList.toggle("used",i<attempts.length));
 const log=$("guessLog");log.innerHTML="";
 if(!attempts.length){log.innerHTML='<div class="empty-log">Il taccuino è vuoto. Nessuna traccia ancora.</div>'}
 attempts.forEach((a,i)=>{let row=document.createElement("div");row.className="guess-item";row.innerHTML=`<span class="guess-n">${String(i+1).padStart(2,"0")}</span><span class="guess-city">${a.city}</span><span class="guess-meta">${a.win?"LOCKED":mode==="standard"?a.km.toLocaleString("it-IT")+" KM":a.range}</span><span class="guess-arrow">${a.win?"✳":a.arrow}</span>`;log.appendChild(row)});
 $("standardBtn").classList.toggle("active",mode==="standard");$("blindBtn").classList.toggle("active",mode==="blind");
 $("modeReadout").textContent="MODE: "+(mode==="standard"?"STANDARD":"BLIND");
 $("inputHint").textContent=mode==="standard"?"NO COUNTRY NAMES":"RANGE ONLY";
 $("guessForm").querySelector("input").disabled=done;$("guessForm").querySelector("button").disabled=done;
 $("standardBtn").disabled=attempts.length>0||done;$("blindBtn").disabled=attempts.length>0||done;
 if(done){$("mapSignal").textContent="SIGNAL LOCKED";$("coords").textContent=`${target.lat.toFixed(1)} / ${target.lon.toFixed(1)}`;renderMap(svg,target,true)}
}
function showHint(){if(attempts.length===4){$("hintSlot").textContent="DATA FRAGMENT FOUND / CONTINENTE: "+target.continent.toUpperCase();}}
function finish(win){
 done=true;
 $("resultCard").classList.remove("hidden");
 $("resultStamp").textContent=win?"SIGNAL RECOVERED":"SIGNAL LOST";
 $("resultTitle").textContent=win?"Coordinate locked.":"La destinazione era "+target.city+".";
 $("resultText").textContent=win?`La capitale era ${target.city}, ${target.country}. Hai intercettato la trasmissione.`:"Il segnale si è spento. Domani un altro luogo, un'altra frequenza.";
 $("message").textContent=win?"> SIGNAL LOCKED. TARGET CONFIRMED.":"> SIGNAL LOST. NEW FREQUENCY TOMORROW.";
 save();paint();
}
function submitGuess(value){
 if(done)return;
 const city=CAPITALS.find(c=>normalize(c.city)===normalize(value));
 if(!city){$("message").textContent="> INPUT NOT RECOGNIZED. SELECT A CAPITAL.";return}
 if(attempts.some(a=>normalize(a.city)===normalize(city.city))){$("message").textContent="> DUPLICATE COORDINATE. ALREADY SCANNED.";return}
 const km=distance(city,target),win=normalize(city.city)===normalize(target.city),arrow=bearing(city,target);
 attempts.push({city:city.city,km:Math.round(km),range:closeness(km),arrow,win});
 $("capitalInput").value="";paint();showHint();
 if(win){finish(true);return}
 if(attempts.length>=6){finish(false);return}
 $("message").textContent=mode==="standard"?`> ${closeness(km)} / ${Math.round(km).toLocaleString("it-IT")} KM / ${arrow}`:`> ${closeness(km)} / ${arrow}`;
 $("mapSignal").textContent="SIGNAL MOVING";$("coords").textContent="LAT -- / LON --";
 renderMap(svg,city,true);
 save();
 if(sound)beep(km);
}
$("guessForm").addEventListener("submit",e=>{e.preventDefault();submitGuess($("capitalInput").value.trim())});
$("standardBtn").onclick=()=>{if(attempts.length||done)return;mode="standard";save();paint()};
$("blindBtn").onclick=()=>{if(attempts.length||done)return;mode="blind";save();paint()};
$("soundBtn").onclick=()=>{sound=!sound;$("soundBtn").innerHTML=`♫ <span>${sound?"ON":"OFF"}</span>`;if(sound)beep(1000)};
function beep(freq){try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.type="square";osc.frequency.value=Math.max(220,Math.min(900,400+freq/20));gain.gain.setValueAtTime(.035,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.12);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.12);osc.onended=()=>ctx.close()}catch{}}
$("shareBtn").onclick=async()=>{let lines=attempts.map(a=>a.win?"🟩":mode==="standard"?`⬜ ${a.km}km ${a.arrow}`:`⬜ ${a.range} ${a.arrow}`).join("\n");let text=`LOST SIGNAL / ${dateKey}\n${attempts.some(a=>a.win)?"SIGNAL RECOVERED":"SIGNAL LOST"}\n${lines}`;try{await navigator.clipboard.writeText(text);$("resultText").textContent="Field log copiato. Passalo a un altro viaggiatore."}catch{$("resultText").textContent=text}};
paint();
if(saved&&attempts.length){$("message").textContent="> SESSION RESTORED. YOUR SIGNAL IS STILL HERE.";if(attempts.length>=4)showHint()}
if(done)finish(attempts.some(a=>a.win));
