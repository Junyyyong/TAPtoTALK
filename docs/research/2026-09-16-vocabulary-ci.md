# 2026-09-16 VOCABULARY 및 CI 설치 오류

- 사용자 요청: Word 게임명을 Vocabulary로 변경하고 반복 CI 실패 메일 해결.
- 메인·START 안내·플레이 화면 이름을 VOCABULARY로 통일. 내부 mode id와 게임 규칙은 word 그대로 유지한다.
- GitHub run35042370993: 웹 테스트/빌드는 성공, Android setup은 `Failed to find package 'tools'`로 실패. setup-android에 `packages: platform-tools`를 명시해 기본값의 오래된 tools 패키지 요청을 제거했다. 테스트나 CI 자동 실행을 비활성화하지 않았다.
- GitHub 이메일 알림 설정 페이지는 로그인이 필요해 변경하지 못했다. 오류 수정은 이메일 수신 설정 해제와 별개다.
- 단일 명칭/CI 설정 변경이며 과거 화면 재현은 추가하지 않았다.
