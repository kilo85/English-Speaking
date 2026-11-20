import Anthropic from "@anthropic-ai/sdk";
import { cefr } from "./level.js";

const MODEL = "claude-opus-5-5";
const MAX_HISTORY_MESSAGES = 40;

const SYSTEM = `You are a friendly English conversation partner for a Korean learner.
Hold a natural, casual spoken conversation. Keep each reply short (1-3 sentences) and end with something that invites the learner to keep talking, usually a question.
Every user turn starts with a line like "[target level: 4/10 (A2)]". Speak at exactly that level:
- Levels 1-2: very common words, very short sentences, yes/no or either/or questions.
- Levels 3-4: simple everyday vocabulary, short sentences, simple open questions.
- Levels 5-6: natural everyday English, some phrasal verbs, ask for reasons and opinions.
- Levels 7-8: richer vocabulary, idioms, longer sentences with clauses.
- Levels 9-10: native-like speech with nuance, idioms and abstract topics.
The learner's text comes from speech recognition, so ignore small transcription glitches. Do not correct their grammar unless they ask.
Also rate the learner's latest utterance on the same 1-10 scale, based on vocabulary range, sentence complexity, grammatical accuracy, and whether they fell back on Korean. If the turn is "[start]", set user_level to the target level and user_ko to an empty string.`;

const SCHEMA = {
  type: "object",
  properties: {
    reply_en: { type: "string", description: "Your spoken reply in English." },
    reply_ko: { type: "string", description: "Natural Korean translation of reply_en." },
    user_ko: { type: "string", description: "Natural Korean translation of the learner's latest utterance." },
    user_level: { type: "integer", description: "Your 1-10 rating of the learner's latest utterance." },
  },
  required: ["reply_en", "reply_ko", "user_ko", "user_level"],
  additionalProperties: false,
};

export class ConversationClient {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    this.messages = [];
  }

  reset() {
    this.messages = [];
  }

  // text가 null이면 대화 시작(AI가 먼저 말을 건다)
  async turn(text, level) {
    const header = `[target level: ${level}/10 (${cefr(level)})]`;
    const body = text == null ? "[start]" : text;
    this.messages.push({ role: "user", content: `${header}\n${body}` });

    let response;
    try {
      response = await this.client.beta.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM,
        messages: this.messages,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: SCHEMA },
        },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
    } catch (err) {
      this.messages.pop();
      throw err;
    }

    if (response.stop_reason === "refusal") {
      this.messages.pop();
      throw new Error("모델이 이 요청에 답하지 않았어요. 다른 말로 다시 시도해 주세요.");
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      this.messages.pop();
      throw new Error("응답이 비어 있어요. 다시 시도해 주세요.");
    }

    let data;
    try {
      data = JSON.parse(textBlock.text);
    } catch {
      this.messages.pop();
      throw new Error("응답 형식을 읽지 못했어요. 다시 시도해 주세요.");
    }

    // 응답 content를 그대로 기록에 붙인다 (기록을 수정하지 않음)
    this.messages.push({ role: "assistant", content: response.content });

    // 너무 길어지면 오래된 턴부터 한 쌍씩 버린다 (user로 시작하도록 유지)
    while (this.messages.length > MAX_HISTORY_MESSAGES) {
      this.messages.splice(0, 2);
    }

    return data;
  }
}

export function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) return "API 키가 올바르지 않아요. 설정에서 확인해 주세요.";
  if (err instanceof Anthropic.PermissionDeniedError) return "이 API 키로는 모델을 사용할 수 없어요.";
  if (err instanceof Anthropic.RateLimitError) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  if (err instanceof Anthropic.APIConnectionError) return "네트워크에 연결할 수 없어요.";
  if (err instanceof Anthropic.APIError) return `API 오류 (${err.status ?? "?"}): ${err.message}`;
  return err?.message ?? String(err);
}
