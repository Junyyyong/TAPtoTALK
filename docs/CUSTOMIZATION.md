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

### 튜토리얼 / 본게임 설정

`src/content/timedStages.ts`: Alphabet/Syllable의 고정 2·4·6판은 무제한 튜토리얼, 8판과 Word는 60초 본게임이다. 크기 구간 종료마다 점수 없는 GREAT! 영상과 탭 대기를 제공한다.

`FULL_SCORE_TARGETS`는 1500점에 필요한 완성 문제 수다: Alphabet 10, Syllable 20, Word 10. 아직 실측하지 않은 초기 밸런스이며 추후 조정한다. 순수 계산은 `core/hangul/timedScore.ts`: 완성 수/목표×1500. SCORE_CAPS에서 Alphabet은 Infinity(문제당150점, 상한 없음), Syllable/Word는1500으로 지정한다. 부분 입력·오입력·별도 속도 보너스는 없다. 본게임 시작/다음 라운드에 완성 수를 초기화한다. 튜토리얼 진행은 점수에 포함하지 않는다. 기록 저장은 추후 작업이다.

Syllable 학습 순서는 `content/learningJourney.ts`의 `SYLLABLE_ROWS`에 둔다. 가~하 14개, 기본 모음 음절 10개, 나머지 모음 음절 11개로 총35개다. 본게임은 이 목록에서 무작위로 출제한다. Word는 Space 아이콘과 Delete를 제공한다. canInsertWordSpace는 완성한 음절 경계에서만 공백을 허용한다. 실제 공백은 화면에 유지하고, 단일 단어 정답 비교에서는 제외한다. 공백은 자소 입력 용량과 진행률에 포함하지 않는다.\n\nWord 입력 경계는 `core/hangul/target.ts`에서 제시어 기준으로 판별하며 UI에서 조합 규칙을 구현하지 않는다.

등급은 0 NOT BAD / 1–299 GOOD TRY / 300–599 GREAT / 600–999 AMAZING / 1000–1399 UNBELIEVABLE / 1400 이상 OH MY GOD. 영상 배정은 `config/app.ts`의 celebrations에 둔다. GOOD TRY는 GREAT와 1번 영상을 공유하고, 0점만 티피를 사용한다. 튜토리얼도 GREAT 영상을 사용한다.

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
