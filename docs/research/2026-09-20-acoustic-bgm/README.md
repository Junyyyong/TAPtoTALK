# 2026-09-20 게임 BGM 교체

- 비교 커밋: `dbb52d5`.
- 적용 커밋: 이 문서와 함께 커밋된 `Replace game BGM with approved acoustic percussion track`.

## 요구·수정

기존 합성 게임 음악 대신 승인된 16번 피아노·마림바·실로폰·타악기 시안(142 BPM)을 적용한다. 승인 MP3를 그대로 `public/assets/audio/talk-game-acoustic-142.mp3`에 복사하고 `config/app.ts`의 game 경로만 교체한다. 새 파일명으로 이전 파일 캐시와 구분한다.

## 결과·검증

대기곡, 효과음, 영상 소리, 볼륨, 루프, 일시정지/배경 전환 정책은 유지한다. 기존 게임곡 파일은 이력용으로 남지만 활성 설정에서 사용하지 않는다. 승인본과 배포 파일의 바이트 일치를 확인하고 전체 테스트와 프로덕션 빌드로 검증한다.

샘플 출처·재생성은 `docs/music-demos/2026-09-20/README.md`와 `sources-142.json` 참고(CC0 VCSL).

## 전후 자료

화면 및 미디어 재생 흐름 변경이 없는 음원 교체이므로 전후 스크린샷은 생략한다. 화면을 임의 생성하지 않았다. 이전 음원은 비교 커밋의 `public/assets/audio/talk-game.mp3`, 이후 음원은 `public/assets/audio/talk-game-acoustic-142.mp3`로 비교할 수 있다. 실제 기기 청취 검증은 별도 필요하다.
