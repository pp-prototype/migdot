# 2026-11-17 공통 로그인·인가 방식 검토

- 일시: 2026-11-17 (Asia/Seoul)
- 요청: 구현 전 소셜/비소셜 로그인 차이와 Supabase 인가의 보안상 단점 논의
- 상태: 기술 검토 및 AI 제안 · 로그인 방식·보안 정책 미확정
- 범위: 현재 공통 클라이언트·개발원칙 확인 및 공식 문서 검토. 코드·환경 변수·클라우드 설정·데이터 변경 없음

## 현재 상태와 구분

MIG DOT는 선택적으로 생성하는 Supabase 클라이언트만 갖고 있고 공통 로그인·세션 UI와 테이블 RLS는 아직 구현하지 않았다. 이번 검토는 실제 배포 환경 보안 감사나 안전성 검증이 아니다.

인증은 누구인지 확인하는 과정이며, 인가는 확인한 사용자가 무엇을 할 수 있는지 정하는 정책이다. Google 소셜 로그인 또는 이메일 로그인을 Supabase Auth에 연결하고 DB RLS·Storage 정책을 공통 적용할 수 있다. 소셜 로그인과 Supabase는 양자택일이 아니다.

## 로그인 방식 비교

- Google 등 소셜 로그인: 앱 전용 비밀번호·재설정 UI 부담을 줄이고 공급자의 계정 보호를 활용한다. OAuth 설정·콜백 관리가 필요하고 공급자의 계정 정지·분실·장애가 로그인에 영향을 준다. 요청 범위를 식별·이메일 등 필요한 최소 정보로 제한한다.
- 이메일·비밀번호: Supabase Auth로 관리할 수 있으므로 자체 비밀번호 서버를 만들 필요가 없다. 앱 전용 자격증명과 복구 경로·비밀번호 공격 방어·추가 인증 정책을 운영해야 한다. 이메일 복구를 쓰면 메일 계정에도 의존한다.
- 이메일 OTP/매직링크: 앱 비밀번호는 없지만 로그인 시 메일 접근이 필요하다. 발송 신뢰성과 SMTP 설정·제한을 검토해야 한다.

소셜 여부만으로 보안 순위를 확정하지 않는다. 실제 계정 보호, 복구, 세션과 인가 정책을 함께 평가한다. 초기에는 한 방식만 도입하고 다른 방식 추가는 복구 및 실제 사용 필요에 따라 검토한다.

## Supabase의 이점과 위험

DB에서 요청마다 접근 규칙을 적용할 수 있어 UI 우회 직접 API 요청에도 정책을 적용한다. 그러나 서비스 도입만으로 모든 앱 데이터가 자동 보호되지는 않는다.

- 노출 테이블의 grants 및 SELECT/INSERT/UPDATE/DELETE별 RLS 누락·오설정
- authenticated를 승인된 개인 사용자나 관리자와 동일시하는 오류
- 요청의 owner_id 또는 사용자가 수정할 수 있는 user_metadata를 권한 근거로 신뢰하는 오류
- secret/service_role 키 유출 및 RLS를 우회하는 서버·RPC·뷰의 권한 문제
- DB와 별개인 Storage 공개 버킷·객체 정책 또는 서명 URL 노출
- 브라우저 토큰 보관과 XSS로 로그인 세션이 탈취될 위험
- 로그아웃·세션 폐기 이후에도 이미 발급한 access token이 만료 전 유효할 수 있는 JWT 특성
- 단일 프로젝트의 설정 실수·관리 계정 탈취·장애가 여러 모듈에 미치는 공통 영향

SPA 기본 세션 보관은 localStorage이며 HttpOnly 쿠키/BFF를 사용하는 구조는 별도의 서버 경로와 세션 설계를 요구한다. 단순히 localStorage를 쿠키로 교체하면 해결된다고 설명하지 않는다. 브라우저에 저장된 세션과 업무 데이터의 영속 저장 위치는 구분한다.

## MIG DOT에 제안하는 기본선

개인 사용 기준으로 Google 한 가지를 Supabase Auth에 연결하는 방식을 우선 후보로 제안한다. 앱 사용자 가입 허용과 애플리케이션 사용 승인은 분리한다. 등록/승인 절차를 검증하고 운영자가 관리하는 승인 사용자 ID와 행 소유권을 DB 정책에서 확인한다. 가입 제한과 승인 테이블의 구체적인 조합은 구현 시 결정하며 누구나 스스로 승인 상태를 바꿀 수 없게 한다.

각 모듈의 운영 테이블과 비공개 Storage에 접근 제어를 적용한다. 공통 Auth UUID를 소유권 기준으로 삼고 비로그인·다른 사용자·미승인 사용자·위조된 소유자·직접 API 요청의 거부를 검증한다. 개인 Google 계정과 Supabase 관리 계정의 추가 인증·복구 수단도 점검한다. 앱에서 MFA를 의무화할 경우 화면에만 추가하지 않고 필요한 DB 접근 정책에서도 AAL을 검증한다. Google 측 MFA와 Supabase AAL2는 별개이므로 동일하다고 가정하지 않는다.

원칙적으로 클라이언트에는 publishable key만 사용한다. 승인 변경을 즉시 반영해야 하는 데이터 접근은 갱신 전 JWT 클레임만 신뢰하지 않고 DB의 현재 승인 상태 확인을 검토한다. 모든 로그아웃이 발급된 JWT를 즉시 무효화한다고 표현하지 않는다.

## 통합 앱에서 추가 고려할 경계

모듈 독립성은 코드와 기능의 경계이며 브라우저 보안 격리는 아니다. 같은 페이지와 공통 세션에서 실행되는 모듈의 XSS는 해당 사용자가 접근 가능한 다른 모듈 데이터까지 영향을 줄 수 있다. RLS는 서로 다른 사용자 간 소유권을 제한하지만 같은 세션의 악성 스크립트를 정상 사용자와 구별하지 않는다. 입력·Markdown·외부 스크립트·의존성을 공통 기준으로 관리하고 업무상 강한 격리가 필요하면 별도 경계를 검토한다.

현재 번들에 포함되는 Markdown은 로그인 UI로 숨겨도 원문을 비공개로 만들 수 없다. 운영 데이터 보호와 정적 문서/소스 배포의 공개 범위를 별도 결정해야 한다. 로그인 라우트 보호를 모든 배포 자산의 보호라고 설명하지 않는다.

## 보류 및 다음 논의

개인 전용 또는 초대 사용자 수용 여부, 로그인 공급자, 앱 자체 MFA의 필수 범위, 세션 유지·공용 기기 정책, 계정 복구와 문서 공개 범위를 결정한다. 이번 제안을 구현 승인으로 간주하지 않는다.

## 공식 참고 자료

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [소셜 로그인](https://supabase.com/docs/guides/auth/social-sign-in)
- [비밀번호 인증](https://supabase.com/docs/guides/auth/passwords)
- [이메일 OTP/매직링크](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- [인증 이메일과 SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [API 접근 제어](https://supabase.com/docs/guides/api/securing-your-api)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage 공개/비공개](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [세션](https://supabase.com/docs/guides/auth/sessions)
- [로그아웃과 JWT 만료](https://supabase.com/docs/guides/auth/signout)
- [브라우저 세션 기본 설정](https://supabase.com/docs/reference/javascript/auth)
- [MFA](https://supabase.com/docs/guides/auth/auth-mfa)
