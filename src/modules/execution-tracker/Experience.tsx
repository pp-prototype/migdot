import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../shared/Icon'
import { routines, sampleDay, shiftDay, taskProgress } from './data'
import type { Journal, Mission } from './model'
import Executioner from './Executioner'
import ActionButton from './ActionButton'
import styles from './experience.module.css'

type Editor = { kind: 'task'; task?: Mission } | { kind: 'move'; task: Mission } | { kind: 'close' }
function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const before = document.activeElement as HTMLElement | null
    const node = ref.current
    node?.showModal()
    ref.current?.querySelector<HTMLElement>('input, textarea, select')?.focus()
    return () => {
      node?.close()
      queueMicrotask(() => {
        if (before?.isConnected && !before.hasAttribute('disabled')) before.focus()
        else document.getElementById('day-end-title')?.focus()
      })
    }
  }, [])
  return <dialog className={styles.dialog} ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === event.currentTarget) close() }}><div className={styles.dialogHeading}><h2>{title}</h2><ActionButton icon="close" label="닫기" type="button" onClick={close} /></div>{children}</dialog>
}
export default function Experience({ journal, setJournal }: { journal: Journal; setJournal: (value: Journal) => void }) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [undo, setUndo] = useState<{ previous: Journal; message: string } | null>(null)
  const todayTasks = journal.tasks.filter(task => task.date === sampleDay)
  const postponed = journal.tasks.filter(task => task.originalDate === sampleDay && task.date !== sampleDay)
  const progress = taskProgress(todayTasks)
  const current = todayTasks.find(task => task.id === journal.activeId && !task.done)
  const [line, setLine] = useState(current ? `다시 돌아왔군. ‘${current.title}’부터 이어가자.` : '오늘의 집행 목록을 확인하겠다. 첫 과업부터 시작하지.')
  function change(next: Journal, message: string, speech: string) {
    setUndo({ previous: journal, message }); setJournal(next); setLine(speech)
  }
  function complete(task: Mission) {
    change({ ...journal, activeId: journal.activeId === task.id ? null : journal.activeId, tasks: journal.tasks.map(item => item.id === task.id ? { ...item, done: !task.done } : item) }, task.done ? '완료를 취소했습니다.' : '과업을 완료했습니다.', task.done ? '다시 목록에 올렸다. 첫 행동부터 확인하자.' : '집행 완료. 작은 일도 중요한 임무였다.')
  }
  const mood = journal.closed ? 'rest' : current ? 'working' : undo?.message === '과업을 완료했습니다.' ? 'proud' : 'ready'
  const practiced = routines.filter(routine => journal.records[`${routine.id}:${sampleDay}`]).length
  return <div className={styles.experience}>
    <section className={styles.scene} aria-label="집행관과 오늘의 계획"><div className={styles.sceneCopy}><span className={styles.chapter}>CHAPTER 01 <i /> 작은 실행의 집행록</span><h2>{journal.closed ? <>오늘의 집행은 여기까지.<br /><em>잘 쉬는 것도 임무다.</em></> : current ? <>하나의 과업에,<br /><em>지금의 나를 모으자.</em></> : <>거창하지 않아도 좋다.<br /><em>오늘의 한 가지를 끝내자.</em></>}</h2><p>완벽한 하루보다, 내가 고른 일을 실행하는 하루.</p><div className={styles.sceneMeta}><span>{sampleDay.replaceAll('-', '. ')} · 예시 하루</span><span>{journal.closed ? '하루 마감' : current ? '실행 중' : '임무 대기'}</span></div></div><div className={styles.characterArea}><span className={styles.characterTag}>YOUR LITTLE EXECUTIONER</span><Executioner mood={mood} /><span className={styles.characterName}>익스큐셔너 <small>단호함 100 · 위협감 0</small></span></div></section>
    <div className={styles.speech}><span className={styles.speechMark}>“</span><p aria-live="polite">{journal.closed ? '수고했다. 남은 일은 없어지지 않는다. 내일의 나에게 잘 넘기자.' : line}</p><span className={styles.speechFrom}>집행관의 한마디</span></div>
    <div className={styles.layout}><div className={styles.primaryColumn}>
      {journal.closed ? <section className={styles.dayEnd}><span className={styles.overline}>TODAY, WELL PLAYED</span><h2 id="day-end-title" tabIndex={-1}>오늘을 정리했습니다.</h2><p>완료 {progress.done}개 · 남은 과업 {progress.remaining}개 · 일정 조정 {postponed.length}개</p><dl><dt>오늘 알게 된 것</dt><dd>{journal.reflection || '회고를 남기지 않았습니다.'}</dd><dt>내일의 첫 행동</dt><dd>{journal.tomorrow || '쉬고 나서 정해도 괜찮습니다.'}</dd></dl><p className={styles.small}>체험 중인 내용입니다. 서버에 저장되지 않습니다.</p><ActionButton icon="unlock" label="마감 다시 열기" onClick={() => change({ ...journal, closed: false }, '하루 마감을 다시 열었습니다.', '계획을 다시 살펴보자. 필요한 만큼 조정하면 된다.')} /></section> : <>
      <section className={styles.missionPanel} aria-labelledby="task-title"><div className={styles.panelHeading}><div><span className={styles.overline}>01 / PLAN & DO</span><h2 id="task-title">오늘의 과업</h2><p>끝낼 수 있는 크기로, 한 번에 하나씩.</p></div><ActionButton icon="plus" label="과업 등록" tone="primary" onClick={() => setEditor({ kind: 'task' })} /></div><div className={styles.progressRow}><span>필수 과업 완료 <b>{progress.done} / {progress.total}</b></span><div className={styles.progress} role="progressbar" aria-label="필수 과업 완료" aria-valuenow={progress.done} aria-valuemin={0} aria-valuemax={progress.total || 1}><span style={{ width: `${progress.percent}%` }} /></div></div>
      <ul className={styles.missions}>{todayTasks.map(task => <li key={task.id} className={`${task.done ? styles.done : ''} ${current?.id === task.id ? styles.activeMission : ''}`}><ActionButton icon={task.done ? 'undo' : 'check'} label={`${task.title} ${task.done ? '완료 취소' : '완료'}`} aria-pressed={task.done} onClick={() => complete(task)} /><div className={styles.missionCopy}><span className={styles.missionLabel}>{task.done ? '집행 완료' : current?.id === task.id ? '지금 실행하는 일' : '필수 과업'}</span><h3>{task.title}</h3>{!task.done && task.nextAction && <p><span>첫 행동</span> {task.nextAction}</p>}<div className={styles.missionActions}>{!task.done && <><ActionButton icon={current?.id === task.id ? 'pause' : 'play'} label={current?.id === task.id ? '잠시 멈추기' : '시작하기'} onClick={() => change({ ...journal, activeId: current?.id === task.id ? null : task.id }, current?.id === task.id ? '실행을 잠시 멈췄습니다.' : '실행할 과업을 선택했습니다.', current?.id === task.id ? '잠깐의 쉼도 계획이다.' : `좋다. ${task.nextAction || '첫 행동 하나에만 집중하자.'}`)} /><ActionButton icon="calendar" label="일정 조정" onClick={() => setEditor({ kind: 'move', task })} /></>}<ActionButton icon="edit" label="수정" onClick={() => setEditor({ kind: 'task', task })} /></div></div>{task.done && <span className={styles.stamp}>DONE</span>}</li>)}</ul>{todayTasks.length === 0 && <p className={styles.empty}>아직 등록한 과업이 없습니다. 작은 일 하나부터 골라보세요.</p>}
      {postponed.length > 0 && <div className={styles.postponed}><h3>다시 배치한 과업 <span>{postponed.length}</span></h3>{postponed.map(task => <p key={task.id}><span>{task.title}<small>{task.date} · {task.reason}</small></span><ActionButton icon="undo" label="오늘로" onClick={() => change({ ...journal, tasks: journal.tasks.map(item => item.id === task.id ? { ...item, date: sampleDay, reason: undefined } : item) }, '과업을 오늘로 되돌렸습니다.', '오늘 목록에 다시 올렸다.')} /></p>)}</div>}
      <div className={styles.panelFoot}>진행률에는 필수 과업만 포함됩니다. 일정 변경은 완료로 계산하지 않습니다.</div></section>
      <section className={styles.routinePanel} aria-labelledby="routine-title"><div className={styles.panelHeading}><div><span className={styles.overline}>02 / LITTLE RITUALS</span><h2 id="routine-title">나를 위한 작은 실천</h2><p>안 해도 벌점은 없다. 하면 좋은 하루의 덤.</p></div><span className={styles.routineCount}>{practiced} / {routines.length}</span></div><ul>{routines.map(routine => {
        const key = `${routine.id}:${sampleDay}`
        const checked = !!journal.records[key]
        return <li className={styles.routineRow} key={routine.id}>
          <span className={styles.ritualIcon} aria-hidden="true">{routine.id === 'exercise' ? '↗' : routine.id === 'meal' ? '◒' : '✎'}</span>
          <span className={styles.routineCopy}>{routine.title}<small>{routine.detail}</small></span>
          <ActionButton icon={checked ? 'check' : 'plus'} label={`${routine.title} 실천`} aria-pressed={checked} onClick={() => change({ ...journal, records: { ...journal.records, [key]: !checked } }, '루틴 실천을 변경했습니다.', checked ? '기록을 바로잡았다.' : '좋은 실천 하나. 조용히 기록해 두지.')} />
        </li>
      })}</ul><Link to="/execution-tracker/records">28일의 실천 기록 보기 <Icon name="arrow" /></Link></section>
      </>}
    </div><aside className={styles.sideColumn}>
      <section className={styles.observation}><span className={styles.overline}>FIELD NOTES / 오늘의 관찰</span><h2>오늘의 나를 읽는 법</h2><div className={styles.metrics}><div><strong>{progress.done}</strong><span>끝낸 과업</span></div><div><strong>{progress.remaining}</strong><span>남은 과업</span></div><div><strong>{postponed.length}</strong><span>일정 조정</span></div></div><p>{current ? `지금은 ‘${current.title}’에 집중하고 있습니다.` : progress.remaining ? '남은 과업이 크다면, 완료 기준보다 첫 행동을 작게 적어보세요.' : '남은 과업이 없습니다. 오늘 무엇이 도움이 됐는지 돌아보세요.'}</p><span className={styles.observationNote}>이 화면에서 확인한 사실만 보여줍니다.</span></section>
      <section className={styles.closePanel}><span className={styles.overline}>03 / CALL IT A DAY</span><span className={styles.moon} aria-hidden="true">☾</span><h2>잘 끝내는 연습도<br />필요하니까.</h2><p>일이 남아 있어도 하루를 마칠 수 있습니다. 남은 일과 내일의 첫 행동을 정리해 보세요.</p><ActionButton icon="moon" label={journal.closed ? '오늘의 마감 완료' : '하루 마감하기'} disabled={journal.closed} onClick={() => setEditor({ kind: 'close' })} /><small>전체 완료와 하루 마감은 서로 다릅니다.</small></section>
    </aside></div>
    {undo && <div className={styles.undo} role="status"><span>{undo.message}</span><ActionButton icon="undo" label="되돌리기" onClick={() => { setJournal(undo.previous); setLine('직전 기록을 되돌렸다. 다시 선택해도 좋다.'); setUndo(null) }} /><ActionButton icon="close" label="알림 닫기" onClick={() => setUndo(null)} /></div>}
    {editor && <Dialog title={editor.kind === 'task' ? editor.task ? '과업 수정' : '작은 과업 하나 등록' : editor.kind === 'move' ? '과업을 다시 배치하기' : '오늘의 집행은 여기까지'} close={() => setEditor(null)}>
      {editor.kind === 'task' ? <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get('title') ?? '').trim(); if (!title) return; const nextAction = String(form.get('nextAction') ?? '').trim(); const task = editor.task; change({ ...journal, tasks: task ? journal.tasks.map(item => item.id === task.id ? { ...item, title, nextAction } : item) : [...journal.tasks, { id: crypto.randomUUID(), title, nextAction, date: sampleDay, originalDate: sampleDay, done: false }] }, task ? '과업을 수정했습니다.' : '새 과업을 등록했습니다.', '목록에 반영했다. 첫 행동이 보이면 시작하기 쉽지.'); setEditor(null) }}><p>할 일은 짧게, 첫 행동은 더 작게 적어보세요.</p><label>과업 이름<input name="title" required pattern=".*\S.*" maxLength={100} defaultValue={editor.task?.title} placeholder="예: 기획안 초안 작성" /></label><label>첫 행동 <span>선택</span><input name="nextAction" maxLength={160} defaultValue={editor.task?.nextAction} placeholder="예: 문서를 열고 목차 세 가지 적기" /></label><div className={styles.formActions}>{editor.task && <ActionButton icon="trash" label="과업 삭제" tone="danger" onClick={() => { const task = editor.task!; change({ ...journal, activeId: journal.activeId === task.id ? null : journal.activeId, tasks: journal.tasks.filter(item => item.id !== task.id) }, '과업을 삭제했습니다.', '목록을 정리했다. 중요한 일에 자리를 내주자.'); setEditor(null) }} />}<ActionButton icon="check" label={editor.task ? '수정 반영' : '과업 등록'} tone="primary" type="submit" /></div></form> : editor.kind === 'move' ? <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); const date = String(form.get('date')); const task = editor.task; change({ ...journal, activeId: journal.activeId === task.id ? null : journal.activeId, tasks: journal.tasks.map(item => item.id === task.id ? { ...item, date, reason: String(form.get('reason')) } : item) }, '과업의 일정을 조정했습니다.', '계획이 바뀌었군. 다음 실행 날짜를 표시해 두었다.'); setEditor(null) }}><p>‘{editor.task.title}’의 원래 날짜는 유지합니다. 일정 변경은 실패나 완료로 계산하지 않습니다.</p><label>다시 실행할 날짜<input type="date" name="date" min={shiftDay(sampleDay, 1)} defaultValue={shiftDay(sampleDay, 1)} required /></label><label>일정 변경 이유<select name="reason"><option>시간이 부족했음</option><option>과업을 더 나눌 필요가 있음</option><option>우선순위가 달라짐</option><option>쉬어갈 필요가 있음</option></select></label><ActionButton icon="calendar" label="일정 조정" type="submit" /></form> : <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); change({ ...journal, activeId: null, closed: true, reflection: String(form.get('reflection')).trim(), tomorrow: String(form.get('tomorrow')).trim() }, '하루를 마감했습니다.', '오늘의 집행은 여기까지. 잘 쉬는 것도 임무다.'); setEditor(null) }}><p>완료 {progress.done}개, 남은 과업 {progress.remaining}개. 미완료 과업은 그대로 남겨 두고 오늘을 정리합니다.</p><label>오늘 알게 된 것 <span>선택</span><textarea name="reflection" rows={3} maxLength={500} defaultValue={journal.reflection} placeholder="무엇이 도움이 됐고, 어디에서 막혔나요?" /></label><label>내일의 첫 행동 <span>선택</span><input name="tomorrow" maxLength={160} defaultValue={journal.tomorrow} placeholder="예: 아침에 목차부터 다시 보기" /></label><p className={styles.small}>체험 모드입니다. 회고는 서버에 저장되지 않습니다.</p><ActionButton icon="check" label="하루 마감 완료" tone="primary" type="submit" /></form>}
    </Dialog>}
  </div>
}
