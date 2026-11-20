import { ConversationClient, describeError } from "./claude.js";
import { LevelController, speechRate } from "./level.js";
import { Listener, sttSupported, speak, stopSpeaking, unlockSpeech } from "./speech.js";

const $ = (id) => document.getElementById(id);

// ---- 저장된 설정 (이 기기에만 저장) ----
const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 저장 불가 시 무시 */
    }
  },
};

const state = {
  apiKey: store.get("apiKey", ""),
  koMode: store.get("koMode", "auto"), // auto | show | hide
  level: new LevelController(store.get("baseLevel", 3)),
  client: null,
  listener: null,
  phase: "idle", // idle | listening | thinking
  lastReply: "",
  started: false,
};

// ---- 화면 갱신 ----
function renderLevel(flash = false) {
  const lv = state.level.current;
  $("lv").textContent = `Lv.${lv}`;
  $("up").disabled = lv >= 10;
  $("down").disabled = lv <= 1;
  if (flash) {
    $("lv").classList.remove("flash");
    void $("lv").offsetWidth;
    $("lv").classList.add("flash");
  }
  store.set("baseLevel", state.level.base);
  applyKoVisibility();
}

function koHiddenByDefault() {
  if (state.koMode === "show") return false;
  if (state.koMode === "hide") return true;
  return state.level.current >= 5;
}

function applyKoVisibility() {
  for (const el of document.querySelectorAll(".ko")) {
    if (el.dataset.revealed === "1") continue;
    el.classList.toggle("hidden-ko", koHiddenByDefault());
  }
}

function setKo(el, text) {
  el.textContent = text;
  el.dataset.revealed = "0";
  el.classList.toggle("hidden-ko", koHiddenByDefault() && Boolean(text));
}

function setPhase(phase) {
  state.phase = phase;
  const mic = $("mic");
  mic.dataset.phase = phase;
  mic.disabled = phase === "thinking";
  $("mic-label").textContent =
    phase === "listening" ? "눌러서 보내기" : phase === "thinking" ? "생각 중…" : "눌러서 말하기";
}

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 5000);
}

// ---- 대화 ----
async function runTurn(text) {
  setPhase("thinking");
  try {
    const data = await state.client.turn(text, state.level.current);
    if (text != null) {
      setKo($("me-ko"), data.user_ko);
      const before = state.level.current;
      state.level.observe(Number(data.user_level));
      renderLevel(state.level.current !== before);
    }
    $("ai-en").textContent = data.reply_en;
    setKo($("ai-ko"), data.reply_ko);
    state.lastReply = data.reply_en;
    speak(data.reply_en, speechRate(state.level.current));
  } catch (err) {
    toast(describeError(err));
  } finally {
    setPhase("idle");
  }
}

async function startConversation() {
  state.client = new ConversationClient(state.apiKey);
  state.started = true;
  $("ai-en").textContent = "…";
  setKo($("ai-ko"), "");
  $("me-en").textContent = "";
  setKo($("me-ko"), "");
  await runTurn(null);
}

async function onMic() {
  unlockSpeech();
  if (!state.apiKey) {
    openSettings();
    return;
  }
  if (!state.started) {
    await startConversation();
    return;
  }
  if (state.phase === "idle") {
    stopSpeaking();
    $("me-en").textContent = "";
    $("me-en").classList.add("live");
    setKo($("me-ko"), "");
    try {
      state.listener.start();
      setPhase("listening");
    } catch (err) {
      toast(err.message);
    }
  } else if (state.phase === "listening") {
    const text = await state.listener.stop();
    $("me-en").classList.remove("live");
    if (!text) {
      setPhase("idle");
      toast("말소리가 들리지 않았어요. 다시 눌러서 말해 주세요.");
      return;
    }
    $("me-en").textContent = text;
    await runTurn(text);
  }
}

function adjustLevel(delta) {
  state.level.manual(delta);
  renderLevel(true);
}

// ---- 설정 ----
function openSettings() {
  $("key-input").value = state.apiKey;
  $("ko-mode").value = state.koMode;
  $("settings").showModal();
}

function saveSettings(e) {
  e.preventDefault();
  const key = $("key-input").value.trim();
  const keyChanged = key !== state.apiKey;
  state.apiKey = key;
  state.koMode = $("ko-mode").value;
  store.set("apiKey", key);
  store.set("koMode", state.koMode);
  $("settings").close();
  applyKoVisibility();
  if (keyChanged) state.started = false;
  if (key && !state.started) {
    unlockSpeech();
    startConversation();
  }
}

// ---- 시작 ----
function init() {
  state.listener = new Listener({
    onInterim: (text) => ($("me-en").textContent = text),
    onError: (msg) => {
      toast(msg);
      $("me-en").classList.remove("live");
      setPhase("idle");
    },
  });

  $("mic").addEventListener("click", onMic);
  $("up").addEventListener("click", () => adjustLevel(1));
  $("down").addEventListener("click", () => adjustLevel(-1));
  $("open-settings").addEventListener("click", openSettings);
  $("settings-form").addEventListener("submit", saveSettings);
  $("close-settings").addEventListener("click", () => $("settings").close());
  $("new-chat").addEventListener("click", () => {
    $("settings").close();
    if (state.apiKey) startConversation();
  });

  // 국문 탭하면 보이기
  for (const el of document.querySelectorAll(".ko")) {
    el.addEventListener("click", () => {
      el.dataset.revealed = "1";
      el.classList.remove("hidden-ko");
    });
  }
  // AI 문장 탭: 다시 듣기 / 길게 누르기: 느리게 듣기
  let pressTimer;
  let longPressed = false;
  const ai = $("ai-en");
  ai.addEventListener("pointerdown", () => {
    longPressed = false;
    pressTimer = setTimeout(() => {
      longPressed = true;
      speak(state.lastReply, 0.7);
    }, 500);
  });
  ai.addEventListener("pointerup", () => {
    clearTimeout(pressTimer);
    if (!longPressed) speak(state.lastReply, speechRate(state.level.current));
  });
  ai.addEventListener("pointerleave", () => clearTimeout(pressTimer));

  if (!sttSupported) toast("이 브라우저는 음성 인식을 지원하지 않아요. iPhone에서는 Safari로 열어 주세요.");

  renderLevel();
  setPhase("idle");
  if (!state.apiKey) {
    $("ai-en").textContent = "Hi! Tap the mic to start.";
    setKo($("ai-ko"), "먼저 설정에서 API 키를 입력해 주세요.");
  } else {
    $("ai-en").textContent = "Tap the mic to start talking.";
    setKo($("ai-ko"), "마이크를 누르면 대화를 시작해요.");
  }
}

init();
