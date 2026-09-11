# 디자인과 콘텐츠 수정 경계

TAPtoTALK은 레이아웃을 다시 디자인해도 한글 규칙을 건드리지 않도록 나눕니다.

## Claude에서 주로 수정할 곳

- `index.html` — 화면의 HTML 구조와 접근성 레이블
- `src/ui/styles/tokens.css` — 색, 폰트, 간격, 그림자 등 디자인 토큰
- `src/ui/styles/*.css` — 화면별 레이아웃과 애니메이션
- `public/assets/brand/` — 로고, 시작 이미지, 완료 영상과 음원

## 디자인 작업에서 수정하지 않을 곳

- `src/core/hangul/` — 천지인 키 정의, 한글 조합, 문장 분해, 보드 생성
- `src/content/prompts.ts` — 문장 데이터와 자유 모드 설정
- `src/content/learningJourney.ts` — Alphabet/Syllable 순서, 8×8 반복 구간과 함정 비율
- `src/content/wordJourney.ts` — Word의 새 3·4·5글자 단어, 난도 전환 시점과 무작위 순서

## 교체형 미디어

### 1분 스테이지 설정

`src/content/timedStages.ts`: 제한시간 60초, 점수 카드 2초, 완성 가산 3단위, 무작위 목표 단위(Alphabet 45 / Syllable 54 / Word 60), 등급 기준을 설정한다. 고정 구간은 해당 판 크기의 전체 자소 수+문제당 완성 3단위를 목표로 사용한다. 정답 입력/목표×1000점에 고정 구간 조기 완료 시 남은 시간 비율×500점을 더하며 최대 1500점이다. 이 값은 초기 밸런스이며 실제 사용자 플레이로 조정할 수 있다.

결과 영상 배정은 `src/config/app.ts`의 `celebrations`에 모여 있다. NOT BAD는 티피, GREAT는 1번, AMAZING은 4번, UNBELIEVABLE은 태피/후피, OH MY GOD은 해피/재피를 사용한다. 이전의 모든 등급 공통 랜덤 배정과 Word 10문제 보너스는 활성 흐름에서 사용하지 않는다.

START 화면의 ㄱ·가·안녕은 `src/config/introMarks.ts`에 명조 SVG 윤곽으로 내장되어 폰트 로딩 전후 모양이 바뀌지 않는다. 원본 Noto Serif KR 700에서 다시 생성하려면 `python3 scripts/build-intro-marks.py`를 실행한다. 아이콘 위치는 `.alphabet-intro-mark`에서 조정한다.

블록 자소·기호는 사용자가 올린 `탭투톡체2.svg`에서 추출한 31개 도형을 사용한다. 원본은 보존하고 게임용 파일은 `public/assets/glyphs/talk-type/`, 연결표는 `src/config/glyphAssets.ts`에 둔다. ㅁ의 원형 함정 `○`는 사용자가 지정한 대로 `ㅇ`과 같은 파일을 공유한다. `ㅍ-stem-one`과 `ㅍ-stem-three`는 전용 함정이다.

각 SVG는 원본 획·비율을 보존하면서 도형의 bounding box 중심을 100×100 viewBox 중앙에 맞췄다. 회전은 이 중심 기준이며 CSS mask로 블록 색과 사용 후 회색을 따른다. 블록은 기기별 설치 폰트에 의존하지 않는다. 제시창의 한글은 공통으로 내장 TAP Serif KR 명조체를 사용하며, Alphabet의 모음천은 네모점으로 유지한다.

ㅣ·ㅡ·양쪽 사선은 개별 업로드 `탭투톡체3-02.svg`부터 `탭투톡체3-05.svg`까지의 긴 획으로 덮어쓴다. 추출 스크립트가 이 파일들을 우선 적용하므로 재생성해도 이전 길이로 돌아가지 않는다.

게임 실행 시 SVG를 개별 요청하지 않도록 연결표에 원본 SVG 내용을 data URL로 포함한다. 개별 파일을 수정한 경우 `python3 scripts/extract-talk-type.py --pack-only`로 파일을 덮어쓰지 않고 연결표만 재생성한다. 원본 시트를 수정했다면 아래 추출 스크립트가 함께 갱신한다. 스플래시 3초+커버 4초의 기존 연출 시간은 변경하지 않았다.

원본 시트를 다시 추출하려면 Python + fontTools로 `python3 scripts/extract-talk-type.py`를 실행한다. 이 스크립트는 현재 시트의 행·열 배치를 사용하므로 시트 배치를 바꾸면 추출 매핑도 수정해야 한다. 개별 SVG는 파일명·viewBox·중심을 유지한 채 교체할 수 있다. 예전 루트의 ㅁ/모음천 SVG는 이력용으로 보존한다.

파일명과 경로를 유지하면 코드 변경 없이 자산만 바꿀 수 있습니다.

| 용도 | 파일 |
| --- | --- |
| 제목 로고 | `TAPtoTALK-logo.svg` |
| 첫 스튜디오 심볼 | `public/assets/brand/tapeetepee-open-talk.png` |
| 시작 화면 | `public/assets/brand/splash.webp` |
| 성공 영상 | `public/assets/brand/celebration.webm` |
| 성공 음원 | `public/assets/brand/celebration.mp3` |

완료 영상은 `src/config/app.ts`의 `CELEBRATION_MOVIES`에 등록합니다.
`1`, `4`, `taepi`, `hupi`, `haepi`, `jaepi`와 별도 `tipi`를 위의 등급별로 배정합니다.
각 묶음은 일반·Android용 WebM, iPhone용 MP4, 동기화 음원 MP3로
구성합니다. 파일명에 한글을 사용하면 macOS와 Linux에서 유니코드 정규화 방식이
달라질 수 있으므로 미디어 파일명은 영문으로 유지합니다.

점수별 `compact`, `standard`, `large`, `hero` 레이아웃은
`src/ui/styles/overlay.css`에서 영상 너비와 상단·문구 간격을 따로 조절합니다.

경로 자체를 바꾸려면 `src/config/app.ts` 한 곳과, JavaScript가 실행되기 전 보이는
시작 이미지 두 군데(`index.html`)만 수정합니다.

## 의존 방향

```text
ui → content → core/hangul
       ↑
     config
```

`core/hangul`은 DOM이나 CSS를 참조하지 않습니다. 게임 규칙 테스트도 브라우저 없이 실행됩니다.

자음/모음/문장부호 타일의 색은 `talk.css`의 `.letter-tile--consonant`,
`.letter-tile--vowel`, `.letter-tile--punctuation`만 수정하면 됩니다.
