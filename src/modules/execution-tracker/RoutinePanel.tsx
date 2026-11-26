import ActionButton from './ActionButton'
import Executioner from './Executioner'
import TrackerDisclosure from './TrackerDisclosure'
import { effortLabels, FIRST_LEVEL_DAYS, type Routine, type RoutineCheck, type routineProgress } from './workspace'
import styles from './workspace.module.css'

type Props = {
  routines: ReturnType<typeof routineProgress>
  readOnly: boolean
  today: string
  edit: (routine?: Routine) => void
  editCheck: (routine: Routine, check?: RoutineCheck) => void
  change: (command: string, payload: Record<string, unknown>, message: string) => Promise<boolean>
}

export default function RoutinePanel({ routines, readOnly, today, edit, editCheck, change }: Props) {
  const checkedCount = routines.filter(entry => entry.checked).length
  return <section className={styles.panel} data-surface="routine" aria-labelledby="today-routines">
    <div className={styles.panelHeading}>
      <div>
        <h2 id="today-routines">오늘의 루틴</h2>
        {routines.length > 0 && <p>오늘 실천 {checkedCount} / {routines.length} · {checkedCount === routines.length ? '모두 실천했어요' : `기록하지 않은 루틴 ${routines.length - checkedCount}개`}</p>}
      </div>
      <ActionButton icon="plus" label="루틴 등록" visibleLabel="루틴 등록" tone="primary" disabled={readOnly} onClick={() => edit()} />
    </div>
    {routines.length ? <ul className={styles.taskList}>{routines.map(({ routine, checked, count, level, todayCheck, suggestion }) => {
      return <li key={routine.id} className={styles.routineCard}>
        <div className={styles.routineHeader}>
          <div className={styles.routineIdentity}>
            <div className={styles.miniExecutioner} data-level={level}><Executioner level={level} mood={level === 2 ? 'proud' : 'ready'} /></div>
            <div><span className={styles.routineLevel}>레벨 {level}</span><h3>{routine.title}</h3></div>
          </div>
          <span className={styles.routineStatus} data-complete={checked}>{checked ? '오늘 실천 완료' : '오늘 기록 전'}</span>
        </div>
        {(routine.goal || routine.expected_outcome || routine.practice_cue || routine.minimum_action) && <dl className={styles.routinePlan}>
          {routine.goal && <div><dt>목표</dt><dd>{routine.goal}</dd></div>}
          {routine.expected_outcome && <div><dt>기대 결과</dt><dd>{routine.expected_outcome}</dd></div>}
          {routine.practice_cue && <div><dt>시작 신호</dt><dd>{routine.practice_cue}</dd></div>}
          {routine.minimum_action && <div><dt>작은 실천</dt><dd>{routine.minimum_action}</dd></div>}
        </dl>}
        <div className={styles.routineProgress}>
          <span>누적 {count} XP · {count}일 실천</span>
          <progress aria-label={`${routine.title} 첫 레벨 진행률`} value={Math.min(count, FIRST_LEVEL_DAYS)} max={FIRST_LEVEL_DAYS} />
          <strong data-complete={level === 2}>{level === 2 ? '첫 7일 달성' : `레벨 2까지 ${FIRST_LEVEL_DAYS - count}일`}</strong>
        </div>
        <div className={styles.routineSuggestion}>
          <h4>{suggestion.title}</h4>
          <p>{suggestion.text}</p>
          {suggestion.edit && <button type="button" className={styles.textAction} disabled={readOnly} aria-label={`실천 계획 수정 · ${routine.title}`} onClick={() => edit(routine)}>실천 계획 수정</button>}
        </div>
        <RoutineCheckDetails check={todayCheck} />
        <div className={styles.actions}>
          <ActionButton icon={checked ? 'undo' : 'check'} label={`${routine.title} ${checked ? '실천 취소' : '실천 기록'}`} visibleLabel={checked ? '실천 취소' : '실천 기록'} tone={checked ? 'default' : 'primary'} disabled={readOnly}
            onClick={() => {
              if ((todayCheck?.practice_note || todayCheck?.effort) && !window.confirm('실천 기록과 함께 오늘의 메모와 난이도를 지울까요?')) return
              void change('check_routine', { id: routine.id, day: today, checked: !checked }, checked ? `${routine.title}의 오늘 실천을 취소했어요.` : `${routine.title}의 오늘 실천을 기록했어요.`)
            }} />
          <ActionButton icon="edit" label={`${routine.title} 상세 기록`} visibleLabel="상세 기록" disabled={readOnly} onClick={() => editCheck(routine, todayCheck)} />
          <TrackerDisclosure label="루틴 관리" compact>
            <div className={styles.actions}>
              <ActionButton icon="edit" visibleLabel="루틴 수정" label={`${routine.title} 루틴 수정`} disabled={readOnly} onClick={() => edit(routine)} />
              <ActionButton icon="archive" visibleLabel="보관" label={`${routine.title} 보관`} tone="danger" disabled={readOnly} onClick={() => {
                if (window.confirm('루틴을 보관할까요? 과거 실천 기록은 유지합니다.')) {
                  void change('archive_routine', { id: routine.id }, '루틴을 보관했습니다. 과거 기록은 유지합니다.')
                }
              }} />
            </div>
          </TrackerDisclosure>
        </div>
      </li>
    })}</ul> : <p className={styles.empty}>기르고 싶은 습관과 기대하는 변화를 적어 첫 루틴을 만들어 보세요.</p>}
    {routines.length > 0 && <div className={styles.coachingHelp}>
      <TrackerDisclosure label="습관 제안은 어떻게 정하나요?">
        <p>습관이 자동으로 자리 잡는 속도는 사람과 행동에 따라 달라요. 제안은 최근 실천 횟수와 직접 남긴 난이도를 바탕으로 지금 할 만한 다음 행동을 알려줘요.</p>
        <p>같은 계획으로 7일 이상 실천하고 최근 두 번의 난이도 기록이 가벼우면 조금 늘려볼 수 있어요.</p>
      </TrackerDisclosure>
    </div>}
  </section>
}

export function RoutineCheckDetails({ check }: { check?: RoutineCheck }) {
  if (!check?.practice_note && !check?.effort) return null
  return <dl className={styles.routinePlan}>
    {check.practice_note && <div><dt>실천 내용</dt><dd className={styles.practiceNote}>{check.practice_note}</dd></div>}
    {check.effort && <div><dt>난이도</dt><dd>{effortLabels[check.effort]}</dd></div>}
  </dl>
}
