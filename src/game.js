export const MAX_GUESSES = 6;

const EARTH_RADIUS_KM = 6371;
const CITY_DIACRITICS = /[\u0300-\u036f]/g;

export function normalizeCity(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(CITY_DIACRITICS, "")
    .replace(/[^a-z]/g, "");
}

export function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dailySeed(key) {
  return key.split("").reduce(
    (seed, character) => (seed * 31 + character.charCodeAt(0)) >>> 0,
    19
  );
}

export function distanceKm(from, to) {
  const toRadians = degrees => degrees * Math.PI / 180;
  const latitudeFrom = toRadians(from.lat);
  const latitudeTo = toRadians(to.lat);
  const latitudeDelta = latitudeTo - latitudeFrom;
  const longitudeDelta = toRadians(to.lon - from.lon);

  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitudeFrom) * Math.cos(latitudeTo)
    * Math.sin(longitudeDelta / 2) ** 2;

  const safeHaversine = Math.min(1, Math.max(0, haversine));
  const arc = 2 * Math.atan2(
    Math.sqrt(safeHaversine),
    Math.sqrt(1 - safeHaversine)
  );

  return EARTH_RADIUS_KM * arc;
}

export function compassDirection(from, to) {
  const toRadians = degrees => degrees * Math.PI / 180;
  const longitudeDelta = toRadians(to.lon - from.lon);
  const latitudeFrom = toRadians(from.lat);
  const latitudeTo = toRadians(to.lat);

  const y = Math.sin(longitudeDelta) * Math.cos(latitudeTo);
  const x = Math.cos(latitudeFrom) * Math.sin(latitudeTo)
    - Math.sin(latitudeFrom) * Math.cos(latitudeTo) * Math.cos(longitudeDelta);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const directions = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];

  return directions[Math.round(bearing / 45) % directions.length];
}

export function distanceLabel(distance) {
  if (distance < 150) return "QUASI LÌ";
  if (distance < 500) return "MOLTO VICINO";
  if (distance < 1500) return "VICINO";
  if (distance < 3500) return "TIEPIDO";
  if (distance < 7000) return "FREDDO";
  return "LONTANO";
}

export function validateSession(value, capitals, expectedMode = null) {
  if (!value || typeof value !== "object" || !Array.isArray(value.guesses)) return null;
  if (value.guesses.length > MAX_GUESSES) return null;
  if (!["classic", "blind"].includes(value.mode)) return null;
  if (expectedMode && value.mode !== expectedMode) return null;

  const citiesByName = new Map(
    capitals.map(city => [normalizeCity(city.city), city.city])
  );
  const seen = new Set();
  const guesses = [];

  for (const guess of value.guesses) {
    if (!guess || typeof guess.city !== "string") return null;

    const cityKey = normalizeCity(guess.city);
    const canonicalName = citiesByName.get(cityKey);

    if (!canonicalName || seen.has(cityKey)) return null;
    if (!Number.isFinite(guess.km) || guess.km < 0 || guess.km > 20100) return null;
    if (typeof guess.heat !== "string" || typeof guess.dir !== "string") return null;
    if (typeof guess.win !== "boolean") return null;

    seen.add(cityKey);
    guesses.push({
      city: canonicalName,
      km: Math.round(guess.km),
      heat: guess.heat,
      dir: guess.dir,
      win: guess.win
    });
  }

  const shouldBeFinished = guesses.some(guess => guess.win)
    || guesses.length === MAX_GUESSES;

  if (value.finished !== shouldBeFinished) return null;

  return {
    guesses,
    mode: value.mode,
    finished: shouldBeFinished
  };
}
