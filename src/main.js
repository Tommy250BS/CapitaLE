import { CAPITALS } from "./capitals.js";
import { drawAtlas } from "./map.js";
import {
  MAX_GUESSES,
  compassDirection,
  dailySeed,
  dateKey,
  distanceKm,
  distanceLabel,
  normalizeCity,
  validateSession
} from "./game.js";

const element = id => document.getElementById(id);
const date = new Date();
const today = dateKey(date);
const seed = dailySeed(today);
const dailyTarget = CAPITALS[seed % CAPITALS.length];
const DAILY_STORAGE_KEY = `capitale-daily-${today}`;
const ACTIVE_SESSION_KEY = "capitale-active-session-v1";
const SOUND_KEY = "capitale-sound";
const SOUND_CHOICE_KEY = "capitale-sound-choice";

let target = dailyTarget;
let practice = false;
let practiceSeed = null;
let storageKey = DAILY_STORAGE_KEY;
let guesses = [];
let mode = "classic";
let finished = false;
let sound = readStorage(SOUND_KEY) === "on";
let audioContext = null;
let lastFocusedElement = null;

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    element("feedback").textContent = "Il taccuino non può essere salvato su questo dispositivo.";
    return false;
  }
}

function removeStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
  }
}

function loadSession(key) {
  try {
    const stored = readStorage(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setText(id, value) {
  element(id).textContent = value;
}

function buildSuggestions() {
  const fragment = document.createDocumentFragment();
  CAPITALS.forEach(({ city }) => {
    const option = document.createElement("option");
    option.value = city;
    fragment.append(option);
  });
  element("suggestions").replaceChildren(fragment);
}

function restoreSession() {
  const active = loadSession(ACTIVE_SESSION_KEY);
  if (active?.kind === "practice" && Number.isInteger(active.seed)
    && Number.isInteger(active.targetIndex)
    && active.targetIndex >= 0 && active.targetIndex < CAPITALS.length) {
    const practiceKey = `capitale-practice-${active.seed}`;
    const savedPractice = loadSession(practiceKey);
    const practiceTarget = CAPITALS[active.targetIndex];
    const validated = validateSession(savedPractice, CAPITALS);

    if (validated && savedPractice?.targetCity === practiceTarget.city) {
      practice = true;
      practiceSeed = active.seed;
      target = practiceTarget;
      storageKey = practiceKey;
      applySession(validated);
      return;
    }
  }

  removeStorage(ACTIVE_SESSION_KEY);
  const savedDaily = loadSession(DAILY_STORAGE_KEY);
  const validatedDaily = validateSession(savedDaily, CAPITALS);
  if (validatedDaily && savedDaily?.targetCity === dailyTarget.city) applySession(validatedDaily);
}

function applySession(session) {
  guesses = session.guesses;
  mode = session.mode;
  finished = session.finished;
}

function persist() {
  const session = {
    version: 1,
    guesses,
    mode,
    finished,
    targetCity: target.city
  };
  writeStorage(storageKey, JSON.stringify(session));
  if (practice) {
    writeStorage(ACTIVE_SESSION_KEY, JSON.stringify({ kind: "practice", seed: practiceSeed, targetIndex: CAPITALS.indexOf(target) }));
  } else {
    writeStorage(ACTIVE_SESSION_KEY, JSON.stringify({ kind: "daily" }));
  }
}

function updateMasthead() {
  setText("date", date.toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).toLocaleUpperCase("it-IT"));
  setText("edition", String(seed % 999 + 1).padStart(3, "0"));
  setText("seedLabel", String(seed));
}

function makeLogEntry(guess, index) {
  const row = document.createElement("div");
  row.className = "log-item";

  const number = document.createElement("span");
  number.className = "num";
  number.textContent = String(index + 1).padStart(2, "0");

  const city = document.createElement("span");
  city.className = "name";
  city.textContent = guess.city;

  const distance = document.createElement("span");
  distance.className = "distance";
  distance.textContent = guess.win
    ? "TROVATA"
    : mode === "classic"
      ? `${guess.km.toLocaleString("it-IT")} km`
      : guess.heat;

  const direction = document.createElement("span");
  direction.className = "arrow";
  direction.textContent = guess.win ? "✳" : guess.dir;
  direction.setAttribute("aria-label", guess.win ? "Capitale trovata" : "Direzione");

  row.append(number, city, distance, direction);
  return row;
}

function render() {
  setText("attempts", `${MAX_GUESSES - guesses.length} tentativi`);
  setText("logCount", guesses.length
    ? `${guesses.length} ${guesses.length === 1 ? "traccia" : "tracce"}`
    : "nessuna traccia");

  const log = element("log");
  if (guesses.length) {
    log.replaceChildren(...guesses.map(makeLogEntry));
  } else {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Le tue annotazioni appariranno qui, una alla volta.";
    log.replaceChildren(empty);
  }

  element("classic").classList.toggle("chosen", mode === "classic");
  element("blind").classList.toggle("chosen", mode === "blind");
  element("classic").setAttribute("aria-pressed", String(mode === "classic"));
  element("blind").setAttribute("aria-pressed", String(mode === "blind"));
  element("classic").disabled = guesses.length > 0 || finished;
  element("blind").disabled = guesses.length > 0 || finished;
  element("city").disabled = finished;
  element("form").querySelector("button[type='submit']").disabled = finished;
  element("practice").classList.toggle("hidden", !finished);
  setText("practice", practice ? "un altro viaggio · pratica ↗" : "inizia una pratica ↗");
  element("outcome").classList.toggle("hidden", !finished);
}

function finish(won) {
  finished = true;
  setText("stamp", won ? "TROVATA" : "LA MAPPA RESTA MUTA");
  setText("outTitle", won ? `Era ${target.city}.` : `La capitale era ${target.city}.`);
  setText("outText", won
    ? `${target.city}, ${target.country}. Hai seguito il filo giusto.`
    : "Il viaggio si ferma qui. Domani ci sarà un altro luogo.");
  setText("feedback", won ? "La trasmissione si è fatta nitida." : "Il segnale è svanito.");
  drawAtlas(element("world"), null, target);
  persist();
  render();
  soundEffect(won ? "win" : "lose");
}

function submitGuess(rawValue) {
  if (finished) return;
  const city = CAPITALS.find(candidate => normalizeCity(candidate.city) === normalizeCity(rawValue));

  if (!city) {
    setText("feedback", "Questa città non è nel nostro atlante. Prova una capitale.");
    return;
  }
  if (guesses.some(guess => normalizeCity(guess.city) === normalizeCity(city.city))) {
    setText("feedback", "Hai già annotato questa città.");
    return;
  }

  const distance = distanceKm(city, target);
  const won = normalizeCity(city.city) === normalizeCity(target.city);
  const guess = {
    city: city.city,
    km: Math.round(distance),
    heat: distanceLabel(distance),
    dir: compassDirection(city, target),
    win: won
  };

  guesses.push(guess);
  element("city").value = "";
  if (won || guesses.length === MAX_GUESSES) {
    finish(won);
    return;
  }

  setText("feedback", mode === "classic"
    ? `${guess.heat} · ${guess.km.toLocaleString("it-IT")} km · ${guess.dir}`
    : `${guess.heat} · ${guess.dir}`);
  drawAtlas(element("world"), city);
  persist();
  render();
  soundEffect("guess", distance);
}

function setupGameControls() {
  element("form").addEventListener("submit", event => {
    event.preventDefault();
    submitGuess(element("city").value);
  });

  element("classic").addEventListener("click", () => changeMode("classic"));
  element("blind").addEventListener("click", () => changeMode("blind"));
  element("practice").addEventListener("click", startPractice);
  element("copy").addEventListener("click", copyNotebook);
}

function changeMode(nextMode) {
  if (guesses.length || finished || !["classic", "blind"].includes(nextMode)) return;
  mode = nextMode;
  persist();
  render();
}

function startPractice() {
  const previousSession = loadSession(ACTIVE_SESSION_KEY);
  if (previousSession?.kind === "practice" && Number.isInteger(previousSession.seed)) {
    removeStorage(`capitale-practice-${previousSession.seed}`);
  }

  practice = true;
  practiceSeed = randomPracticeSeed();
  let targetIndex = practiceSeed % CAPITALS.length;
  if (CAPITALS[targetIndex].city === dailyTarget.city) {
    targetIndex = (targetIndex + 1) % CAPITALS.length;
  }

  target = CAPITALS[targetIndex];
  storageKey = `capitale-practice-${practiceSeed}`;
  guesses = [];
  mode = "classic";
  finished = false;
  element("outcome").classList.add("hidden");
  setText("feedback", `Pratica · seed ${practiceSeed}`);
  drawAtlas(element("world"));
  render();
  persist();
  soundEffect("start");
  element("city").focus();
}

function randomPracticeSeed() {
  if (window.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    window.crypto.getRandomValues(value);
    return value[0];
  }
  return Math.floor(Math.random() * 0x100000000);
}

async function copyNotebook() {
  const lines = guesses.map(guess => {
    if (guess.win) return "🟩";
    return mode === "classic"
      ? `▫ ${guess.km} km ${guess.dir}`
      : `▫ ${guess.heat} ${guess.dir}`;
  });
  const notebook = [`CAPITALE · ${today}`, ...lines].join("\n");

  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(notebook);
    setText("outText", "Taccuino copiato. Passalo a un altro viaggiatore.");
  } catch {
    setText("outText", "Copia non disponibile qui.\n" + notebook);
  }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

function playTone(context, frequency, startAt, duration = 0.09, waveform = "square", volume = 0.025) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playSequence(notes) {
  try {
    const context = getAudioContext();
    if (!context) return;
    const startAt = context.currentTime;
    notes.forEach(([frequency, offset, duration, waveform, volume]) => {
      playTone(context, frequency, startAt + offset, duration, waveform, volume);
    });
  } catch {
    // an audio failure must never interrupt a round
  }
}

function soundEffect(type, distance = 0) {
  if (!sound) return;
  switch (type) {
    case "start":
      playSequence([[523, 0, .07, "square"], [784, .09, .08, "square"], [1046, .19, .12, "triangle", .035]]);
      break;
    case "guess": {
      const frequency = distance < 150 ? 880
        : distance < 500 ? 660
          : distance < 1500 ? 523
            : distance < 3500 ? 392
              : distance < 7000 ? 294 : 220;
      playSequence([[frequency, 0, .08, "square"], [frequency * .75, .08, .09, "triangle"]]);
      break;
    }
    case "win":
      playSequence([[523, 0, .1, "triangle"], [659, .1, .1, "triangle"], [784, .2, .12, "triangle"], [1046, .34, .22, "sine", .04], [1318, .53, .3, "sine", .04]]);
      break;
    case "lose":
      playSequence([[392, 0, .13, "triangle"], [330, .14, .13, "triangle"], [262, .29, .18, "triangle"], [196, .48, .28, "sine"]]);
      break;
    case "toggle":
      playSequence([[740, 0, .06, "square"], [980, .07, .11, "triangle"]]);
      break;
  }
}

function updateSoundButton() {
  const button = element("sound");
  const label = document.createElement("small");
  label.textContent = `suono ${sound ? "on" : "off"}`;
  button.replaceChildren(document.createTextNode("♫ "), label);
  button.setAttribute("aria-label", sound ? "Disattiva audio" : "Attiva audio");
  button.setAttribute("aria-pressed", String(sound));
}

function setSound(enabled) {
  sound = enabled;
  writeStorage(SOUND_KEY, enabled ? "on" : "off");
  updateSoundButton();
  if (enabled) soundEffect("start");
}

function closeSoundPrompt(choice) {
  const prompt = element("soundPrompt");
  prompt.classList.add("hidden");
  prompt.setAttribute("aria-hidden", "true");
  writeStorage(SOUND_CHOICE_KEY, choice);
  setSound(choice === "yes");
  if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
}

function setupSoundControls() {
  const prompt = element("soundPrompt");
  element("soundYes").addEventListener("click", () => closeSoundPrompt("yes"));
  element("soundNo").addEventListener("click", () => closeSoundPrompt("no"));
  element("sound").addEventListener("click", () => {
    writeStorage(SOUND_CHOICE_KEY, "yes");
    setSound(!sound);
  });

  if (!readStorage(SOUND_CHOICE_KEY)) {
    lastFocusedElement = document.activeElement;
    prompt.classList.remove("hidden");
    prompt.removeAttribute("aria-hidden");
    element("soundYes").focus();
  } else {
    prompt.setAttribute("aria-hidden", "true");
  }

  prompt.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSoundPrompt("no");
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [element("soundYes"), element("soundNo")];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

function initialize() {
  updateMasthead();
  buildSuggestions();
  setupGameControls();
  setupSoundControls();
  updateSoundButton();
  drawAtlas(element("world"));
  restoreSession();
  render();

  if (guesses.length) {
    setText("feedback", "Partita ripresa dal taccuino.");
    const lastGuess = CAPITALS.find(city => normalizeCity(city.city) === normalizeCity(guesses.at(-1).city));
    if (finished) finish(guesses.some(guess => guess.win));
    else if (lastGuess) drawAtlas(element("world"), lastGuess);
  }
}

initialize();
