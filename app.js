const PEOPLE_YAML_PATH = "./data/people.yml";
const OPTIONS_PER_QUESTION = 3;

const imageEl = document.getElementById("person-image");
const optionsEl = document.getElementById("options");
const feedbackEl = document.getElementById("feedback");
const nextBtn = document.getElementById("next-btn");
const levelEl = document.getElementById("level");
const scoreEl = document.getElementById("score");
const correctEl = document.getElementById("correct");
const streakEl = document.getElementById("streak");
const cardEl = document.getElementById("card");
const confettiCanvas = document.getElementById("confetti-canvas");

const state = {
  people: [],
  currentPerson: null,
  options: [],
  answered: false,
  score: 0,
  correct: 0,
  streak: 0,
  level: 1,
  lastPersonId: null,
};

let audioCtx;
let introPlayed = false;
const introMessage = "¡Hola, Claudia! Adivina quiénes son estas personas de nuestra familia.";

function parsePeopleYAML(yamlText) {
  const lines = yamlText
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  "));

  const people = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || line === "people:") {
      continue;
    }

    if (line.startsWith("- ")) {
      if (current && current.name && current.image) {
        people.push(current);
      }
      current = {};
      const inline = line.replace(/^-\s*/, "");
      if (inline.includes(":")) {
        const [k, ...rest] = inline.split(":");
        current[k.trim()] = cleanValue(rest.join(":"));
      }
      continue;
    }

    if (!current || !line.includes(":")) {
      continue;
    }

    const [key, ...rest] = line.split(":");
    current[key.trim()] = cleanValue(rest.join(":"));
  }

  if (current && current.name && current.image) {
    people.push(current);
  }

  return people.map((person, idx) => ({
    id: person.id || `person-${idx + 1}`,
    name: person.name,
    image: person.image,
  }));
}

function cleanValue(value) {
  return value
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^'|'$/g, "");
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickNextPerson() {
  const candidates = state.people.filter((p) => p.id !== state.lastPersonId);
  const pool = candidates.length ? candidates : state.people;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildOptions(correctPerson) {
  const others = state.people.filter((p) => p.id !== correctPerson.id);
  const wrong = shuffle(others).slice(0, OPTIONS_PER_QUESTION - 1);
  return shuffle([correctPerson, ...wrong]);
}

function speakText(text) {
  if (!window.speechSynthesis) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function playIntroOnce() {
  if (introPlayed) {
    return;
  }
  introPlayed = true;
  speakText(introMessage);
}

function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new window.AudioContext();
  }
}

function playTone({ frequency = 440, duration = 0.18, type = "sine", gain = 0.08 }) {
  ensureAudioContext();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);

  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(g);
  g.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function playSuccessSound() {
  playTone({ frequency: 523.25, duration: 0.15, type: "triangle", gain: 0.1 });
  setTimeout(() => playTone({ frequency: 659.25, duration: 0.18, type: "triangle", gain: 0.1 }), 140);
  setTimeout(() => playTone({ frequency: 783.99, duration: 0.22, type: "triangle", gain: 0.1 }), 280);
}

function playMildErrorSound() {
  playTone({ frequency: 220, duration: 0.16, type: "sine", gain: 0.045 });
}

function playStreakSound() {
  playTone({ frequency: 523.25, duration: 0.14, type: "square", gain: 0.085 });
  setTimeout(() => playTone({ frequency: 659.25, duration: 0.14, type: "square", gain: 0.085 }), 110);
  setTimeout(() => playTone({ frequency: 783.99, duration: 0.16, type: "square", gain: 0.09 }), 220);
  setTimeout(() => playTone({ frequency: 1046.5, duration: 0.26, type: "triangle", gain: 0.11 }), 320);
}

function triggerConfetti({ particleCount = 120, frames = 90 } = {}) {
  const ctx = confettiCanvas.getContext("2d");
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  const particles = Array.from({ length: particleCount }, () => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: window.innerHeight * 0.23 + (Math.random() - 0.5) * 30,
    vx: (Math.random() - 0.5) * 8,
    vy: Math.random() * -8 - 2,
    g: 0.18 + Math.random() * 0.08,
    s: 5 + Math.random() * 5,
    a: 1,
    c: ["#22c55e", "#fb7185", "#2dd4bf", "#f59e0b", "#60a5fa"][Math.floor(Math.random() * 5)],
  }));

  let frame = 0;

  function draw() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.g;
      p.a -= 0.012;

      ctx.globalAlpha = Math.max(0, p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.s, p.s * 0.6);
    });

    frame += 1;
    if (frame < frames) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  requestAnimationFrame(draw);
}

function triggerStreakCelebration() {
  cardEl.classList.remove("party");
  void cardEl.offsetWidth;
  cardEl.classList.add("party");
  triggerConfetti({ particleCount: 240, frames: 120 });
  playStreakSound();
}

function updateStats() {
  state.level = Math.floor(state.correct / 5) + 1;
  levelEl.textContent = String(state.level);
  scoreEl.textContent = String(state.score);
  correctEl.textContent = String(state.correct);
  streakEl.textContent = String(state.streak);
}

function setFeedback(message, tone) {
  feedbackEl.textContent = message;
  feedbackEl.classList.remove("correct", "incorrect");
  if (tone === "correct") {
    feedbackEl.classList.add("correct");
  }
  if (tone === "incorrect") {
    feedbackEl.classList.add("incorrect");
  }
}

function lockOptions() {
  optionsEl.querySelectorAll(".name-btn").forEach((btn) => {
    btn.disabled = true;
  });
}

function onAnswer(person) {
  if (state.answered) {
    return;
  }

  state.answered = true;

  const isCorrect = person.id === state.currentPerson.id;
  lockOptions();

  if (isCorrect) {
    state.correct += 1;
    state.streak += 1;
    state.score += 10 + (state.level - 1) * 2;
    updateStats();
    if (state.streak % 5 === 0) {
      setFeedback(`Increíble. Llevas ${state.streak} seguidas.`, "correct");
      triggerStreakCelebration();
      speakText(`Fantástico. ${state.streak} respuestas correctas seguidas.`);
    } else {
      setFeedback("Muy bien. Respuesta correcta.", "correct");
      triggerConfetti();
      playSuccessSound();
      speakText(`Excelente. Es ${state.currentPerson.name}.`);
    }
    return;
  }

  state.streak = 0;
  state.score = Math.max(0, state.score - 2);
  updateStats();
  setFeedback(`Casi. La respuesta correcta es ${state.currentPerson.name}.`, "incorrect");
  cardEl.classList.remove("shake");
  void cardEl.offsetWidth;
  cardEl.classList.add("shake");
  playMildErrorSound();
}

function renderQuestion() {
  state.answered = false;
  setFeedback("", null);

  state.currentPerson = pickNextPerson();
  state.lastPersonId = state.currentPerson.id;
  state.options = buildOptions(state.currentPerson);

  imageEl.src = state.currentPerson.image;
  imageEl.alt = `Foto de ${state.currentPerson.name}`;

  optionsEl.innerHTML = "";

  state.options.forEach((person) => {
    const row = document.createElement("div");
    row.className = "option-row";

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "name-btn";
    nameBtn.textContent = person.name;
    nameBtn.addEventListener("click", () => onAnswer(person));

    const speakBtn = document.createElement("button");
    speakBtn.type = "button";
    speakBtn.className = "speak-btn";
    speakBtn.title = `Escuchar ${person.name}`;
    speakBtn.setAttribute("aria-label", `Escuchar ${person.name}`);
    speakBtn.textContent = "Audio";
    speakBtn.addEventListener("click", () => {
      ensureAudioContext();
      speakText(person.name);
    });

    row.append(nameBtn, speakBtn);
    optionsEl.appendChild(row);
  });
}

async function loadPeople() {
  const response = await fetch(PEOPLE_YAML_PATH);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${PEOPLE_YAML_PATH}`);
  }

  const yaml = await response.text();
  const people = parsePeopleYAML(yaml);

  if (people.length < OPTIONS_PER_QUESTION) {
    throw new Error("Necesitas al menos 3 personas en data/people.yml");
  }

  return people;
}

async function init() {
  try {
    state.people = await loadPeople();
    renderQuestion();
    updateStats();
    setTimeout(() => {
      playIntroOnce();
    }, 450);
  } catch (err) {
    console.error(err);
    setFeedback(`Error: ${err.message}`, "incorrect");
    nextBtn.disabled = true;
  }
}

nextBtn.addEventListener("click", () => {
  renderQuestion();
});

window.addEventListener("resize", () => {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
});

window.addEventListener(
  "pointerdown",
  () => {
    playIntroOnce();
  },
  { once: true }
);

init();
