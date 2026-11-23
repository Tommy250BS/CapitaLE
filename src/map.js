const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
let landData;
let drawRevision = 0;

function append(svg, tagName, attributes = {}) {
  const node = document.createElementNS(SVG_NAMESPACE, tagName);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  svg.append(node);
  return node;
}


function project(longitude, latitude) {
  const lambda = longitude * Math.PI / 180;
  const phi = latitude * Math.PI / 180;
  let theta = phi;

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const denominator = 2 + 2 * Math.cos(2 * theta);
    if (Math.abs(denominator) < 1e-7) break;
    const correction = (2 * theta + Math.sin(2 * theta) - Math.PI * Math.sin(phi)) / denominator;
    theta -= correction;
    if (Math.abs(correction) < 1e-10) break;
  }

  const x = 2 * Math.SQRT2 / Math.PI * lambda * Math.cos(theta);
  const y = Math.SQRT2 * Math.sin(theta);
  return [450 + x * 145, 235 - y * 145];
}

function ringPath(ring) {
  return ring.map(([longitude, latitude], index) => {
    const [x, y] = project(longitude, latitude);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function polygonPaths(geometry) {
  if (!geometry) return [];
  const polygons = geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [];

  
  return polygons.map(rings => rings.map(ringPath).join(" "));
}

async function loadLand() {
  if (landData) return landData;
  const response = await fetch(new URL("./world.geojson", import.meta.url));
  if (!response.ok) throw new Error(`Map data request failed (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data.features)) throw new Error("Map data is not a GeoJSON feature collection");
  landData = data;
  return landData;
}

function drawGraticule(svg) {
  [-60, -30, 0, 30, 60].forEach(latitude => {
    let path = "";
    for (let longitude = -180; longitude <= 180; longitude += 3) {
      const [x, y] = project(longitude, latitude);
      path += `${longitude === -180 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    append(svg, "path", {
      d: path, fill: "none", stroke: "#b6b09c", "stroke-width": ".55", "stroke-opacity": ".42"
    });
  });

  [-120, -60, 0, 60, 120].forEach(longitude => {
    let path = "";
    for (let latitude = -85; latitude <= 85; latitude += 2) {
      const [x, y] = project(longitude, latitude);
      path += `${latitude === -85 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    append(svg, "path", {
      d: path, fill: "none", stroke: "#b6b09c", "stroke-width": ".55", "stroke-opacity": ".42"
    });
  });
}

function drawMarker(svg, point, kind) {
  if (!point) return;
  const [x, y] = project(point.lon, point.lat);
  if (kind === "guess") {
    append(svg, "circle", {
      cx: x, cy: y, r: 8, fill: "none", stroke: "#b9543f",
      "stroke-width": 1, "stroke-dasharray": "2 3"
    });
  }
  append(svg, "circle", {
    cx: x, cy: y, r: kind === "guess" ? 3.5 : 4, fill: "#b9543f"
  });
}

export async function drawAtlas(svg, guess = null, correct = null) {
  const revision = ++drawRevision;
  svg.replaceChildren();
  drawGraticule(svg);

  try {
    const geography = await loadLand();
    
    if (revision !== drawRevision || !svg.isConnected) return;

    geography.features.forEach(feature => {
      polygonPaths(feature.geometry).forEach(path => append(svg, "path", {
        d: path,
        fill: "#c9cbb2",
        "fill-rule": "evenodd",
        stroke: "#71836c",
        "stroke-width": ".8",
        "stroke-linejoin": "round",
        "stroke-linecap": "round"
      }));
    });
  } catch {
    if (revision !== drawRevision || !svg.isConnected) return;
    const note = append(svg, "text", {
      x: 450, y: 235, "text-anchor": "middle", fill: "#847f70", "font-size": 12
    });
    note.textContent = "Carta geografica non disponibile";
  }

  if (revision !== drawRevision || !svg.isConnected) return;
  drawMarker(svg, guess, "guess");
  drawMarker(svg, correct, "correct");
}
