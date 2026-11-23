import test from "node:test";
import assert from "node:assert/strict";

import { CAPITALS } from "../src/capitals.js";
import {
  MAX_GUESSES,
  compassDirection,
  dailySeed,
  dateKey,
  distanceKm,
  distanceLabel,
  normalizeCity,
  validateSession
} from "../src/game.js";

const paris = CAPITALS.find(city => city.city === "Parigi");
const london = CAPITALS.find(city => city.city === "Londra");

test("city names are compared without accents, spaces or punctuation", () => {
  assert.equal(normalizeCity("  Città del Messico "), "cittadelmessico");
  assert.equal(normalizeCity("São Paulo"), "saopaulo");
  assert.equal(normalizeCity("L'Avana"), "lavana");
  assert.equal(normalizeCity(null), "");
});

test("the daily edition is stable for a given local date", () => {
  const date = new Date(2026, 10, 23, 12);
  assert.equal(dateKey(date), "2026-11-23");
  assert.equal(dailySeed("2026-11-23"), dailySeed("2026-11-23"));
  assert.notEqual(dailySeed("2026-11-23"), dailySeed("2026-11-24"));
});

test("distance is zero for the same point and roughly correct between Paris and London", () => {
  assert.equal(distanceKm(paris, paris), 0);

  const distance = distanceKm(paris, london);
  assert.ok(distance > 330 && distance < 360, `unexpected distance: ${distance}`);
  assert.ok(Math.abs(distance - distanceKm(london, paris)) < 0.001);
});

test("compass directions use the expected eight-point compass", () => {
  const origin = { lat: 0, lon: 0 };

  assert.equal(compassDirection(origin, { lat: 10, lon: 0 }), "↑");
  assert.equal(compassDirection(origin, { lat: 0, lon: 10 }), "→");
  assert.equal(compassDirection(origin, { lat: -10, lon: 0 }), "↓");
  assert.equal(compassDirection(origin, { lat: 0, lon: -10 }), "←");
});

test("distance labels change at the intended thresholds", () => {
  assert.equal(distanceLabel(149), "QUASI LÌ");
  assert.equal(distanceLabel(150), "MOLTO VICINO");
  assert.equal(distanceLabel(500), "VICINO");
  assert.equal(distanceLabel(1500), "TIEPIDO");
  assert.equal(distanceLabel(3500), "FREDDO");
  assert.equal(distanceLabel(7000), "LONTANO");
});

test("the capital catalogue contains unique, usable coordinates", () => {
  const names = CAPITALS.map(city => normalizeCity(city.city));

  assert.ok(CAPITALS.length > 100);
  assert.equal(new Set(names).size, CAPITALS.length);

  for (const city of CAPITALS) {
    assert.ok(city.city);
    assert.ok(city.country);
    assert.ok(Number.isFinite(city.lat) && city.lat >= -90 && city.lat <= 90);
    assert.ok(Number.isFinite(city.lon) && city.lon >= -180 && city.lon <= 180);
  }
});

test("a valid saved game is restored with canonical city names", () => {
  const saved = {
    mode: "classic",
    finished: false,
    guesses: [{
      city: "  PARIGI ",
      km: 343.6,
      heat: "MOLTO VICINO",
      dir: "→",
      win: false
    }]
  };

  assert.deepEqual(validateSession(saved, CAPITALS), {
    mode: "classic",
    finished: false,
    guesses: [{
      city: "Parigi",
      km: 344,
      heat: "MOLTO VICINO",
      dir: "→",
      win: false
    }]
  });
});

test("saved games with duplicate or unknown cities are rejected", () => {
  const guess = {
    city: "Parigi",
    km: 0,
    heat: "QUASI LÌ",
    dir: "↑",
    win: false
  };

  assert.equal(validateSession({
    mode: "classic",
    finished: false,
    guesses: [guess, { ...guess, city: "PARIGI" }]
  }, CAPITALS), null);

  assert.equal(validateSession({
    mode: "classic",
    finished: false,
    guesses: [{ ...guess, city: "Atlantide" }]
  }, CAPITALS), null);
});

test("saved-game state must agree with its guesses and selected mode", () => {
  const saved = {
    mode: "blind",
    finished: false,
    guesses: [{
      city: "Roma",
      km: 0,
      heat: "QUASI LÌ",
      dir: "↑",
      win: false
    }]
  };

  assert.equal(validateSession(saved, CAPITALS, "classic"), null);
  assert.equal(validateSession({ ...saved, finished: true }, CAPITALS), null);
  assert.equal(validateSession({ ...saved, mode: "unknown" }, CAPITALS), null);
  assert.equal(MAX_GUESSES, 6);
});

test("a winning guess is only valid in a finished session", () => {
  const saved = {
    mode: "classic",
    finished: true,
    guesses: [{
      city: "Roma",
      km: 0,
      heat: "QUASI LÌ",
      dir: "↑",
      win: true
    }]
  };

  assert.ok(validateSession(saved, CAPITALS));
  assert.equal(validateSession({ ...saved, finished: false }, CAPITALS), null);
});
