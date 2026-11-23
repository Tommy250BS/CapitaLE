// Tiny custom pixel atlas, intentionally stylized rather than geographically precise.
const land = [
 [[44,43],[64,31],[91,28],[105,35],[116,46],[111,61],[96,66],[89,81],[72,80],[62,68],[49,65],[40,55]],
 [[113,82],[129,93],[136,111],[127,128],[117,144],[108,127],[104,109]],
 [[185,41],[201,31],[217,34],[229,45],[247,41],[266,50],[281,59],[278,72],[257,79],[248,94],[230,98],[222,113],[207,108],[197,91],[182,84],[170,66]],
 [[278,93],[289,104],[292,122],[284,143],[276,160],[265,151],[264,132]],
 [[314,48],[339,39],[364,45],[380,55],[403,53],[425,64],[440,77],[426,89],[407,86],[393,99],[378,95],[365,111],[350,107],[342,92],[324,86],[313,70]],
 [[393,112],[410,121],[419,141],[414,164],[400,178],[389,158],[384,139]],
 [[448,115],[460,123],[467,137],[460,145],[450,135]],
 [[479,48],[501,40],[521,46],[533,58],[520,66],[502,62],[488,70]],
 [[531,121],[543,130],[548,144],[541,154],[530,149]],
 [[565,160],[581,168],[587,184],[579,196],[563,190]],
 [[150,139],[158,147],[155,158],[147,152]],
 [[330,118],[338,127],[336,137],[328,132]]
];
export function renderMap(svg, marker=null, pulse=false){
  const NS="http://www.w3.org/2000/svg";
  svg.innerHTML="";
  const mk=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
  const grid=mk("g",{stroke:"#6c8158","stroke-width":"1","opacity":".28"});
  for(let x=0;x<=640;x+=32)grid.appendChild(mk("path",{d:`M${x} 0V330`}));for(let y=0;y<=330;y+=22)grid.appendChild(mk("path",{d:`M0 ${y}H640`}));
  svg.appendChild(grid);
  const landGroup=mk("g",{fill:"#354535",stroke:"#354535","stroke-width":"7","stroke-linejoin":"miter"});
  land.forEach(poly=>{let points=poly.map(([x,y])=>`${x*1.08+5},${y*1.2+15}`).join(" ");landGroup.appendChild(mk("polygon",{points}))});
  svg.appendChild(landGroup);
  // A few isolated pixel islands and texture blocks.
  const flecks=[[85,72],[90,78],[107,57],[124,123],[208,69],[237,75],[270,66],[359,68],[388,72],[421,91],[459,131],[514,57],[538,140],[580,183]];
  flecks.forEach(([x,y],i)=>svg.appendChild(mk("rect",{x:x*1.08+5,y:y*1.2+15,width:i%3===0?8:4,height:i%3===0?5:4,fill:"#354535"})));
  const markers=[["AM",82,94],["EU",248,76],["AF",277,145],["AS",411,91],["OC",567,185]];
  markers.forEach(([t,x,y])=>{const label=mk("text",{x:x*1.08+5,y:y*1.2+15,fill:"#c8d59c","font-family":"monospace","font-size":"10","font-weight":"bold"});label.textContent=t;svg.appendChild(label)});
  if(marker){
    let x=((marker.lon+180)/360)*640,y=((90-marker.lat)/180)*330;
    let g=mk("g",{transform:`translate(${x},${y})`});
    if(pulse)g.appendChild(mk("circle",{r:"10",fill:"none",stroke:"#d16f53","stroke-width":"2",opacity:".6"}));
    g.appendChild(mk("rect",{x:"-3",y:"-3",width:"6",height:"6",fill:"#d16f53",stroke:"#17231f","stroke-width":"1"}));
    svg.appendChild(g);
  }
}
