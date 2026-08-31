# TAP to TALK

천지인 방식의 자모 타일로 한글 문장을 만드는 9×9 모바일 낱말 게임입니다.
TAP to TEN의 화면 감각과 웹/Android 빌드 기반만 복사했으며, 원본 저장소에는 push할 수 없도록 설정했습니다.

## 현재 프로토타입

- 문장 따라쓰기: 목표 문장에 필요한 자모를 보장한 81타일
- 자유 쓰기: 60초 동안 가중 랜덤 자모 사용
- 초성 19종 + 천지인 `ㅣ`, `ㆍ`, `ㅡ` = 22종
- 삭제, 띄어쓰기, `. , ! ?`는 하단 고정
- 입력 토큰 단위 되돌리기

## 개발

```bash
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

## 자주 수정할 곳

| 작업 | 위치 |
| --- | --- |
| 문장과 모드 설정 | `src/content/prompts.ts` |
| 천지인/한글 규칙 | `src/core/hangul/` |
| 화면 동작 | `src/ui/talkApp.ts` |
| 레이아웃 | `index.html`, `src/ui/styles/talk.css` |
| 색·폰트·공통 질감 | `src/ui/styles/tokens.css` |
| 로고·스플래시·영상 | `public/assets/brand/` |

Claude로 디자인을 수정할 때는 [`docs/CUSTOMIZATION.md`](docs/CUSTOMIZATION.md)를 먼저 참고하세요.

## Git 원격

- `origin`: `Junyyyong/TAPtoTALK` — 이 프로젝트의 fetch/push 원격
- `source`: `Junyyyong/TENtoTAP` — 원본 참조용 fetch 원격, push는 `DISABLED`

