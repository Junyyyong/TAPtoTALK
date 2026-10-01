# 2026-10-01 승인된 화면 수정·Android 1.0.2 AAB

## 변경 제목

- 승인 범위: 현재 화면의 Git commit/push, 새 AAB, 출시명·출시노트. Google Play 업로드/출시는 실행하지 않는다.
- 앱 소스 커밋: `fed5879ef38d6754d397e02a4825a82f98bd797a` (`fed5879`). 커밋 확정 후 런타임 소스 변경 없이 재빌드했다. 후속 커밋은 출시 문서·검사기 보완이다.
- Git 비교: `43a49ce4a39a701e09985aefe17961489b21a4c5`와 각 시점의 소스 overlay. 과거 화면은 별도 임시 폴더에서 실행한 재현이다. 순수43a49ce/설치 AAB 화면과 중간 후보를 혼동하지 않는다.
- AAB 비교: 기존1.0.1/versionCode3/iconfix. 이전 출시 파일·업로드키를 덮어쓰지 않았다.

### 문제·개선 요구

승인된 흰색·회색 기본 UI, 기존 강조색·블록 효과, 박스 없는 최고기록/타이머를 Android 업데이트에도 포함해야 했다. 화면 확대 설정 변경에도 전체 비율과 터치 위치를 유지해야 했다. 화면 확인 전 보류했던 AAB/push가 이번 후속 요청으로 승인됐다.

### 수정 내용과 이유

- 화면·안전영역·Android390×844 전체 프레임·아이콘 수정과 전후 연구자료를 커밋했다. 게임 규칙·콘텐츠·저장 형식/키·이미지/음악 원본은 변경하지 않았다.
- 코드3보다 높은 **1.0.2/versionCode4**를 기존 앱ID/업로드 인증서로 서명했다. 개인키·비밀번호·AAB는 Git 제외다.
- 검사기에 명시적인 `--native-frame-update`를 추가했다. 승인된 MainActivity/GameInsets 변경으로 DEX는 달라지지만 compiled inset/textZoom hook을 요구하고 서명·권한·미디어·서체·아이콘 검사는 유지한다.
- Vite가 font-family의 선택적 따옴표를 제거하는 차이를 검사기에서 허용했다. 앱 서체는 바꾸지 않았다. 모든 미디어/서체의 파일 목록과 바이트 비교도 추가했다.

### 결과·검증

| 항목 | 결과 |
| --- | --- |
| Vitest | 46파일·301테스트 통과 |
| TypeScript/Vite·Capacitor sync | 통과, dist88개 |
| Android | `:app:bundleRelease` 및 커밋 확정 후 `--rerun-tasks` 재빌드 통과 |
| 앱 Java 단위 테스트 | `:app:testReleaseUnitTest`: GameInsets4개+기존 예제1개 통과 |
| 기기 테스트 코드 | `:app:assembleDebugAndroidTest` 컴파일 통과, 실제 실행 미실시. 테스트 APK를 배포 자료로 저장하지 않음 |
| AAB | bundletool validate·jarsigner 통과, 코드3과 서명 인증서 동일 |
| 번들 내용 | 최신 dist88개 바이트 일치, 아이콘15개 visible RGBA/alpha 일치, 미디어/서체/아이콘88항목이 코드3과 바이트 동일 |
| 네이티브 | GameInsets·publishGameInsets·textZoom hook, density/fontScale 처리, 흰 native 배경 포함. DEX 변경 해시 기록 |
| 권한·식별자 | 기존 앱ID, INTERNET/앱 전용 signature 권한 유지, debuggable=false/allowBackup=true, 비밀 서명자료/외부 server URL 없음 |
| 화면 모의 | 직전 프레임/강조색256조건·34터치, 최종 박스 제거8화면·8터치 통과. 실제 갤럭시 OS 설정 검사가 아님 |
| 실제 설치 | adb 연결 기기 없음. 실제 확대/안전영역/업데이트 후 저장 보존 미검증 |

첫 Gradle 실행은 루트 `testReleaseUnitTest`가 Capacitor SDK 자체 테스트까지 선택해, offline 캐시에 없는 SDK 테스트 전용 JSON/Mockito 의존성 때문에 실패했다. 앱 범위인 `:app:testReleaseUnitTest`를 명시해 재실행 후 통과했다. flatDir/SDK XML/차기 Gradle9 경고는 남지만 release lint/build는 성공했다. 최초 검사기의 CSS 따옴표 조건 오류도 실제 minified CSS 확인 후 보완하고 전체 검사를 통과했다. 서명의 자체 서명/타임스탬프 없음/Gradle ZIP manifest 순서 경고는 이전 AAB와 같으며 JAR 검증은 성공했다.

[상세 번들 검증](release-verification.json). 증명할 수 없는 실기기 화면을 합성하지 않았다.

### 모바일 전후 화면

기존 검토 PNG를 재사용하며 캡처 날짜·조건·측정값을 바꾸지 않았다. 모두 **390×844 CSS px/DPR2,780×1688 PNG**인 macOS Chrome 재현 화면이다. 최종 화면 아카이브의 런타임 코드가fed5879에 포함됐으며 AAB/dist 일치를 별도로 검사했다. Android 설치 스크린샷이 아니다.

| 화면 | 수정 전 —43a49ce+직전 후보 재현 | 최종 수정 후 —fed5879에 포함된 소스 |
| --- | --- | --- |
| Vocabulary START | ![전](../2026-10-01-bare-records-timer/final/before-word-start.png) | ![후](../2026-10-01-bare-records-timer/final/after-word-start.png) |
| Vocabulary 시간 | ![전](../2026-10-01-bare-records-timer/final/before-word-main.png) | ![후](../2026-10-01-bare-records-timer/final/after-word-main.png) |

전체 화면/확대 조건과 당시 중간 후보는 아래 기록에 보존한다. 실패한attempt·README 없는 임시 후보는 로컬 보관하고 이번 Git 커밋에서 제외했다.

- [최종 기록·시간 박스 제거](../2026-10-01-bare-records-timer/README.md)
- [강조색/기존 효과 복원·메인/START/각 게임/Pause/점수/Settings](../2026-10-01-ui-accents/README.md)
- [Android 비율·안전영역·256개 모의 조건](../2026-10-01-neutral-proportional-frame/README.md)
- [이전 안전영역/서체 후보](../2026-10-01-safe-layout/README.md)
- [아이콘·이전 코드3 AAB](../2026-09-30-android-text-icons/README.md)

### 새 AAB·출시 입력값

- 파일: `android/releases/TAPtoTALK-1.0.2-vc4-20261001.aab`, 56,332,620bytes (약56.3MB)
- 패키지: `io.github.junyyyong.taptotalk`, minSDK24/targetSDK36
- SHA-256: `431ac1d446b34da2ba1c4859739b45525620cd1571333bdeb60d0d6951181d93`
- 업로드 인증서 SHA-256: `C8:69:BF:30:43:94:DC:9C:7C:B0:73:2E:FF:F6:9A:F2:A6:E9:8F:01:F8:5E:17:A5:0A:1A:57:CC:36:F7:69:FD` (공개 지문)
- 출시명: `1.0.2 - UI & Screen Layout Update` (33자)
- [영문 출시노트·한글 해석·업로드 안내](release-notes.md), 영문 본문301자

### 재검사·실기기 확인

기존 JDK/SDK는 TEN 경로에서 읽기 사용했고 캐시·빌드·출시 파일은 TALK에만 생성했다. TAPtoTEN/TAPtoTEST 소스·출시물은 수정하지 않았다. Git 변경/push는 TALK의origin뿐이며 이전 AAB와 사용자 미추적 참고/디자인/음원 파일은 보존했다.

```sh
npm test
npm run cap:sync
# 기존 JAVA_HOME/ANDROID_HOME과 TALK 내부 GRADLE_USER_HOME을 지정한다.
cd android
./gradlew --offline --no-daemon :app:bundleRelease :app:testReleaseUnitTest
# 저장소 루트로 돌아와 JAVA_HOME/BUNDLETOOL_JAR를 지정한다.
python3 scripts/verify-android-release.py android/releases/TAPtoTALK-1.0.2-vc4-20261001.aab android/releases/TAPtoTALK-1.0.1-vc3-20260930-iconfix.aab NEW_REPORT.json --native-frame-update
```

실제 출시 전 테스트 트랙에서 기존 앱을 삭제하지 않고 업데이트하여 세 게임 진도/기록/설정 보존·확대 설정/실행 중 변경·터치·음악/영상 소리를 확인한다. Git push는 Google Play 출시를 뜻하지 않는다.
