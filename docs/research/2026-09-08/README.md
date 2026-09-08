# 2026-09-08 Alphabet 장기 스테이지 전환

- 적용 커밋: `f531e49`
- 비교 커밋: `3b3f3a9`
- 재현 여부: 성공
- 비교 조건: 390×844 CSS px, 기기 배율 2, Google Chrome Headless, 각 커밋을 별도 임시 폴더에서 실행

## 문제·개선 요구

기존에는 메인 화면의 별도 `How to play`와 Alphabet 내부의 Consonants, Vowels, Syllables 코스 선택 화면을 먼저 이해해야 했다. 실제 게임도 처음부터 9×9 보드와 묶음 목표를 제시해, 처음 한글 자소를 접하는 사용자가 규칙과 글자 모양을 게임 진행 안에서 자연스럽게 익히기 어려웠다.

## 수정 내용과 이유

- 메인의 `How to play`를 제거하고 게임 이름을 Alphabet, Word, Sentence로 줄였다.
- Alphabet 선택 뒤 TAP to TEN과 같은 별도 START 화면을 추가했다. 간단한 `ㄱ` 아이콘과 보드 성장 순서만 보여 주어 설명 없이도 시작 흐름을 이해하게 했다.
- Alphabet을 51개 연속 스테이지로 재구성했다. `ㄱ`부터 `ㅎ`, `ㅣ`, `ㅡ`, `ㆍ`까지 17개 자소를 2×2, 4×4, 6×6에서 차례로 반복한다.
- 첫 2×2 보드는 정답 하나, 일반 오답 하나, 좌우·상하 반전 함정 두 개로 구성했다. 정답 모양을 비교하며 배우고, 보드가 커질수록 탐색 난도가 자연스럽게 증가한다.
- 발음 표기를 `[k] / [g]`처럼 나누지 않고 `[k/g]`처럼 하나의 괄호로 통일했다.
- Alphabet은 제한 시간 실패 방식 대신 전체 진행 시간을 누적해 긴 학습 흐름을 방해하지 않도록 했다.

## 수정 결과

사용자는 별도 설명서를 읽거나 코스를 고르지 않고 Alphabet 버튼, START 순서로 즉시 학습을 시작한다. 첫 화면에서는 큰 2×2 타일로 한 자소만 찾고, 같은 자소를 더 큰 보드에서 다시 만나므로 모양 인식과 탐색 난도가 단계적으로 이어진다. 반전 함정은 정답과 동일한 입력으로 처리되지 않으며 접근성 이름에서도 함정으로 구분된다.

## 모바일 화면

### 메인 화면

| 수정 전 — `3b3f3a9` 재현 | 수정 후 — `f531e49` 재현 |
| --- | --- |
| ![How to Play와 긴 게임명이 있던 메인](screenshots/alphabet-journey-menu-before-3b3f3a9.png) | ![세 게임명과 설정, 규칙만 남긴 메인](screenshots/alphabet-journey-menu-after-f531e49.png) |

### Alphabet 진입

화면 흐름이 바뀌었기 때문에 같은 행동인 메인 Alphabet 버튼 1회 탭 직후를 비교했다.

| 수정 전 — `3b3f3a9` 재현 | 수정 후 — `f531e49` 재현 |
| --- | --- |
| ![세 코스를 선택하던 기존 화면](screenshots/alphabet-journey-entry-before-3b3f3a9.png) | ![ㄱ 아이콘과 START가 있는 새 화면](screenshots/alphabet-journey-entry-after-f531e49.png) |

### 첫 게임판

기존 화면은 Alphabet 진입 후 Consonants START, 새 화면은 Alphabet 진입 후 START를 탭해 각 버전의 첫 게임판을 재현했다.

| 수정 전 — `3b3f3a9` 재현 | 수정 후 — `f531e49` 재현 |
| --- | --- |
| ![묶음 목표와 9×9 보드였던 첫 게임판](screenshots/alphabet-journey-board-before-3b3f3a9.png) | ![단일 목표와 큰 2×2 보드인 첫 게임판](screenshots/alphabet-journey-board-after-f531e49.png) |

모든 PNG는 780×1688px이며, 과거처럼 보이도록 현재 화면을 편집하거나 합성하지 않았다.
