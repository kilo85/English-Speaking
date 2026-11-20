// 체험 모드: API 키 없이 화면 흐름을 확인하기 위한 가짜 대화 상대.
// 미리 준비한 질문을 레벨에 맞춰 돌려주고, 사용자 레벨은 간단한 규칙으로 추정한다.

const SCRIPTS = {
  easy: [
    ["Hi! Do you like coffee or tea?", "안녕! 커피 좋아해, 차 좋아해?"],
    ["Nice! Is it sunny today?", "좋네! 오늘 날씨 맑아?"],
    ["Do you like music?", "음악 좋아해?"],
    ["Do you have a pet?", "반려동물 있어?"],
    ["What is your favorite food?", "제일 좋아하는 음식이 뭐야?"],
    ["Do you work or study?", "일해, 아니면 공부해?"],
  ],
  mid: [
    ["Hi there! How was your day so far?", "안녕! 오늘 하루 지금까지 어땠어?"],
    ["That's nice. What did you do last weekend?", "좋네. 지난 주말엔 뭐 했어?"],
    ["Sounds fun! What kind of movies do you like?", "재밌었겠다! 어떤 영화 좋아해?"],
    ["Where would you like to travel next, and why?", "다음엔 어디로 여행 가고 싶어? 이유는?"],
    ["What do you usually do to relax after work?", "일 끝나고 보통 뭐 하면서 쉬어?"],
    ["What's something you've wanted to learn lately?", "요즘 배워보고 싶은 게 있어?"],
  ],
  hard: [
    ["Hey! What's been keeping you busy these days?", "안녕! 요즘 뭐 하느라 바빠?"],
    ["Interesting. How do you think that's shaped the way you see things?", "흥미롭네. 그게 네가 세상을 보는 방식에 어떤 영향을 준 것 같아?"],
    ["If you could change one thing about your daily routine, what would it be?", "하루 일과에서 하나만 바꿀 수 있다면 뭘 바꿀래?"],
    ["Do you think technology brings people closer together or pushes them apart?", "기술이 사람들을 더 가깝게 만든다고 생각해, 아니면 멀어지게 한다고 생각해?"],
    ["What's a piece of advice that really stuck with you over the years?", "오랫동안 마음에 남은 조언이 있어?"],
    ["How would your friends describe you in three words?", "친구들은 너를 세 단어로 어떻게 표현할까?"],
  ],
};

const CONNECTORS = /\b(because|although|though|while|which|that|when|if|so|but|since|whereas|however|actually)\b/gi;

// 발화 하나를 1~10으로 대충 평가한다
export function estimateLevel(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length === 0) return 1;
  const hasKorean = /[가-힣]/.test(text);
  const avgLen = words.reduce((a, w) => a + w.length, 0) / words.length;
  const unique = new Set(words).size;
  const connectors = (text.match(CONNECTORS) ?? []).length;

  let score = 1;
  score += Math.min(words.length / 4, 4); // 길이: 최대 +4
  score += Math.max(0, Math.min((avgLen - 3.5) * 1.5, 2)); // 단어 길이: 최대 +2
  score += Math.min(connectors, 2); // 접속사·관계사: 최대 +2
  score += unique / words.length > 0.8 && words.length >= 6 ? 1 : 0; // 다양성
  if (hasKorean) score -= 2;
  return Math.max(1, Math.min(10, Math.round(score)));
}

export class DemoClient {
  constructor() {
    this.turns = 0;
  }

  reset() {
    this.turns = 0;
  }

  async turn(text, level) {
    await new Promise((r) => setTimeout(r, 600)); // 생각하는 척
    const band = level <= 3 ? "easy" : level <= 6 ? "mid" : "hard";
    const list = SCRIPTS[band];
    const [en, ko] = list[this.turns % list.length];
    this.turns += 1;
    return {
      reply_en: en,
      reply_ko: ko,
      user_ko: text == null ? "" : "(체험 모드에서는 내 말 번역이 나오지 않아요)",
      user_level: text == null ? level : estimateLevel(text),
    };
  }
}
