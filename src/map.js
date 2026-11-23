const NS = "http://www.w3.org/2000/svg";
let landData;
const add = (svg, tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  svg.appendChild(el); return el;
};

// Mollweide projection: equal-area world view, with the antimeridian handled by GeoJSON rings.
function project(lon, lat) {
  const lambda = lon * Math.PI / 180, phi = lat * Math.PI / 180;
  let theta = phi;
  for (let i=0;i<10;i++) {
    const denom = 2 + 2*Math.cos(2*theta);
    if (Math.abs(denom) < 1e-7) break;
    theta -= (2*theta + Math.sin(2*theta) - Math.PI*Math.sin(phi))/denom;
  }
  const X = 2*Math.sqrt(2)/Math.PI * lambda * Math.cos(theta);
  const Y = Math.sqrt(2)*Math.sin(theta);
  return [450 + X*145, 235 - Y*145];
}
function ringPath(ring) {
  return ring.map(([lon,lat],i)=>{const [x,y]=project(lon,lat);return `${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`}).join(' ')+' Z';
}
function geometryPaths(geometry) {
  if(!geometry)return [];
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
  return polygons.flatMap(poly=>poly.map(ringPath));
}
async function getLand() {
  if(landData) return landData;
  const response=await fetch(new URL('./world.geojson',import.meta.url));
  if(!response.ok) throw new Error('Impossibile caricare la carta geografica');
  landData=await response.json(); return landData;
}
export async function drawAtlas(svg,guess=null,correct=null) {
  svg.innerHTML='';
  // Fine graticule, sampled curves in the same projection as the coastline.
  [-60,-30,0,30,60].forEach(lat=>{
    let d=''; for(let lon=-180;lon<=180;lon+=3){const [x,y]=project(lon,lat);d+=`${lon===-180?'M':'L'}${x.toFixed(2)} ${y.toFixed(2)} `;}
    add(svg,'path',{d,fill:'none',stroke:'#b6b09c','stroke-width':'.55','stroke-opacity':'.42'});
  });
  [-120,-60,0,60,120].forEach(lon=>{
    let d=''; for(let lat=-85;lat<=85;lat+=2){const [x,y]=project(lon,lat);d+=`${lat===-85?'M':'L'}${x.toFixed(2)} ${y.toFixed(2)} `;}
    add(svg,'path',{d,fill:'none',stroke:'#b6b09c','stroke-width':'.55','stroke-opacity':'.42'});
  });
  try {
    const geo=await getLand();
    geo.features.forEach(feature=>geometryPaths(feature.geometry).forEach(d=>add(svg,'path',{d,fill:'#c9cbb2',stroke:'#71836c','stroke-width':'.8','stroke-linejoin':'round','stroke-linecap':'round'})));
  } catch(err) {
    const note=add(svg,'text',{x:450,y:235,'text-anchor':'middle',fill:'#847f70','font-size':'12'});note.textContent='Carta geografica non disponibile';
  }
  // Location dots use the same projection as the land, not a rectangular lat/lon grid.
  const marker=(point,kind)=>{if(!point)return;const [x,y]=project(point.lon,point.lat);if(kind==='guess')add(svg,'circle',{cx:x,cy:y,r:8,fill:'none',stroke:'#b9543f','stroke-width':'1','stroke-dasharray':'2 3'});add(svg,'circle',{cx:x,cy:y,r:kind==='guess'?3.5:4,fill:'#b9543f'});};
  marker(guess,'guess'); marker(correct,'correct');
}
