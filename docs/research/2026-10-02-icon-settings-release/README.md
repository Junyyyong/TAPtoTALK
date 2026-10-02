# 2026-10-02 Android 1.0.4 아이콘·앱 이름·설정 출시

## 변경 제목

- 사용자 승인: 현재 변경을 TAPtoTALK origin에 commit/push하고 기존 서명키로 새 AAB 생성, 출시명·출시노트 제공. Play Console 업로드/출시는 수행하지 않는다.
- 비교 커밋: `41385dbca02aed44433b26a6c85800328ca508f4` — 기존1.0.3/versionCode5.
- 적용 소스 커밋: `682daf8823ad8ce687eaf54c79b007e3c37875aa` (`682daf8`). 이후 커밋은 연구 문서·번들 검사기/결과만 갱신하며 앱 소스는 바꾸지 않는다.
- 과거 재현/비교 조건: [기존 전후 연구기록](../2026-10-02-fullbleed-icon-settings/README.md). 별도 임시 폴더에서 이전 커밋을 실행한 실제 렌더링이며 현재 화면으로 과거를 임의 재현하지 않는다.

### 문제·개선 요구

원형 설치 아이콘의 흰 여백, 잘못된 앱 이름 띄어쓰기, 작동하지 않는 진동 설정을 고쳐 출시해야 했다. 사용자는 세로 방향 제한을 유지하고 현 시스템바 대응을 변경하지 않기로 결정했다.

### 수정 내용과 이유

- 승인된 full-bleed 아이콘15종·브라우저/스토어 아이콘을 반영한다. 사용자 원본 PNG는 보존하며 원형 모양은 Android 런처 마스크에 따른다.
- Android·Capacitor·웹 표시 이름을`TAPtoTALK`으로 통일한다.
- 진동 UI/안내를 없애고 과거 진동ON 저장값도 비활성화한다. Music·Sound와 나머지 저장값은 유지한다.
- Android 버전만 **1.0.4/versionCode6**로 증가한다. 패키지·기존 업로드키·게임 규칙/콘텐츠·서체·디자인·음악·진도/최고기록 저장·세로 방향 제한·시스템바 처리는 그대로다.
- 미추적 원본/시안 등 작업과 무관한 자료는 커밋하지 않는다. 다른 게임 저장소는 읽기 참고만 하며 수정/push하지 않는다.

### 수정 결과·검증

- Vitest **48파일313개**, TypeScript/Vite·Capacitor sync 통과. 버전 단정 테스트를 새1.0.4(6)에 맞춰 갱신했다.
- `:app:bundleRelease` 성공. 변경 없는 앱 Java 테스트5개는 기존 통과 결과에 대한 Gradle UP-TO-DATE 판정을 재사용했다. flatDir·SDK XML·차기Gradle9 경고는 이전과 같으며 빌드는 통과했다.
- bundletool validate·jarsigner 검증 통과. 이전1.0.3(5)과 업로드 인증서 동일, 최신dist89항목 바이트 일치, launcher/round/adaptive PNG15개 픽셀과 꽉 찬 배치 검사 통과.
- 실제 AAB의 app_name/title_activity_main은`TAPtoTALK`, 아이콘 배경은#1D2087이다. 승인된 아이콘 외 미디어/서체73항목 및 네이티브DEX는 이전 AAB와 바이트 동일하다. 서명 비밀자료/외부server URL은 포함되지 않는다.
- 게임 core/content/CSS/native insets/진도·기록 소스는 비교 커밋과 차이가 없다. 빌드 앱 소스 작업 트리clean을 확인했다.
- 검사기가 Finder의`.DS_Store`를 앱 자산으로 오인한 부분만 보완했다. Android ignoreAssetsPattern이 이미 제외하는 파일이므로 해당 파일을 삭제하거나 AAB/게임 자산을 바꾸지 않았다. 실제 리소스 이름/색 검사도 추가했다.
- [최종 상세 번들 검증](release-verification.json). 이전 후보의 Settings 검증/compiled 리소스 확인은 [원본 결과](../2026-10-02-fullbleed-icon-settings/README.md)를 보존한다.

실제 Android 기기 검증은 미실시다. 모의 캡처·리소스 검사는 실제 홈 화면 설치, OS 런처 캐시 갱신, 구버전→신버전 업데이트 보존 검사와 구분한다.

### 모바일 전후 화면

동일390×844 CSS px/DPR2, **780×1688 PNG**, Chrome Android 플랫폼 모의·남은 native insets0·Music/Sound OFF·과거 진동ON 조건이다. 전은 비교 커밋을 별도 폴더에서 실행했으며 후는 이번 출시와 같은 앱 코드다. 이번 버전 증가/문서 추가는 화면을 바꾸지 않으므로 이전 캡처를 재사용한다.

| 전 —41385db 재현 | 후 —이번 적용 코드 |
| --- | --- |
| ![Settings 전](../2026-10-02-fullbleed-icon-settings/screenshots/before-settings.png) | ![Settings 후](../2026-10-02-fullbleed-icon-settings/screenshots/after-settings.png) |

아이콘 전후는 [별도 마스크 리소스 미리보기](../2026-10-02-fullbleed-icon-settings/README.md#아이콘-전후-미리보기)다. 실제 모바일 설치 스크린샷으로 표시하거나 합성하지 않는다.

### AAB·출시 입력값

- 파일: `android/releases/TAPtoTALK-1.0.4-vc6-20261002.aab`.
- 크기: **56,706,787bytes** (약56.7MB).
- SHA-256: `25a99dc816f9e8a83f86183872e9d1b2f693b1f7b002e4cda5c8b9ff02e16910`.
- 기존 업로드 인증서SHA-256: `C8:69:BF:30:43:94:DC:9C:7C:B0:73:2E:FF:F6:9A:F2:A6:E9:8F:01:F8:5E:17:A5:0A:1A:57:CC:36:F7:69:FD` (공개 지문).
- 패키지: `io.github.junyyyong.taptotalk`.
- minSDK24 / targetSDK36 유지.
- 버전: **1.0.4/versionCode6**, 이전 코드5보다 높다.
- 출시명: `1.0.4 - Icon & Settings Update`.
- [영문 출시노트·한글 해석](release-notes.md).
- AAB·개인키/비밀번호는 Git 제외하며 기존 AAB는 덮어쓰지 않는다.
