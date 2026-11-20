// 음성 인식(STT)과 음성 합성(TTS). iOS Safari의 Web Speech API를 사용한다.

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const sttSupported = Boolean(Recognition);

export class Listener {
  constructor({ onInterim, onError }) {
    this.onInterim = onInterim;
    this.onError = onError;
    this.rec = null;
    this.finalText = "";
    this.interimText = "";
    this.active = false;
    this._resolveStop = null;
  }

  start() {
    if (!Recognition) throw new Error("이 브라우저는 음성 인식을 지원하지 않아요. iPhone에서는 Safari로 열어 주세요.");
    this.finalText = "";
    this.interimText = "";
    const rec = new Recognition();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      this.interimText = interim;
      this.onInterim?.(this.text);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      const msg =
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "마이크 또는 음성 인식 권한이 꺼져 있어요. 설정 > Safari > 마이크, 그리고 설정 > 개인정보 보호 > 음성 인식을 확인해 주세요."
          : `음성 인식 오류: ${e.error}`;
      this.onError?.(msg);
    };
    rec.onend = () => {
      this.active = false;
      const resolve = this._resolveStop;
      this._resolveStop = null;
      resolve?.(this.text);
    };

    this.rec = rec;
    this.active = true;
    rec.start();
  }

  get text() {
    return (this.finalText + this.interimText).replace(/\s+/g, " ").trim();
  }

  // 녹음을 멈추고 최종 텍스트를 돌려준다
  stop() {
    if (!this.rec || !this.active) return Promise.resolve(this.text);
    return new Promise((resolve) => {
      this._resolveStop = resolve;
      this.rec.stop();
      // 일부 브라우저에서 onend가 오지 않는 경우 대비
      setTimeout(() => {
        if (this._resolveStop) {
          this._resolveStop = null;
          this.active = false;
          resolve(this.text);
        }
      }, 1500);
    });
  }
}

// ---- TTS ----

let voice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang?.startsWith("en"));
  voice =
    voices.find((v) => v.lang === "en-US" && /Samantha|Ava|Allison|Susan/i.test(v.name)) ||
    voices.find((v) => v.lang === "en-US") ||
    voices[0] ||
    null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

// iOS는 사용자 터치 안에서 한 번 speak()를 호출해야 이후 자동 재생이 된다
let unlocked = false;
export function unlockSpeech() {
  if (unlocked || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  speechSynthesis.speak(u);
  unlocked = true;
}

export function speak(text, rate = 1) {
  if (!("speechSynthesis" in window) || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  if (voice) u.voice = voice;
  u.rate = rate;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}
