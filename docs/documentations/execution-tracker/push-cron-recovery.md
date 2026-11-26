# 익스큐셔너 푸시 예약 발송 장애 복구 기록

- 기록일 2026-11-26 (Asia/Seoul)
- 대상 MIG DOT 운영 DB의 `send-execution-reminders` 예약 작업
- 상태 `net` 스키마 생성 확인. 예약 발송과 실제 기기 수신 검증 대기

## 증상과 원인

운영 Cron 실행 기록에서 2026년 11월 25일 오후 5시와 오후 9시를 포함한 여러 실행이 실패했다. 오류 메시지는 `ERROR: schema "net" does not exist`였고, 실패 지점은 `select net.http_post(...)`였다. 예약은 실행됐지만 DB에서 HTTP 호출을 만들지 못해 해당 실행의 요청이 푸시 발송 함수에 도달하지 않았다. `net.http_post()`는 PostgreSQL의 `pg_net` 확장이 제공한다. [Supabase pg_net 안내](https://supabase.com/docs/guides/database/extensions/pg_net)

## 조치와 확인 결과

운영 프로젝트에서 `pg_net`을 활성화한 뒤, SQL Editor에서 아래 조회 결과가 `true`인 것을 확인했다. 기존 Cron 일정은 유지한다.

```sql
select to_regnamespace('net') is not null as net_ready;
```

같은 오류가 재발하면 운영 프로젝트의 **Database → Extensions**에서 `pg_net`을 확인한다. 확장이 꺼져 있으면 대시보드에서 활성화하거나 아래 명령을 실행한 뒤 위 조회를 반복한다.

```sql
create extension if not exists pg_net with schema extensions;
```

## 다음 예약에서 확인할 항목

1. **Cron → Jobs → send-execution-reminders**에서 확장 활성화 이후 실행의 상태가 `Succeeded`인지 확인한다.
2. **Edge Functions → send-execution-reminders → Logs**에서 같은 시각의 호출과 응답을 확인한다. Cron 성공은 HTTP 요청이 큐에 들어갔음을 보여준다. 함수 응답이 `401`이면 Cron Vault와 함수의 예약 인증 설정을 확인하고, `sent: 0`이면 해당 시간의 발송 대상과 기기 구독을 확인한다.
3. 알림을 켠 기기에서 **시스템 배너 또는 알림 센터**를 확인한다. 한국 시간 오후 5시에는 기한이 오늘이거나 지난 미완료 과업, 오후 9시에는 오늘 실천 기록이 없는 활성 루틴을 남겨 테스트한다. iPhone·iPad에서는 홈 화면의 MIG DOT 아이콘으로 앱을 열어 알림을 허용한다. [웹 푸시 기기 안내](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

복구 확인 시각과 Cron 상태, 함수 응답, 기기 수신 결과를 함께 기록한다. 전체 연결 절차는 [Supabase 푸시 설정 안내](../../../supabase/README.md#5-cron에-발송-시간-등록)를 참고한다.
