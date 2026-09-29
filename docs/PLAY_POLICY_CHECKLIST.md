# TAPtoTALK 출시 전 개인정보·라이선스 점검

점검: 2026-09-29~30. 운영자 **TapeeTepee openstudio**, 연락처 **wnsdydtml@gmail.com**.
이 문서는 구현·검증 결과와 출시 담당자 할 일을 구분한다. 법률 검토나 Google Play 승인 보장은 아니다.

## 앱에서 완료한 것

- Settings의 Privacy policy · Licenses 링크, 앱에 포함한 한·영 HTML 문서, 닫기/Escape/포커스 복귀. 동의 강제·외부 브라우저·서버 조회 없음.
- TAPtoTEN과 같은 링크13px/500,44px 터치 높이, 가로 간격6px, 위 여백26px. 같은 모바일 조건에서 위치와 읽기 창 치수를 비교한다.
- 실제 사용 서체2종(SIL OFL), Capacitor3종(MIT), Android release 의존성50개(Apache-2.0), Cordova/AndroidX 고지, VCSL 악기 샘플(CC0) 전문 포함.
- package/appId/applicationId/namespace: `io.github.junyyyong.taptotalk` **변경하지 않음**. `MainActivity`, strings, Preferences 등록도 확인.
- 게임 규칙·콘텐츠·진행 키·최고기록 키·시작 흐름 유지. 새 앱 인스턴스/이전 저장 데이터로 검증한다.

## 실제 데이터·통신 감사

| 영역 | 확인한 현재 구현 |
| --- | --- |
| 설정 | Music/Sound/Vibration 및 기존 tutorialDone 설정. `taptotalk.preferences.v1` |
| 진행 | `taptotalk.progress.v1.alphabet\|syllable\|word`. 추첨/최근 문제, 진행 위치·라운드·난도, 현재 보드·누른 블록·입력, 경과시간·완성 수·결과 대기 상태 |
| 최고기록 | `taptotalk.records.v1`: 각 게임의 최고 **도달 스테이지**. 날짜별 기록·최고 시간 저장 기능으로 설명하지 않음 |
| 저장 방식 | 웹 localStorage, Android private SharedPreferences를 사용하는 Capacitor Preferences. 이전 값의 `.backup`, WebView→native 최초 이관·오류 복구 유지 |
| 개발자 서버 | 게임 데이터 전송·계정·로그인·채팅·사용자 업로드·광고·결제·분석/광고 SDK 없음. 활성 진입점과 dependency graph 확인 |
| 미디어·문서 | BGM/영상/음원/폰트/HTML은 번들 내 경로. 활성 fetch는 로컬 오디오 디코딩 용도. 브라우저 검증 중 외부 origin 요청0건 |
| 기기 판별 | 영상 포맷 선택에 userAgent/maxTouchPoints, 진동 가능 여부 확인. 서버 전송 없음 |
| Android 배포 권한 | release merged manifest: INTERNET + 앱 전용 signature 권한 `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`. 카메라·마이크·위치·연락처·광고ID 권한 없음 |
| 백업 | 기존 `allowBackup=true`. 운영체제/Google 계정 설정에 따른 백업·복원 가능. 개발자 서버 동기화와 다름 |
| 웹 호스팅 | Vercel은 웹 게임/온라인 정책 방문 시 IP·요청·브라우저 정보와 기술 로그를 처리할 수 있음. 번들 Android 플레이와 구분 |
| 문의 | 사용자가 별도 Gmail로 보내는 주소·본문·첨부파일. 문의 목적 보관/삭제·보호자 문의 안내. 게임 내 이메일 발송/업로드 기능 없음 |

근거: `src/main.ts`, `ui/talkStorage.ts`, `persistentStore.ts`, `talkProgress.ts`, `stageRecords.ts`, `backgroundMusic.ts`, `clipSound.ts`, `config/app.ts`, package lock 및 Android 병합 manifest.
소스에 존재하는 미사용 숫자게임 저장 모듈은 활성 TAPtoTALK의 수집 기능으로 간주하지 않는다.

## 공개 주소

- 개인정보: https://taptotalk.vercel.app/privacy.html
- 라이선스: https://taptotalk.vercel.app/licenses.html

두 문서는 `public/`→`dist/`→Android assets에 포함된다. 배포 후에는 로그인 없이 HTML 본문·정확한 게임명/연락처가 나오는지 확인해야 한다. HTTP200만으로 SPA fallback을 정책 페이지로 오인하지 않는다. 실제 배포 확인 시각/해시는 연구기록에 남긴다.

## 공식 정책 근거와 출시 담당자 할 일

2026-09-29 공식 문서 확인:

- [User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en-GB): 앱 내부 방침과 Play Console의 공개 HTML URL, 운영자·연락처, 정보 처리·보관·삭제 설명이 필요하다. 계정 생성 기능은 없으므로 현재 별도의 계정 탈퇴 기능을 만들지 않았다.
- [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en-AE): 기기 안에서만 처리하고 외부로 보내지 않는 정보는 수집 신고 범위와 구별된다. 단, SDK 및 개발자가 제어하는 WebView의 전송도 함께 확인해야 한다. 현재 번들 앱에서 수집/공유 없음으로 판단할 근거는 있지만 콘솔 답변은 출시 담당자가 최종 바이너리와 대조한다.
- [Families](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en): 실제 대상 연령, 콘텐츠, 어린이 데이터 처리와 SDK 적합성을 정확하게 신고해야 한다. 광고/분석이 없다고 모든 Families 요건을 자동 충족하는 것은 아니다.

아래 작업은 **미완료 / 담당자 확인 필요**:

- [ ] Play Console 개인정보 URL·Data Safety·광고 유무·앱 액세스·콘텐츠 등급·대상 연령을 실제 출시물에 맞게 입력. 운영자명과 연락처 일치 확인.
- [ ] 어린이를 대상에 포함할지 결정하고 전체 단어·이미지·영상·스토어 설명 검수. 현재 Syllable의 `술 / alcohol` 같은 학습 어휘는 이번 작업에서 변경하지 않았으며 연령 적합성 검토 대상이다.
- [ ] 로고·커버·캐릭터·영상·음성·사용자 제공 자소 SVG 등의 배포 권리 및 제작 도구 조건 확인. 라이선스 페이지가 이들에 대한 포괄적 권리 증명을 대신하지 않는다.
- [ ] 지원 이메일 실제 수신/문의 처리/삭제 절차, 웹 호스팅·메일 제공자 계약과 보관 설정 확인. 정책 문구와 실제 운영을 맞춘다.
- [ ] 같은 패키지·서명의 구버전→신버전 실제 Android 업데이트에서3게임 진도·최고기록 유지 확인. 삭제 후 재설치·기기 변경·백업 복원은 보장하지 않는다.
- [ ] 실기기 오프라인 문서 열기, Android 뒤로가기, 글자 확대, TalkBack, 음원/영상 점검. 브라우저 에뮬레이션이 실기기 검사를 대체하지 않는다.
- [ ] versionCode, 서명, target API 및 기타 배포 요건을 제출 시점에 확인. 현재 minSDK24/targetSDK36, versionCode1/versionName1.0이다. 이번 작업은 서명키를 열람하거나 AAB를 만들거나 콘솔에 제출하지 않았다.

## 재생성 및 업데이트 주의

`scripts/list-release-dependencies.gradle`로 TALK의 `releaseRuntimeClasspath`를 추출한 후 `node scripts/build-license-notices.mjs` 실행. 생성기는 실제 설치된 Capacitor 및 Gradle 캐시 POM/AAR/JAR의 라이선스/NOTICE를 읽는다. 새로운 비-Apache Android 라이선스는 자동 추정하지 않고 오류로 멈춘다. 빌드/테스트 전용 도구는 배포 고지에서 제외한다.

`public/legal/ASSET-NOTICES.txt`는 Noto2종 및 VCSL6샘플의 출처를 기록한다. 폰트/음악/SDK 교체 시 실제 목록과 전문을 함께 갱신한다.

게임 저장 키를 버전별로 바꾸거나 정책 열람 때 초기화하지 않는다. 앱 식별자·서명 유지와 형식 마이그레이션은 별도 출시 계약이다. 연구 캡처는 격리 브라우저와 임시 archive를 사용하고 실제 사용자 저장을 건드리지 않는다.
