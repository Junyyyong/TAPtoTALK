# 2026-09-11 커버 이미지 교체

- 적용 커밋: `984c4c6`
- 요청: 제공한 taptotalk-cover-0911-01.png로 제품 커버 교체.
- 원본 PNG 그대로 복사했고 SHA-256 일치 확인. 자르기·재색상·압축 변환 없음.
- index.html과 config/app.ts를 새 파일명으로 연결. 기존 커버는 보존.
- 스튜디오 로고3초 → 커버4초 → 메인 흐름과 CSS, 게임 규칙은 유지.
- TypeScript/Vite 빌드 통과. 시작4.5초에 실제 커버 촬영.
- 단일 자산 교체 기록으로 이전 화면 재현은 별도 수행하지 않음.
- 캡처 도구에 CAPTURE_DELAY_MS 선택 설정 추가(기본8500ms 유지).

![새 커버, 390×844 CSS px, DPR2](screenshots/cover-0911.png)
