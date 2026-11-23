import {CAPITALS} from "./capitals.js";
import {drawAtlas} from "./map.js";
const $=id=>document.getElementById(id);
const norm=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z]/g,"");
const now=new Date(),key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
let seed=key.split("").reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,19);
const dailyTarget=CAPITALS[seed%CAPITALS.length];let target=dailyTarget,practice=false,practiceSeed=null;let storageKey="capitale-daily-"+key;
let guesses=[],mode="classic",finished=false,sound=localStorage.getItem("capitale-sound")==="on",audioCtx=null;
try{let saved=JSON.parse(localStorage.getItem(storageKey)||"null");if(saved){guesses=saved.guesses||[];mode=saved.mode||"classic";finished=!!saved.finished}}catch{}
$("date").textContent=now.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase();
$("edition").textContent=String(seed%999+1).padStart(3,"0");$("seedLabel").textContent=seed;
CAPITALS.forEach(c=>{let o=document.createElement("option");o.value=c.city;$("suggestions").appendChild(o)});
drawAtlas($("world"));
function km(a,b){const r=x=>x*Math.PI/180,R=6371,dl=r(b.lat-a.lat),dn=r(b.lon-a.lon),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
function direction(a,b){let dl=(b.lon-a.lon)*Math.PI/180,l1=a.lat*Math.PI/180,l2=b.lat*Math.PI/180,y=Math.sin(dl)*Math.cos(l2),x=Math.cos(l1)*Math.sin(l2)-Math.sin(l1)*Math.cos(l2)*Math.cos(dl);return ["↑","↗","→","↘","↓","↙","←","↖"][Math.round(((Math.atan2(y,x)*180/Math.PI+360)%360)/45)%8]}
function heat(d){return d<150?"QUASI LÌ":d<500?"MOLTO VICINO":d<1500?"VICINO":d<3500?"TIEPIDO":d<7000?"FREDDO":"LONTANO"}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify({guesses,mode,finished,practice,practiceSeed,targetCity:target.city}))}catch{}}
function render(){
 $("attempts").textContent=`${6-guesses.length} tentativi`;
 $("logCount").textContent=guesses.length?`${guesses.length} ${guesses.length===1?"traccia":"tracce"}`:"nessuna traccia";
 $("log").innerHTML="";
 if(!guesses.length)$("log").innerHTML='<p class="empty">Le tue annotazioni appariranno qui, una alla volta.</p>';
 guesses.forEach((g,i)=>{let row=document.createElement("div");row.className="log-item";row.innerHTML=`<span class="num">${String(i+1).padStart(2,"0")}</span><span class="name">${g.city}</span><span class="distance">${g.win?"TROVATA":mode==="classic"?g.km.toLocaleString("it-IT")+" km":g.heat}</span><span class="arrow">${g.win?"✳":g.dir}</span>`;$("log").appendChild(row)});
 $("classic").classList.toggle("chosen",mode==="classic");$("blind").classList.toggle("chosen",mode==="blind");
 $("classic").disabled=guesses.length>0||finished;$("blind").disabled=guesses.length>0||finished;
 $("city").disabled=finished;$("form").querySelector("button").disabled=finished;$("practice").classList.toggle("hidden",!finished);$("practice").textContent=practice?"un altro viaggio · pratica ↗":"inizia una pratica ↗";
}
function finish(win){finished=true;$("outcome").classList.remove("hidden");$("stamp").textContent=win?"TROVATA":"LA MAPPA RESTA MUTA";$("outTitle").textContent=win?`Era ${target.city}.`:`La capitale era ${target.city}.`;$("outText").textContent=win?`${target.city}, ${target.country}. Hai seguito il filo giusto.`:"Il viaggio si ferma qui. Domani ci sarà un altro luogo.";drawAtlas($("world"),null,target);$("feedback").textContent=win?"La trasmissione si è fatta nitida.":"Il segnale è svanito.";persist();render();if(!practice){$("practice").classList.remove("hidden")}soundFx(win?"win":"lose")}
function submit(value){if(finished)return;let c=CAPITALS.find(c=>norm(c.city)===norm(value));if(!c){$("feedback").textContent="Questa città non è nel nostro atlante. Prova una capitale.";return}if(guesses.some(g=>norm(g.city)===norm(c.city))){$("feedback").textContent="Hai già annotato questa città.";return}
let d=km(c,target),win=norm(c.city)===norm(target.city),dir=direction(c,target);guesses.push({city:c.city,km:Math.round(d),heat:heat(d),dir,win});$("city").value="";render();
if(win){finish(true);return}if(guesses.length>=6){finish(false);return}
$("feedback").textContent=mode==="classic"?`${heat(d)} · ${Math.round(d).toLocaleString("it-IT")} km · ${dir}`:`${heat(d)} · ${dir}`;
drawAtlas($("world"),c);persist();soundFx(win?"win":"guess",d)}
$("form").addEventListener("submit",e=>{e.preventDefault();submit($("city").value.trim())});
$("classic").onclick=()=>{if(guesses.length||finished)return;mode="classic";persist();render()};
$("blind").onclick=()=>{if(guesses.length||finished)return;mode="blind";persist();render()};
function audio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function tone(freq,at,duration=.09,wave="square",vol=.025){const c=audio(),o=c.createOscillator(),g=c.createGain();o.type=wave;o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vol,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(c.destination);o.start(at);o.stop(at+duration+.02)}
function sequence(notes){try{const c=audio();notes.forEach(([f,t,d,w,v])=>tone(f,c.currentTime+t,d||.09,w||"square",v||.025))}catch{}}
function soundFx(type,value=0){if(!sound)return;switch(type){case"start":sequence([[523,0,.07,"square"],[784,.09,.08,"square"],[1046,.19,.12,"triangle",.035]]);break;case"guess":{let base=value<150?880:value<500?660:value<1500?523:value<3500?392:value<7000?294:220;sequence([[base,0,.08,"square"],[base*.75,.08,.09,"triangle"]]);break}case"win":sequence([[523,0,.1,"triangle"],[659,.1,.1,"triangle"],[784,.2,.12,"triangle"],[1046,.34,.22,"sine",.04],[1318,.53,.3,"sine",.04]]);break;case"lose":sequence([[392,0,.13,"triangle"],[330,.14,.13,"triangle"],[262,.29,.18,"triangle"],[196,.48,.28,"sine"]]);break;case"toggle":sequence([[740,0,.06,"square"],[980,.07,.11,"triangle"]]);break}}
function updateSoundButton(){$("sound").innerHTML=`♫ <small>suono ${sound?"on":"off"}</small>`;$("sound").setAttribute("aria-label",sound?"Disattiva audio":"Attiva audio")}
function setSound(on){sound=on;localStorage.setItem("capitale-sound",on?"on":"off");updateSoundButton();if(on)soundFx("start")}
if(!localStorage.getItem("capitale-sound-choice"))$("soundPrompt").classList.remove("hidden");
$("soundYes").onclick=()=>{$("soundPrompt").classList.add("hidden");localStorage.setItem("capitale-sound-choice","yes");setSound(true)};
$("soundNo").onclick=()=>{$("soundPrompt").classList.add("hidden");localStorage.setItem("capitale-sound-choice","no");setSound(false)};
$("sound").onclick=()=>{setSound(!sound);localStorage.setItem("capitale-sound-choice","yes")};
updateSoundButton();
$("copy").onclick=async()=>{let text=`CAPITALE · ${key}\n${guesses.map(g=>g.win?"🟩":mode==="classic"?`▫ ${g.km} km ${g.dir}`:`▫ ${g.heat} ${g.dir}`).join("\n")}`;try{await navigator.clipboard.writeText(text);$("outText").textContent="Taccuino copiato. Passalo a un altro viaggiatore."}catch{$("outText").textContent=text}};
render();if(guesses.length) $("feedback").textContent="Partita ripresa dal taccuino.";if(finished){finish(guesses.some(g=>g.win));if(!practice)$("practice").classList.remove("hidden")}
$("practice").onclick=()=>startPractice();
function startPractice(){practice=true;practiceSeed=Math.floor(Math.random()*1e9);let idx=practiceSeed%CAPITALS.length;if(CAPITALS[idx].city===dailyTarget.city)idx=(idx+1)%CAPITALS.length;target=CAPITALS[idx];storageKey="capitale-practice-"+practiceSeed;guesses=[];mode="classic";finished=false;$("outcome").classList.add("hidden");$("feedback").textContent="Pratica · seed "+practiceSeed;drawAtlas($("world"));render();persist();soundFx("start")}
