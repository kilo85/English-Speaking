# Speak: 영어 회화 연습 앱

AI와 음성으로 영어 대화를 하는 웹앱입니다. 내 말하기 수준에 맞춰 AI의 난이도가 대화 중에 자동으로 바뀌고, 오른쪽 ▲/▼ 버튼으로 직접 조정할 수도 있습니다.

iPhone Safari에서 열고 **홈 화면에 추가**하면 앱처럼 쓸 수 있습니다.

## 기능

- **마이크 버튼**: 한 번 누르면 듣기 시작, 다시 누르면 전송
- **실시간 자막**: 위는 AI, 아래는 나. 영문 아래에 국문 번역
- **국문 가리기**: 기본은 Lv.5부터 흐리게 가림, 탭하면 보임 (설정에서 변경)
- **다시 듣기**: AI 문장을 탭하면 다시 듣기, 길게 누르면 느리게 듣기
- **수준 자동 보정**: 최근 3턴의 평가 평균으로 기준 레벨의 ±1 안에서 조정
- **수동 조정**: ▲ 어렵게 / ▼ 쉽게. 누른 뒤 2턴 동안은 자동 보정을 멈춤

## iPhone에서 실행하기

### 1. GitHub Pages 켜기 (처음 한 번)

1. 이 저장소의 **Settings → Pages**로 이동
2. **Source**: `Deploy from a branch`
3. **Branch**: 앱 코드가 있는 브랜치, 폴더는 `/docs` 선택 후 Save
4. 1~2분 뒤 `https://<GitHub 아이디>.github.io/English-Speaking/` 주소가 생깁니다

### 2. iPhone에서 열기

1. **Safari**로 위 주소 열기
2. 공유 버튼 → **홈 화면에 추가**
3. 처음 실행하면 설정 창이 뜹니다. **Anthropic API 키**를 입력하고 저장
   - 키는 [console.anthropic.com](https://console.anthropic.com)에서 발급
   - 키는 이 iPhone 안에만 저장되고 Anthropic API로만 전송됩니다
4. 마이크 권한, 음성 인식 권한을 허용

음성 인식이 안 되면 설정 앱에서 확인해 주세요.

- 설정 → Safari → 마이크: 허용
- 설정 → 개인정보 보호 및 보안 → 음성 인식: Safari 허용
- 설정 → 일반 → 키보드 → 받아쓰기 활성화: 켬

## 구조

```
public/          정적 파일 (HTML, CSS, 아이콘, manifest)
src/main.js      화면과 대화 흐름
src/claude.js    Claude API 호출 (응답 + 번역 + 레벨 평가를 JSON으로 한 번에)
src/level.js     수준 보정 로직
src/speech.js    음성 인식(STT)과 음성 합성(TTS), Safari Web Speech API
docs/            빌드 결과 (GitHub Pages가 여기서 서비스)
```

## 개발

```bash
npm install
npm run build   # src + public → docs
npm run serve   # http://localhost:8080 에서 확인
```

코드를 바꾼 뒤에는 `npm run build`를 실행하고 `docs/`도 같이 커밋해야 Pages에 반영됩니다.

## 참고

- 모델: `claude-opus-5-5` (`src/claude.js`의 `MODEL`)
- 대화 한 턴마다 API를 한 번 호출하며, 사용량만큼 API 요금이 나갑니다
- 음성 인식/합성은 iPhone에 내장된 기능을 써서 추가 비용이 없습니다
