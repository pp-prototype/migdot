import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react'
import Sentences from './Sentences'
import { Icon } from '../../shared/Icon'
import { useAuth } from '../../shared/auth/context'
import { compareTranslation, empty, gapPositions, gradeCard, latestReviews, loadWorkspace, classifyWords, removeWord, saveWorkspace, shuffledCardIds, studyCards, wordKey, WorkspaceConflict, type Card, type Snapshot, type Word, type WordCells, type Workspace } from './workspace'
import styles from './stilla.module.css'

type View = 'review' | 'words' | 'capture' | 'sentences'
type Commit = (workspace: Workspace) => Promise<boolean>

export default function StillaPage() {
  const { user, status } = useAuth()
  if (status === 'preview') return <Stilla preview />
  return user && <Stilla key={user.id} owner={user.id} />
}

function Stilla({ owner, preview }: { owner?: string; preview?: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(preview ? empty : null)
  const [view, setView] = useState<View>('review')
  const [selected, setSelected] = useState('')
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    if (!owner) return
    let active = true
    void loadWorkspace(owner).then(result => {
      if (active) setSnapshot(result)
    }).catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [owner, attempt])

  useEffect(() => {
    function updateTime() { setNow(Date.now()) }
    const timer = window.setInterval(updateTime, 15_000)
    window.addEventListener('focus', updateTime)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', updateTime) }
  }, [])

  const commit: Commit = async workspace => {
    if (!snapshot || inFlight.current) return false
    inFlight.current = true
    setBusy(true)
    setMessage('')
    try {
      setSnapshot(owner ? await saveWorkspace(owner, workspace, snapshot.revision) : { workspace, revision: null })
      setNow(Date.now())
      return true
    } catch (error) {
      if (error instanceof WorkspaceConflict) setSnapshot(error.snapshot)
      setMessage(error instanceof WorkspaceConflict ? error.message : '저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.')
      return false
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const workspace = snapshot?.workspace
  const word = workspace?.words.find(item => item.id === selected)
  const latest = workspace ? latestReviews(workspace) : new Map()
  const cards = workspace ? studyCards(workspace) : []
  const due = cards.filter(card => (latest.get(card.id)?.due ?? 0) <= now)
  const pending = workspace?.session?.cards.slice(workspace.session.cursor) ?? []
  const current = pending.map(id => cards.find(card => card.id === id)).find(Boolean)
  const position = current ? (workspace?.session?.cards.indexOf(current.id) ?? 0) : 0
  const blank = !workspace?.words.length && !workspace?.examples.length
  const unfinished = workspace?.words.filter(item => !item.meaning).length ?? 0

  function open(next: View) { setView(next); setMessage('') }
  function openWord(id: string) { setSelected(id); open('words') }

  return <div className={styles.app}>
    <header className={styles.header}>
      <div className={styles.brand}><span><Icon name="stilla" /></span><div><h1>스틸라</h1><p lang="en">Stilla</p></div></div>
      {workspace && <nav className={styles.tabs} aria-label="스틸라 메뉴">
        <button type="button" disabled={busy} aria-current={view === 'review' ? 'page' : undefined} onClick={() => open('review')}>복습</button>
        <button type="button" disabled={busy} aria-current={view === 'words' ? 'page' : undefined} onClick={() => open('words')}>단어장</button>
        <button type="button" disabled={busy} aria-current={view === 'sentences' ? 'page' : undefined} onClick={() => open('sentences')}>문장</button>
        <button type="button" disabled={busy} className={styles.primary} aria-current={view === 'capture' ? 'page' : undefined} onClick={() => open('capture')}><Icon name="plus" /> 단어 담기</button>
      </nav>}
    </header>
    {preview && <p className={styles.notice}>로컬 체험 중입니다. 새로고침하면 기록이 초기화됩니다.</p>}
    {message && <p className={styles.error} role="alert">{message}</p>}
    {busy && <p className={styles.notice} role="status">저장 중…</p>}
    {!workspace && (loadError ? <section className={styles.panel}><p role="alert">기록을 불러오지 못했습니다.</p><button onClick={() => { setLoadError(false); setAttempt(attempt + 1) }}>다시 불러오기</button></section> : <p role="status">스틸라 기록을 불러오는 중…</p>)}
    {workspace && <>
      <div hidden={view !== 'sentences'}><Sentences workspace={workspace} busy={busy} commit={commit} openWord={openWord} /></div>
      <div hidden={view !== 'capture'}><Capture workspace={workspace} busy={busy} commit={commit} onSaved={openWord} /></div>
      {view === 'review' && (current && workspace.session ? <ReviewCard key={current.id} card={current} busy={busy}
        position={position + 1} total={workspace.session.cards.length}
        grade={grade => commit(gradeCard(workspace, current.id, position, grade))} /> : <>
        <section className={styles.hero}>
          <div className={styles.ripples} aria-hidden="true"><i /><i /><i /><Icon name="stilla" /></div>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>오늘의 복습</p>
            <h2>{blank ? '내가 만난 말을\n한 방울씩.' : due.length ? `복습할 카드 ${due.length}장` : cards.length ? '지금 복습할 카드가 없어요.' : '뜻이나 해석을 담아보세요.'}</h2>
            <p>{blank ? '기억하고 싶은 단어부터 담아보세요.' : due.length ? '단어 뜻이나 문장 해석을 떠올려 보세요.' : unfinished ? `뜻을 채울 단어가 ${unfinished}개 있어요.` : '오늘 만난 표현을 또 담아보세요.'}</p>
            {due.length > 0
              ? <button className={styles.primary} disabled={busy} onClick={() => void commit({ ...workspace, session: { cards: due.slice(0, 5).map(card => card.id), cursor: 0 } })}>{Math.min(5, due.length)}장 복습하기 <Icon name="arrow" /></button>
              : <button className={styles.primary} disabled={busy} onClick={() => open(unfinished ? 'words' : workspace.examples.length ? 'sentences' : 'capture')}>{unfinished ? '단어장 열기' : workspace.examples.length ? '문장 열기' : workspace.words.length ? '단어 담기' : '첫 단어 담기'} <Icon name="arrow" /></button>}
            {cards.length > 0 && <button disabled={busy} onClick={() => void commit({
              ...workspace, session: { cards: shuffledCardIds(cards, 5), cursor: 0 },
            })}>무작위로 공부하기</button>}
          </div>
        </section>
        {workspace.words.length > 0 && <section className={styles.recent}>
          <div className={styles.sectionLine}><h2>최근에 담은 말</h2><button disabled={busy} onClick={() => open('words')}>단어장 보기 <Icon name="arrow" /></button></div>
          {workspace.words.slice(-4).reverse().map(item => <button className={styles.wordRow} disabled={busy} key={item.id} onClick={() => openWord(item.id)}><strong>{item.text}</strong><span>{item.meaning || '뜻 미정리'}</span><Icon name="arrow" /></button>)}
        </section>}
      </>)}
      {view === 'words' && <section className={styles.library}>
        <WordList workspace={workspace} selected={selected} select={setSelected} busy={busy} onAdd={() => open('capture')} />
        {word && <WordDetail key={word.id} word={word} workspace={workspace} busy={busy} commit={commit} onDeleted={() => setSelected('')} />}
      </section>}
    </>}
  </div>
}

function Capture({ workspace, busy, commit, onSaved }: { workspace: Workspace; busy: boolean; commit: Commit; onSaved: (id: string) => void }) {
  const [cells, setCells] = useState<WordCells[]>([['', '']])
  const [pasteError, setPasteError] = useState('')
  const [language, setLanguage] = useState('영어')
  const rows = classifyWords(cells, language, workspace.words)
  const fresh = rows.filter(row => row.state === 'new')
  const duplicates = rows.filter(row => row.state === 'duplicate').length
  const invalid = rows.some(row => row.state === 'invalid')

  function updateCells(rowIndex: number, column: 0 | 1, values: string[][]) {
    setPasteError('')
    setCells(previous => {
      const next: WordCells[] = previous.map(([text, meaning]) => [text, meaning])
      values.forEach((row, offset) => {
        const index = rowIndex + offset
        const entry = next[index] ?? ['', '']
        for (const [cell, value] of row.entries()) entry[column + cell] = value
        next[index] = entry
      })
      if (next.at(-1)?.some(value => value.trim())) next.push(['', ''])
      return next
    })
  }

  function paste(event: ClipboardEvent<HTMLInputElement>, row: number, column: 0 | 1) {
    const text = event.clipboardData.getData('text/plain')
    if (!/[\t\r\n]/.test(text)) return
    event.preventDefault()
    const lines = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
    const values = lines.map(line => line.split('\t'))
    if (values.some(value => value.length > 2 - column)) {
      setPasteError('붙여넣을 열이 표의 범위를 벗어나요. 단어와 뜻을 함께 붙여넣을 때는 단어 셀에서 시작해 주세요.')
      return
    }
    updateCells(row, column, values)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!language.trim() || !fresh.length || invalid) return
    const words = fresh.map(row => ({ id: crypto.randomUUID(), language: language.trim(), text: row.text, meaning: row.meaning }))
    if (await commit({ ...workspace, words: [...workspace.words, ...words] })) {
      setCells([['', '']])
      setPasteError('')
      onSaved(words[0].id)
    }
  }

  return <section className={styles.panel}>
    <h2>단어 담기</h2>
    <form className={styles.form} onSubmit={save}>
      <label>학습 언어<input value={language} onChange={event => setLanguage(event.target.value)} required maxLength={40} disabled={busy} /></label>
      <p className={styles.muted} id="stilla-capture-help">Tab으로 다음 칸에 이동해요. 스프레드시트에서 단어와 뜻을 복사해 붙여넣을 수도 있어요.</p>
      <table className={styles.captureTable} aria-label="담을 단어" aria-describedby="stilla-capture-help">
        <thead><tr><th scope="col"><span aria-label="행 번호">#</span></th><th scope="col">단어</th><th scope="col">뜻 <small>(선택)</small></th></tr></thead>
        <tbody>{cells.map((row, index) => <tr key={index}>
          <th scope="row">{index + 1}</th>
          {([0, 1] as const).map(column => <td key={column}><input
            aria-label={`${index + 1}행 ${column === 0 ? '단어' : '뜻'}`}
            aria-invalid={column === 0 && rows[index].state === 'invalid' ? true : undefined}
            value={row[column]} disabled={busy}
            onChange={event => updateCells(index, column, [[event.target.value]])}
            onPaste={event => paste(event, index, column)}
          /></td>)}
        </tr>)}</tbody>
      </table>
      {pasteError && <p className={styles.error} role="alert">{pasteError}</p>}
      {invalid && <p className={styles.error}>뜻만 입력된 행에 단어를 적어 주세요.</p>}
      {rows.some(row => row.state !== 'empty') && <p className={styles.muted} role="status">새 단어 {fresh.length}개 · 중복 {duplicates}개</p>}
      <button className={styles.primary} disabled={busy || !language.trim() || !fresh.length || invalid}><Icon name="stilla" />{fresh.length ? `${fresh.length}개 담기` : '저장하기'}</button>
    </form>
  </section>
}

function WordList({ workspace, selected, select, busy, onAdd }: { workspace: Workspace; selected: string; select: (id: string) => void; busy: boolean; onAdd: () => void }) {
  const [query, setQuery] = useState('')
  const found = workspace.words.filter(word => `${word.text} ${word.meaning} ${word.language}`.toLowerCase().includes(query.trim().toLowerCase())).reverse()
  return <section className={styles.panel} aria-label="단어 목록">
    <div className={styles.sectionLine}><h2>단어장</h2><span className={styles.muted}>{workspace.words.length}개</span></div>
    {workspace.words.length ? <>
      <label className={styles.search}><Icon name="search" /><input type="search" aria-label="단어 검색" placeholder="단어, 뜻, 언어 검색" value={query} onChange={event => setQuery(event.target.value)} /></label>
      {found.map(word => <button className={styles.wordRow} aria-pressed={word.id === selected} type="button" key={word.id} disabled={busy} onClick={() => select(word.id)}><strong>{word.text}</strong><span>{word.meaning || '뜻 미정리'}</span><Icon name="arrow" /></button>)}
      {!found.length && <p role="status">일치하는 단어가 없어요.</p>}
    </> : <><p>아직 담은 단어가 없어요.</p><button className={styles.primary} onClick={onAdd}>첫 단어 담기</button></>}
  </section>
}

function WordDetail({ word, workspace, busy, commit, onDeleted }: { word: Word; workspace: Workspace; busy: boolean; commit: Commit; onDeleted: () => void }) {
  const [draft, setDraft] = useState<Word | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exampleId, setExampleId] = useState('')
  const [text, setText] = useState('')
  const [translation, setTranslation] = useState('')
  const [gap, setGap] = useState('')
  const [occurrence, setOccurrence] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const linked = workspace.connections.filter(item => item.wordId === word.id)
  const available = workspace.examples.filter(example => linked.every(item => item.exampleId !== example.id))
  const existing = available.find(example => example.id === exampleId)
  const sentence = existing?.text ?? text.trim()
  const positions = gapPositions(sentence, gap.trim())
  const gapStart = positions[occurrence] ?? positions[0] ?? -1
  const invalid = Boolean(gap.trim() && gapStart === -1)
  const last = latestReviews(workspace).get(word.id)

  const edited = draft && { ...draft, text: draft.text.trim(), language: draft.language.trim(), meaning: draft.meaning.trim() }
  const duplicate = edited && workspace.words.some(other => other.id !== word.id
    && wordKey(other.language, other.text) === wordKey(edited.language, edited.text))

  async function saveWord(event: FormEvent) {
    event.preventDefault()
    if (!edited?.text || !edited.language || duplicate) return
    if (await commit({ ...workspace, words: workspace.words.map(item => item.id === word.id ? edited : item) })) {
      setDraft(null)
      heading.current?.focus()
    }
  }

  async function deleteWord() {
    if (await commit(removeWord(workspace, word.id))) onDeleted()
  }

  async function saveExample(event: FormEvent) {
    event.preventDefault()
    if (!sentence || invalid) return
    const example = existing ?? { id: crypto.randomUUID(), text: sentence, translation: translation.trim() }
    const connection = { id: crypto.randomUUID(), wordId: word.id, exampleId: example.id, gap: gap.trim(), gapStart }
    if (await commit({ ...workspace, examples: existing ? workspace.examples : [...workspace.examples, example], connections: [...workspace.connections, connection] })) {
      setText(''); setTranslation(''); setGap(''); setExampleId(''); setOccurrence(0)
    }
  }

  return <section className={styles.panel}>
    <p className={styles.eyebrow}>{word.language}</p>
    <h2 className={styles.expression} ref={heading} tabIndex={-1}>{word.text}</h2>
    <p className={styles.muted}>예문 {linked.length}개{last && ` · 지난 뜻 복습: ${last.grade === 'remembered' ? '기억함' : '다시'}`}</p>
    {!draft && <p>{word.meaning || '뜻 미정리'}</p>}
    {draft ? <form className={styles.form} onSubmit={saveWord}>
      <label>단어<input autoFocus value={draft.text} onChange={event => setDraft({ ...draft, text: event.target.value })} required disabled={busy} /></label>
      <label>학습 언어<input value={draft.language} onChange={event => setDraft({ ...draft, language: event.target.value })} required maxLength={40} disabled={busy} /></label>
      <label>뜻 (선택)<input value={draft.meaning} onChange={event => setDraft({ ...draft, meaning: event.target.value })} disabled={busy} /></label>
      {duplicate && <p className={styles.error} role="status">같은 언어에 이미 등록된 단어예요.</p>}
      <div className={styles.grades}>
        <button className={styles.primary} disabled={busy || !edited?.text || !edited.language || Boolean(duplicate)}>변경 저장</button>
        <button type="button" disabled={busy} onClick={() => { setDraft(null); heading.current?.focus() }}>취소</button>
      </div>
    </form> : confirmDelete ? <div className={styles.form}>
      <p role="status">‘{word.text}’의 예문 연결과 복습 기록도 삭제됩니다. 예문 원문은 다시 연결할 수 있어요.</p>
      <div className={styles.grades}>
        <button className={styles.danger} disabled={busy} onClick={() => void deleteWord()}>단어 삭제 확인</button>
        <button disabled={busy} onClick={() => { setConfirmDelete(false); heading.current?.focus() }}>취소</button>
      </div>
    </div> : <div className={styles.grades}>
      <button disabled={busy} onClick={() => setDraft(word)}><Icon name="edit" /> 단어 수정</button>
      <button className={styles.danger} disabled={busy} onClick={() => setConfirmDelete(true)}><Icon name="trash" /> 단어 삭제</button>
    </div>}
    <div className={styles.examples}>
      <h3>연결된 예문</h3>
      {linked.length === 0 && <p className={styles.muted}>이 표현을 만난 문장을 담아보세요.</p>}
      {linked.map(link => {
        const example = workspace.examples.find(item => item.id === link.exampleId)
        return example && <blockquote key={link.id}><p>{example.text}</p>{example.translation && <p className={styles.muted}>{example.translation}</p>}{link.gap && <small>복습에서 가릴 표현 · {link.gap}</small>}</blockquote>
      })}
      <details>
        <summary>예문 연결</summary>
        <form className={styles.form} onSubmit={saveExample}>
          {available.length > 0 && <label>예문 선택<select value={exampleId} onChange={event => { setExampleId(event.target.value); setGap(''); setOccurrence(0) }} disabled={busy}>
            <option value="">새 예문 쓰기</option>{available.map(example => <option key={example.id} value={example.id}>{example.text}</option>)}
          </select></label>}
          {!existing && <><label>문장<textarea rows={3} value={text} onChange={event => { setText(event.target.value); setOccurrence(0) }} required disabled={busy} /></label>
            <label>해석 (선택)<input value={translation} onChange={event => setTranslation(event.target.value)} disabled={busy} /></label></>}
          <label>복습에서 가릴 표현 (선택)<input value={gap} onChange={event => { setGap(event.target.value); setOccurrence(0) }} placeholder={word.text} disabled={busy} /></label>
          {positions.length > 1 && <label>가릴 위치<select value={occurrence} onChange={event => setOccurrence(Number(event.target.value))} disabled={busy}>
            {positions.map((position, index) => <option key={position} value={index}>{index + 1}번째 표현</option>)}
          </select></label>}
          {invalid && <p className={styles.error}>문장에 있는 그대로 입력해 주세요.</p>}
          <button className={styles.primary} disabled={busy || !sentence || invalid}>예문 연결하기</button>
        </form>
      </details>
    </div>
  </section>
}

function ReviewCard({ card, position, total, busy, grade }: { card: Card; position: number; total: number; busy: boolean; grade: (grade: 'again' | 'remembered') => Promise<boolean> }) {
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const normalize = (value: string) => value.trim().normalize('NFC').toLowerCase()
  const translation = card.kind === '문장 해석'
  const comparison = revealed && card.kind !== '빈칸 채우기' && answer.trim() ? compareTranslation(answer, card.answer) : null
  return <section className={`${styles.panel} ${styles.review}`}>
    <p className={styles.eyebrow}>{card.kind} · {position} / {total}</p>
    <progress value={position - 1} max={total} aria-label="복습 진행" />
    <h2>{card.prompt}</h2>
    <form className={styles.form} onSubmit={event => { event.preventDefault(); setRevealed(true) }}>
      {translation ? <label>내 해석<span className={styles.translationInput}><Icon name="search" /><input
        value={answer} onChange={event => setAnswer(event.target.value)} placeholder="이 문장을 어떻게 해석했나요?" readOnly={revealed}
      /></span></label> : <label>떠올린 답<input value={answer} onChange={event => setAnswer(event.target.value)} placeholder="입력하거나 마음속으로 떠올려 보세요" readOnly={revealed} /></label>}
      {!revealed && <button className={styles.primary} type="submit">{translation && answer.trim() ? '해석 비교' : '답 보기'}</button>}
    </form>
    {revealed && <div className={styles.answer} aria-live="polite">
      {card.kind === '빈칸 채우기' && answer.trim() && <p className={styles.muted}>{normalize(answer) === normalize(card.answer) ? '기록된 답과 같아요.' : '기록된 답과 비교해 보세요.'}</p>}
      {translation && <p className={styles.eyebrow}>저장한 해석</p>}
      <h3>{card.answer}</h3>
      {comparison && <>
        <p>{comparison.exact ? '기록된 답과 같아요.' : comparison.common.length
          ? `겹치는 표현 · ${comparison.common.join(', ')}` : '같은 표기의 표현을 찾지 못했어요.'}</p>
        <p className={styles.muted}>표현을 비교한 결과예요. 의미가 같은지는 아래에서 직접 판단해 주세요.</p>
      </>}
      {card.context && <p>{card.context}</p>}
      <div className={styles.grades}><button disabled={busy} onClick={() => void grade('again')}>다시</button><button className={styles.primary} disabled={busy} onClick={() => void grade('remembered')}>기억함</button></div>
    </div>}
  </section>
}
