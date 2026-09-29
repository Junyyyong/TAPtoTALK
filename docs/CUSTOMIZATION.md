# 디자인과 콘텐츠 수정 경계

## 본게임 번호·최고 도달 기록·100개 어휘 (2026-09-29)

`content/stageNumber.ts`의 `mainStageNumber`는 튜토리얼이면0, 본게임이면1부터 반환한다. Alphabet 고정 연습 수와 Syllable의 **실제 저장된** 연습 목록 길이를 제외하며 Vocabulary는 첫 단어부터1이다. Alphabet 본게임 파란 배지·정답 여분 난도·세 게임 최고 도달 기록에 같은 번호를 사용한다. 60초 라운드가 바뀌어도 번호는 계속 증가한다.

`ui/stageRecords.ts`는 `taptotalk.records.v1`에 세 모드의 최고 도달 번호를 별도 저장한다. 업데이트 때 키를 바꾸지 않는다. START 직전 화면에서 예전 progress의 도달 번호를 최고기록으로 반영하되 기존 progress를 수정하거나 완료 직후 다음 문제를 미리 카운트하지 않는다. 실제 새 문제 진입 후 저장에서 번호가 증가한다. 이전 번호로 재시작해도 최고기록은 내려가지 않는다. 웹/앱 저장·백업·손상 데이터 보호는 기존 PersistentStore를 공유한다. 계정/서버/다른 기기 간 동기화는 아니다.

`.learning-intro-stats`는 TAPtoTEN `intro-stats`와 같은 설명 아래/START 위 배치, 라벨13px/700·값18px/800·가로간격20px를 쓴다. TEN의 두 번째 기록행 공간만 남겨 세로 위치를 맞춘다(추가 기록은 표시하지 않음). intro HUD56px, START260×50px로390×844에서 기록과 START 세로 좌표도 일치한다. 게임 중 HUD/블록은 바꾸지 않는다.

Syllable `SYLLABLE_MEANINGS`는 의미 있는 한 음절100개이며 본게임에서 영어 뜻을 표시한다. 기존 발음용 튜토리얼 후보/18판 구성은 바꾸지 않는다. Vocabulary `EXTRA_WORDS`는3/4/5글자23/21/56개, 합100개로 고정32개와 겹치지 않는다. 기존 ID가 유지되도록 각 길이 목록 뒤에만 추가한다. 새14개는 받침의 마지막 기본 자음과 다음 초성이 동일한 경우도 제외했다. **전체132개**의 실제 `composeTokens(requiredBoardSymbols(word))` 결과가 목표와 일치해야 한다(수족관→수조꽌 같은 후보는 제외).

단어 추가 시 한 음절은 독립적인 뜻이 있어야 하며 발음 연습만 가능한 워/외/웨/까 등을 본게임에 넣지 않는다. 최근10개 반복 회피·최근3개 복합어 부분중복 회피·3/4/5글자1/2/4 가중치는 유지한다. 진행 중인 저장된 셔플 목록을 초기화하지 않으므로 새로운100개 풀은 기존 묶음을 소진한 다음 적용된다. `syllableJourney.test.ts`, `wordJourney.test.ts`는100개 한 묶음 중복 없음/옛 작은 묶음 복원을 검증하고 `answerCopies.test.ts`는모든 정답의 필수 블록 수를 각 난도에서 확인한다.

## 정답 블록 여분·오답 화면 효과 (2026-09-28)

`content/boardDifficulty.ts`의 `ANSWER_COPY_TIERS`가 본게임 문제별 여분을 관리한다.1~10: 각 정답 자소의 필요 횟수+2,11~20:+1,21이후:+0. Alphabet/Syllable은 튜토리얼 개수를 제외한 문제 번호, Vocabulary는 표시 STAGE 번호를 사용한다.60초 라운드 번호나 이번에 맞힌 개수로 계산하지 않는다. 이어하기/재접속/라운드 종료 후에도 저장된 단계에 맞는 난도가 유지된다.

`core/hangul/answerCopies.ts`는 중복 자소까지 필요한 입력 순서 전체를 먼저 예약한 뒤 자소별 여분을 더한다. 판 공간이 부족하면 여분만 줄인다. 기본 자음 반복으로 쓰는 쌍자음/겹받침/복모음의 필수 블록은 줄이지 않는다. 새 본게임에서는 일반 채움 풀에서 목표 자소를 제외하여 임의의 추가 정답이 끼어들지 못하게 한다. 부족한 자리는 다른 자소나 시각적으로 구별되는 함정으로 채운다. 기존 함정 모양 충돌 방지, Syllable20%/30%, Vocabulary5개 모음 모양 함정은 유지한다.

`createMixedLearningBoard`와 `createWordBoard`의 마지막 선택 인수는 `extraAnswerCopies`다. undefined는 기존 튜토리얼/레거시 생성 방식,0/1/2는 정확한 여분 개수를 적용한다. 활성 Word 생성 경로는 `TalkApp.makeWordBoard`를 공통 사용하며 각 새 문제/다음 라운드/복원 때 같은 규칙으로 만든다. 최소 단계에서도 `강`은 ㄱ·ㅣ·ㆍ·ㅇ 각각1개지만 `꾀`의 ㄱ은2개, `사랑`의 ㅣ와ㆍ도 각각2개다.

`ui/timePenalty.ts`에서 기존−1 숫자와 새 화면 효과 수명을 관리한다. `.talk-screen::after`는8% 붉은색/280ms, `.letter-board`는좌우2px/240ms. pointer-events:none으로 탭을 가로막지 않으며 반복 입력에도 화면 효과는700ms에 한 번만 시작한다(−1초 및 숫자 표시는 매번). 메뉴·Pause·결과·새 라운드에서 즉시 정리한다. reduced-motion에서는 게임판/오답 타일 흔들림을 끄고 옅은 색 표시만 사용한다. 무제한 튜토리얼의 오답은−1초와 전체 화면 효과를 실행하지 않는다.

## 진행 저장 (2026-09-28)

`talkStorage.ts`는 설정과 모드별 `taptotalk.progress.v1.alphabet|syllable|word` 키를 관리한다. 이 키는 릴리스마다 변경하지 않는다. 형식 변경은 기존 데이터를 읽는 마이그레이션을 먼저 추가한다. `persistentStore.ts`는 웹 localStorage/앱 Preferences를 구분하고 이전 값의 `.backup`을 유지한다. 네이티브 키가 없을 때만 같은 앱 WebView의 옛 localStorage를 이관하며 원본도 보존한다. 네이티브 데이터가 생긴 뒤에는 그것을 우선하며 비동기 쓰기는 직렬화한다. 모든 키를 검증한 후 게임을 생성한다. 손상/호환 불가/읽기 실패는 복구용 백업을 시도하고 불가하면 Retry 화면을 띄워 새 게임의 덮어쓰기를 막는다. 쓰기 실패는 메모리 대기열을 유지하고 재시도 알림을 표시한다.

`TalkApp`은 START에서 하던 문제를 새 입력·새 블록·0점·새60초로 시작한다(튜토리얼은 시간 제한 없음). `restartCheckpoint`는 완료 전환 대기/결과 중 종료된 정답은 한 번만 건너뛰고 라운드/해금 난도를 반영한다. 단순 일시정지의 Resume은 현재 입력·남은 시간을 유지한다. 이미 추첨한 튜토리얼 목록·현재 제시어·Word/Syllable 남은 셔플 목록·최근 기록을 보존한다. 예전18/30판 학습 목록도 계속 읽으며 옛 블록 ID/부분 입력은 재사용하지 않는다. 클릭·삭제·문제 변경·메뉴 복귀·pagehide/visibilitychange·활성 게임1초 주기에 저장하고 메뉴/intro는 덮어쓰지 않는다. 강제 종료 직전 아직 저장되지 않은 변경은 유실될 수 있다. core에는 저장소 의존성이 없다.

웹 배포 자체는 같은 origin의 저장을 초기화하지 않는다. 도메인/브라우저가 다르면 별도 저장이고, 방문 데이터/앱 삭제 및 기기 변경은 복구 보장 대상이 아니다. 웹 Safari의 저장을 네이티브 앱이 자동으로 가져오는 구조도 아니다. 서버 동기화·계정은 아직 없으며 최고 도달 스테이지는2026-09-29부터 로컬에 저장한다. Android는 `@capacitor/preferences`를 `cap sync android`로 연결했다. 앱 업데이트 시 같은 appId/서명 유지, 삭제 후 재설치 금지. 나중에 iOS 프로젝트를 만들면 Preferences의 UserDefaults용 `PrivacyInfo.xcprivacy`(`NSPrivacyAccessedAPICategoryUserDefaults`, `CA92.1`)도 추가해야 한다. 실제 앱 업데이트 보존 검증은 같은 서명의 구버전→신버전 설치로 별도 확인한다.

## 오답 시간 차감 (2026-09-28)

`timedStages.ts`의 `MISTAKE_PENALTY_MS=1000`. 시간제 세 게임의 새로운 오답/함정 탭에만 적용한다. Vocabulary는 현재 목표의 기본 자음/천지인 입력열과 비교하며 이전 오류를 고치지 않고 추가한 탭도 오답이다. Delete는 무료. 정답·비활성·사용한 블록·전환·일시정지·결과 중 입력, 시간 없는 튜토리얼은 제외한다. `timePenalty.ts`의 화면 효과는 TAPtoTEN과 동일한 빨간−1/12px/500ms/4px 상승이며 연속 오답은 표시 시간을 다시 시작한다. 차감으로0초가 되면 기존 결과 처리를 즉시 실행한다. 완성 수×점수 공식과 등급은 바뀌지 않았다.

최신 Syllable 연습(2026-09-20): `learningJourney.ts`의 SYLLABLE_ROWS 각 count가5/3/3/2/3/2, 총18판. 2×2 5판·4×4 13판. category는 한글 / 영어이며 본게임 STAGE 표시는 유지. 전체59개 후보는 보존하고 유형별 표본만 줄였다. 이전의 매 유형5개/30판/영어만 표시 설명을 대체한다.

최신 점수 조정(2026-09-20): POINTS_PER_TARGET는187.5/187.5/250이다. Alphabet/Syllable8개, Vocabulary6개에서 정확히1500점. 전체 합산 후 소수점 버림, 점수 상한 없음. 아래150/150/225 값은 이전 버전이다. 등급·영상 기준1500점은 유지.

## 최신 점수·튜토리얼 영상 (2026-09-20)

아래 과거 점수 설명을 대체한다. `timedStages.ts`의 `POINTS_PER_TARGET`는 Alphabet150/Syllable150/Word225. `timedScore(completed, pointsPerTarget)`는 완성 정수 개수×점수, 상한 없음. OH MY GOD1500점, UNBELIEVABLE1000~1499, 나머지 경계 유지. `app.ts` 영상 기준도 동일. `tutorialReward(side)`는2/4/6/8판 완료에 GREAT/AMAZING/UNBELIEVABLE/OH MY GOD를 매핑하며 현재 연습은Alphabet6판·Syllable4판까지다. 연습 영상에는 점수창 없음. Syllable 함정30% 해금은1500점. 시간60초·결과창2초·탭 진행 유지.

## 개별 순경음미음 교체 (2026-09-20)

ㅱ은 `assets/glyph-sources/labial-mieum.svg`의 사용자 원본 두 경로를 사용한다. `extract-talk-type.py`가 시트보다 이 파일을 우선해 넓은 페이지 여백을 제외하고 100×100 viewBox 중앙에 배치한다. 획·비율·원본 좌표 크기는 유지한다. 재생성해도 옛 시트의 ㅱ으로 돌아가지 않는다. 결과는 `public/assets/glyphs/talk-type/u3171.svg`와 `src/config/glyphAssets.ts`에 반영한다.

## 최신 영상 연결 (2026-09-17)

아래 과거 매핑보다 이 항목이 우선한다. `src/config/app.ts`: NOT BAD는 `0917-movie/notbad`, AMAZING은 `0917-movie/amazing`(원본 GREAT), UNBELIEVABLE은 `0917-movie/unbelievable`(원본 Amazing), OH MY GOD은 `0917-movie/ohmygod`으로 MP4/WebM/MP3를 함께 연결한다. GOOD TRY는 `movie/GOOD TRY`, GREAT와 튜토리얼은 `movie/tipi` 유지. 과거 원본 영상은 삭제하지 않았고 미사용 CELEBRATION_MOVIES 연결 상수만 제거했다. 신규 파일명은 소문자·공백 없음으로 통일했다.

## 학습 제시창 (2026-09-16)

세 모드의 제시어는 `.talk-screen .target-text` 공통 크기44px(좁은 화면에서만 뷰포트 기준36~44px)를 사용한다. 자소 개수로 폰트 크기를 바꾸지 않는다. Alphabet 자소 폭1em/간격0, 화살표14px로 다섯 자소도 들어가게 한다. 입력 순서 안내는18px 고딕/650으로 유지한다.

Vocabulary 입력 안내는 `activeTargetSyllable`(core/hangul/target.ts)이 연속 정답 입력 수에 해당하는 현재 음절 하나만 반환한다. 전체 단어·뜻은 남기며 제시어 색도 동일한 원시 입력 기준으로 맞춘다. 오류 시 진행하지 않고 Delete 시 이전 음절로 돌아간다. 마지막 음절 완료 시 마지막 안내 전체를 완료색으로 표시한다. 조합 엔진·정답 판정·점수는 바꾸지 않는다.

Vocabulary 하단은 Delete 단일 버튼이다. Space 버튼과 UI 입력 경로는 제거했다. 과거 공백 확정/삭제의 core 함수는 호환 테스트용으로 보존한다. 현재132개 단어는 모두 공백 없이 조합 가능하다.

Syllable 파란 박스는 튜토리얼에서 `AlphabetStage.category`를 표시한다. 학습 범주는 영어로 Letter Combinations / Basic Vowels / Compound Vowels / Double Consonants / Final Consonants / Double Finals. 타이머가 시작되는 본게임은 STAGE 1부터 음절마다 증가하며 튜토리얼 판수는 제외한다. 1분 라운드 변경 시 번호는 유지한다. HUD PRACTICE/시계는 그대로다. 입력 안내 아래아는 .25em 정사각형, 블록 아래아는1.1배, 기존 하트·별·쉼표는1.1→1.21배로 조정했다.

Syllable의 별도 작성 칸은 숨기고 제시어 아래 자소 순서로 진행을 확인한다. Vocabulary는 작성 칸을 유지하며 `STAGE ${wordTargetIndex + 1}`로 단어 진행 번호를 표시한다. 보드 크기와 1분 라운드 번호는 이 표시에 포함하지 않는다.

`learningLabels.ts`에 Alphabet 분류·한글 자모 이름·읽기 노출 정책을 둔다.2/4판에서만 읽기를 표시하고6/8판에서는 숨긴다. HUD의 PRACTICE/시계는 유지한다. `syllableNotes.ts`의 요청된 가~하·쌍자음 표기는 사용자 지정 영문 읽기 안내로 표준 IPA가 아니다. 기존 단어 뜻과 지정하지 않은 모음 안내는 유지한다. `prompts.ts` 천지인 읽기는 `[ah]`, `[eu]`, `[i]`다.

`.alphabet-target-jamo.is-current`와 `.syllable-taps .is-current`는 배경·밑줄 없이 빨간 글자로 현재 위치를 나타내고 완료는 파랑이다. `.tap-arrow`는 자소 사이 화살표다. Syllable·Vocabulary는 `renderTapSequence`를 공유하며 Vocabulary는 실제 입력의 연속 정답 구간까지만 진행한다. `.syllable-tap.is-cheonjiin::before`는 .25em 정사각형으로 폰트의 ■ 글리프를 대체한다.

## 2026-09-16 최신 출제·숙련 설정

아래 과거 설명보다 이 설정이 우선한다. `wordJourney.ts` 추가86개(21/17/48), 고정32개. 3글자10판·4글자10판 뒤 전체 추가 풀을 중복 없이 소진한다. 긴 단어가 과반이며 셔플 순서 가중치1/2/4, `recentTargets.ts` 최근10개 제외와 최근3개 두 글자 공통부분 회피를 담당한다. 새 단어는 글자 수·뜻·중복·`composeTokens(requiredBoardSymbols(word)) === word`를 검사한다.

`timedStages.ts` Syllable 만점 목표16, OMG는15개부터. `nextSyllableDifficulty`가 일반→함정30%까지만 올린다. 그 이후에도30%를 유지하며 창문·자리 교환 기능은 제거했다. UI 세션 상태이며 저장하지 않는다.

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

### 어휘 풀 구분 (2026-09-14 업데이트)

최신 본게임 목록은 **50개**다(아래26개 설명에서 확장). `createSyllableGameJourney`가 세션별 셔플 목록을 보유한다. 같은 stage index 재진입은 같은 단어를 반환해 시간 종료 후에도 미완성 문제를 유지한다. 새 START에서만 생성하고 라운드·영상·일시정지에는 재생성하지 않는다. 50개 소진 후 재섞기 때 직전 단어와 첫 단어가 같으면 교환한다.

아래 기존 설명의 ‘본게임 전체59개’는 더 이상 사용하지 않는다. `SYLLABLE_STAGES` 59개는 튜토리얼 후보 전용이며, 본게임은 `learningJourney.ts`의 `SYLLABLE_GAME_TARGETS`(26개)를 사용한다. 이 목록은 `syllableNotes.ts`의 `SYLLABLE_MEANINGS` 키에서 생성하므로 영어 뜻 없는 항목이 본게임에 섞이지 않는다. 발음 연습은 기존 SOUNDS와 대괄호 표기를 유지한다. 뜻 매핑을 추가하면 본게임 후보도 추가되므로 반드시 한 음절의 실제 어휘인지 확인한다.

Word의 고정 단계 수는33개 그대로다. 마지막 복모음 묶음은 개·게·샤워·의자·왜·웨이터·귀·외국으로 교체했다. 음절을 영어의 유사 발음 단어와 등치하지 않고 실제 한국어 단어의 뜻을 사용한다.

Syllable 제시어 아래 안내는 `src/content/syllableNotes.ts`에서 관리한다. 기본음절·모음·쌍자음은 단독 발음의 IPA 기반 간략 표기, 받침 명사는 짧은 영어 뜻을 사용한다. 세션과 무작위 본게임 모두 같은 매핑을 쓴다. `.syllable-target-note`는 16px 고딕이며 기존 제시창 높이와 52px 한글 글자 크기는 유지한다.

### 튜토리얼 / 본게임 설정

`src/content/timedStages.ts`: Alphabet은 고정2·4·6판, Syllable은 고정2·4판이 무제한 튜토리얼이다. Syllable의 첫 본게임 라운드는6판, 두 번째부터8판이다. Alphabet 본게임과 Word는8판이다. 본게임은 모두60초이며 learningStageAt과 stageSection에 같은 roundNumber를 전달한다. 크기 구간 종료마다 점수 없는 GREAT! 영상과 탭 대기를 제공한다.

`FULL_SCORE_TARGETS`는 배율 적용 전 기준값이다: Alphabet 10, Syllable 16, Word 10. `SCORE_MULTIPLIER=1.5`로 기존 약1000점을 약1500점으로 조정했다. 순수 계산은 `core/hangul/timedScore.ts`: floor(완성 수/기준값×1500×배율). SCORE_CAPS에서 Alphabet은 Infinity(문제당225점, 상한 없음), Syllable/Word는1500으로 지정한다. Syllable은10개1406점·11개1500점, Word는7개1500점이다. 부분 입력·오입력·별도 속도 보너스는 없다. 본게임 시작/다음 라운드에 완성 수를 초기화한다. 튜토리얼 진행은 점수에 포함하지 않는다. 기록 저장은 추후 작업이다.

Syllable 학습 순서는 `content/learningJourney.ts`의 `SYLLABLE_ROWS`에 둔다. 전체 후보는 기본음절14·기본모음10·복모음11·쌍자음5·기본받침 명사14·겹받침 명사5개, 총59개다. createSyllablePractice가 START마다 유형별5개를 뽑아 총30개를 만들며 SYLLABLE_PRACTICE_PER_TYPE에서 표본 수를 조절한다. UI는 이 세션 목록을 learningStageAt/stageSection에 함께 전달해5판·30판에서 튜토리얼 구간을 끝낸다. 2판5개,4판25개이며 본게임 풀은 전체59개를 유지한다. 모든 문제는 한 음절이며 반복 자소도 개별 블록으로 배치한다. 본게임은 이 목록에서 무작위로 출제한다. Word는 Space 아이콘과 Delete를 제공한다. Space는 제시어와 관계없이 현재 입력을 확정한다. Delete가 공백을 지우면 COMMIT_BOUNDARY를 남겨 후속 입력이 앞 음절과 합쳐지지 않게 한다. compose.ts의 deleteLastInput과 composeTokens에서 처리한다. 보이는 내부 공백은 정답 판정에 반영한다. target.ts의 composeTargetInput은 호환 함수일 뿐 제시어 자동 보정을 하지 않는다. UI에서 조합 규칙을 구현하지 않는다. 쌍자음 까·따·빠·싸·짜는 튜토리얼마다 각각 한 번만 출제한다. 받침은 산·강·물·불·눈·손·발·집·밥·옷·달·별·입·몸, 겹받침은 닭·흙·값·삶·몫으로 한정한다.

등급은 0 NOT BAD / 1–299 GOOD TRY / 300–599 GREAT / 600–999 AMAZING / 1000–1399 UNBELIEVABLE / 1400 이상 OH MY GOD. 영상 배정은 `config/app.ts`의 celebrations에 둔다. NOT BAD→notbad, GOOD TRY→GOOD TRY, GREAT→tipi, AMAZING→AMAZING, UNBELIEVABLE→taepi, OH MY GOD→OH MY GOD로 연결한다. 튜토리얼 GREAT도 기존 티피다. iPhone MP4·일반 WebM·MP3를 한 묶음으로 교체하고, 영상 추가 시 등급의 clips 배열을 늘린다. 점수별 문구와 레이아웃은 유지한다. 업로드 원본의 대소문자와 공백을 경로에서 그대로 유지해야 한다.

START 화면의 ㄱ·가·안녕은 `src/config/introMarks.ts`에 명조 SVG 윤곽으로 내장되어 폰트 로딩 전후 모양이 바뀌지 않는다. 원본 Noto Serif KR 700에서 다시 생성하려면 `python3 scripts/build-intro-marks.py`를 실행한다. 아이콘 위치는 `.alphabet-intro-mark`에서 조정한다.

블록 자소·기호는 사용자가 올린 `탭투톡체2.svg`에서 추출한 31개 도형을 사용한다. 원본은 보존하고 게임용 파일은 `public/assets/glyphs/talk-type/`, 연결표는 `src/config/glyphAssets.ts`에 둔다. ㅁ의 원형 함정 `○`는 사용자가 지정한 대로 `ㅇ`과 같은 파일을 공유한다. `ㅍ-stem-one`과 `ㅍ-stem-three`는 전용 함정이다.

각 SVG는 원본 획·비율을 보존하면서 도형의 bounding box 중심을 100×100 viewBox 중앙에 맞췄다. 회전은 이 중심 기준이며 CSS mask로 블록 색과 사용 후 회색을 따른다. 블록은 기기별 설치 폰트에 의존하지 않는다. 제시창의 한글은 공통으로 내장 TAP Serif KR 명조체를 사용하며, Alphabet의 모음천은 네모점으로 유지한다.

ㅣ·ㅡ·양쪽 사선은 개별 업로드 `탭투톡체3-02.svg`부터 `탭투톡체3-05.svg`까지의 긴 획으로 덮어쓴다. 추출 스크립트가 이 파일들을 우선 적용하므로 재생성해도 이전 길이로 돌아가지 않는다.

게임 실행 시 SVG를 개별 요청하지 않도록 연결표에 원본 SVG 내용을 data URL로 포함한다. 개별 파일을 수정한 경우 `python3 scripts/extract-talk-type.py --pack-only`로 파일을 덮어쓰지 않고 연결표만 재생성한다. 원본 시트를 수정했다면 아래 추출 스크립트가 함께 갱신한다. 스플래시 3초+커버 4초의 기존 연출 시간은 변경하지 않았다.

원본 시트를 다시 추출하려면 Python + fontTools로 `python3 scripts/extract-talk-type.py`를 실행한다. 이 스크립트는 현재 시트의 행·열 배치를 사용하므로 시트 배치를 바꾸면 추출 매핑도 수정해야 한다. 개별 SVG는 파일명·viewBox·중심을 유지한 채 교체할 수 있다. 예전 루트의 ㅁ/모음천 SVG는 이력용으로 보존한다.

파일명과 경로를 유지하면 코드 변경 없이 자산만 바꿀 수 있습니다.

| 용도 | 파일 |
| --- | --- |
| 제목 로고 | `public/assets/brand/taptotalk-logo-0911.png` |
| 첫 스튜디오 심볼 | `public/assets/brand/tapeetepee-open-talk.png` |
| 시작 화면 | `public/assets/brand/taptotalk-cover-0911-v2.png` |
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

## 배경음악

결과 영상 소리는 `clipSound.ts`의 별도 Web Audio 단발 재생으로 MP3를 캐시·디코딩한다. 사용자 탭에서 context를 활성화하고 영상이 실제 시작되면 현재 재생 위치에 맞춰 음원을 시작한다. 실패하면 기존 HTML audio를 시도하며 이것도 차단되면 Tap for sound를 표시한다. Sound OFF는 유지한다. 영상 종료·나가기·Sound OFF에 즉시 정지하며 늦은 비동기 로딩은 세대 번호로 취소한다. 실제 기기의 무음/볼륨·브라우저 정책은 앱이 강제 해제하지 않는다.

- 경로: `src/config/app.ts`의 `music.menu`, `music.game`.
- 대기곡: `public/assets/audio/talk-lobby.mp3` — 승인 시안 08, 128 BPM, 30초.
- 게임곡: `public/assets/audio/talk-game-acoustic-142.mp3` — 승인 시안16, 실제 녹음 악기 샘플로 구성한 피아노·마림바·실로폰·타악기, 142 BPM, 약40.56초. 이전 합성 게임곡은 연결 해제했다.
- 현재 게임곡 제작: `docs/music-demos/2026-09-20/make-acoustic.mjs 142`. CC0 VCSL 샘플 출처는 같은 폴더 `sources-142.json`. 시안16 MP3를 재인코딩 없이 사용한다.
- 합성 원본은 `docs/music-demos/2026-09-14/make-lobby-v5.mjs`, `make-game-v9.mjs`. `--loop` 옵션은 페이드 대신 잔향을 시작에 연결한 정수 마디 WAV를 생성한다. 시안 원본은 변경하지 않는다.
- 메인/설정은 대기곡, 게임 START 안내/플레이는 게임곡. 일시정지·결과/보너스 영상·백그라운드에서는 BGM을 멈춘다.
- `src/ui/sceneMusic.ts`가 곡 중복을 방지하며 `backgroundMusic.ts`가 디코딩·루프·자동재생·화면 숨김을 담당한다. 기본 게인은 0.28이다.
- 설정의 Music은 배경음악, Sound는 기존 효과음/영상 소리로 독립적이다. 자동재생이 차단되면 첫 탭/키 입력 후 재생한다.

## 의존 방향

```text
ui → content → core/hangul
       ↑
     config
```

`core/hangul`은 DOM이나 CSS를 참조하지 않습니다. 게임 규칙 테스트도 브라우저 없이 실행됩니다.

자음/모음/문장부호 타일의 색은 `talk.css`의 `.letter-tile--consonant`,
`.letter-tile--vowel`, `.letter-tile--punctuation`만 수정하면 됩니다.
