# TAPtoTALK1.0.1 출시 안내

## 출시명

```text
1.0.1 - Display & Icon Update
```

## 영문 출시 노트 — 태그 포함 복사

```text
<en-US>
- Updated the app icon.
- Improved text-size consistency when Android large-font settings are enabled or changed.
- Gameplay, scoring, and save formats are unchanged.
</en-US>
```

한글 뜻: 앱 아이콘을 교체했습니다. Android 큰 글씨 설정을 켜거나 변경했을 때 게임 글자 크기가 일정하게 유지되도록 개선했습니다. 게임 규칙·점수·저장 형식은 변경하지 않았습니다.

## 한국어 업데이트 방법

1. Play Console에서 **기존 TAPtoTALK 앱**을 선택한다. 새 앱을 만들거나 패키지·앱 서명키를 변경하지 않는다.
2. 먼저 사용 중인 내부/비공개 테스트 트랙에서 새 버전을 만든다. 아직 초안이면 해당 버전을 수정한다.
3. 최종 아이콘 보정 파일 `android/releases/TAPtoTALK-1.0.1-vc3-20260930-iconfix.aab`를 업로드한다. 처리 후 `1.0.1 / 버전 코드3`을 확인한다. 사용자가 코드2 첫 후보를 이미 업로드했으므로 같은 코드를 재사용하지 않는다. 같은 날짜의 코드2 파일들은 이력 보존용이며 다시 업로드하지 않는다.
4. 위 출시명과 영문 노트를 붙여 넣고 콘솔의 오류/검토 항목을 확인한다. 실제 제출·공개 여부는 사용자가 결정한다.
5. 스토어 목록에 보이는 아이콘도 바꾸려면 기본 스토어 등록정보에 `store/android/taptotalk-play-icon-512.png`를 별도로 올린다. AAB에는 설치 아이콘이 포함돼 있다.
6. 기기에 기존 Play 버전을 남겨둔 채 **업데이트**한다. 앱 삭제/데이터 삭제는 하지 않는다. 세 게임 진도·최고기록·설정 및 큰 글씨 설정 변경 후 화면을 확인한다.

공식 UI 흐름 참고: [Google Play 버전 준비 및 출시](https://support.google.com/googleplay/android-developer/answer/9859348?hl=ko).

## 주의

- 로컬 준비만 완료했다. push/Play 업로드/심사 제출은 하지 않았다.
- 기존 업로드키와 앱ID를 유지했고 저장 코드·키를 수정하지 않았다. 실제 Play 업데이트 설치의 기록 보존은 기기에서 추가 검증해야 한다.
- 1.0 AAB는 별도 파일로 보존했다. 이번 AAB를 다시 만들 때도 이전 출시 파일을 덮어쓰지 않는다.
- 글자 확대는 앱 내부 WebView100% 정책이다. 기기 전체의 화면 확대/돋보기/density 설정을 강제 변경하지 않는다.
