import { useState, type FormEvent } from 'react'
import { Icon } from '../../shared/Icon'
import { wordKey, type Connection, type Word, type Workspace } from './workspace'
import styles from './stilla.module.css'

type Props = {
  workspace: Workspace
  busy: boolean
  commit: (workspace: Workspace) => Promise<boolean>
  openWord: (id: string) => void
}

type DraftWord = Pick<Word, 'text' | 'meaning'>

export default function Sentences({ workspace, busy, commit, openWord }: Props) {
  const [language, setLanguage] = useState('영어')
  const [text, setText] = useState('')
  const [translation, setTranslation] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [added, setAdded] = useState<DraftWord[]>([])
  const [newText, setNewText] = useState('')
  const [newMeaning, setNewMeaning] = useState('')
  const [saved, setSaved] = useState(false)
  const languageKey = wordKey(language, '')
  const languageWords = workspace.words.filter(word => wordKey(word.language, '') === languageKey)
  const search = query.trim().normalize('NFC').toLowerCase()
  const found = languageWords.filter(word => [word.text, word.meaning].some(value => value.normalize('NFC').toLowerCase().includes(search)))
  const matchingWord = newText.trim() && languageWords.find(word => wordKey(language, newText) === wordKey(language, word.text))
  const repeatedDraft = added.some(word => wordKey(language, newText) === wordKey(language, word.text))
  const pendingWord = Boolean(newText.trim() || newMeaning.trim())

  function toggle(id: string, checked: boolean) {
    setSelected(current => checked ? [...new Set([...current, id])] : current.filter(item => item !== id))
    setSaved(false)
  }

  function addWord() {
    if (!newText.trim() || repeatedDraft) return
    if (matchingWord) toggle(matchingWord.id, true)
    else setAdded(current => [...current, { text: newText.trim(), meaning: newMeaning.trim() }])
    setNewText('')
    setNewMeaning('')
    setSaved(false)
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!language.trim() || !text.trim() || pendingWord) return
    const existing = new Map(languageWords.map(word => [wordKey(language, word.text), word]))
    const wordIds = new Set(selected.filter(id => languageWords.some(word => word.id === id)))
    const newWords: Word[] = []
    for (const draft of added) {
      const match = existing.get(wordKey(language, draft.text))
      const word = match ?? { ...draft, id: crypto.randomUUID(), language: language.trim() }
      wordIds.add(word.id)
      if (!match) newWords.push(word)
    }
    const example = { id: crypto.randomUUID(), language: language.trim(), text: text.trim(), translation: translation.trim() }
    const connections: Connection[] = [...wordIds].map(wordId => ({
      id: crypto.randomUUID(), wordId, exampleId: example.id, gap: '', gapStart: -1,
    }))
    if (await commit({
      ...workspace,
      words: [...workspace.words, ...newWords],
      examples: [...workspace.examples, example],
      connections: [...workspace.connections, ...connections],
    })) {
      setText('')
      setTranslation('')
      setQuery('')
      setSelected([])
      setAdded([])
      setSaved(true)
    }
  }

  return <>
    <section className={styles.panel}>
      <h2>문장 담기</h2>
      <form className={styles.form} onSubmit={save}>
        <label>문장의 언어<input required maxLength={40} value={language} disabled={busy} onChange={event => {
          setLanguage(event.target.value)
          setSelected([])
          setSaved(false)
        }} /></label>
        <label>문장 원문<textarea rows={3} required value={text} disabled={busy} onChange={event => { setText(event.target.value); setSaved(false) }} /></label>
        <label>내가 적은 해석<textarea rows={3} value={translation} disabled={busy} onChange={event => setTranslation(event.target.value)} aria-describedby="stilla-translation-help" /></label>
        <p id="stilla-translation-help" className={styles.muted}>해석을 남기면 무작위 공부에서 문장 해석 문제로 나와요.</p>
        <fieldset className={styles.sentenceWords} disabled={busy}>
          <legend>관련 단어 고르기</legend>
          <label>단어장에서 찾기<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
          {found.length === 0 && <p className={styles.muted}>이 언어의 단어장에 일치하는 단어가 없어요.</p>}
          <div className={styles.wordChoices}>{found.map(word => <label key={word.id}>
            <input type="checkbox" checked={selected.includes(word.id)} onChange={event => toggle(word.id, event.target.checked)} />
            <span>{word.text}{word.meaning && <small> · {word.meaning}</small>}</span>
          </label>)}</div>
          {selected.length > 0 && <p className={styles.muted} role="status">기존 단어 {selected.length}개 연결 예정</p>}
          <details>
            <summary>단어장에 없는 단어 추가</summary>
            <div className={styles.form}>
              <label>새 단어<input value={newText} onChange={event => setNewText(event.target.value)} /></label>
              <label>새 단어의 뜻 (선택)<input value={newMeaning} onChange={event => setNewMeaning(event.target.value)} /></label>
              {repeatedDraft && <p className={styles.muted}>이미 아래 목록에 담은 단어예요.</p>}
              <div className={styles.grades}>
                <button type="button" disabled={!newText.trim() || repeatedDraft} onClick={addWord}>{matchingWord ? '기존 단어 연결' : '새 단어 담기'}</button>
                {pendingWord && <button type="button" onClick={() => { setNewText(''); setNewMeaning('') }}>입력 지우기</button>}
              </div>
            </div>
          </details>
          {added.length > 0 && <ul className={styles.stagedWords}>{added.map((word, index) => <li key={wordKey(language, word.text)}>
            <span>{word.text}{word.meaning && ` · ${word.meaning}`}</span>
            <button type="button" aria-label={`${word.text} 연결 예정에서 빼기`} onClick={() => setAdded(current => current.filter((_, item) => item !== index))}><Icon name="close" /></button>
          </li>)}</ul>}
        </fieldset>
        {pendingWord && <p className={styles.muted}>새로 입력한 단어를 먼저 담거나 입력을 지워 주세요.</p>}
        <button className={styles.primary} disabled={busy || !language.trim() || !text.trim() || pendingWord}><Icon name="stilla" /> 문장 저장</button>
        {saved && <p role="status">문장을 저장했어요.</p>}
      </form>
    </section>
    {workspace.examples.length > 0 && <section className={styles.recent}>
      <div className={styles.sectionLine}><h2>담은 문장</h2><span className={styles.muted}>{workspace.examples.length}개</span></div>
      <div className={styles.sentenceHistory}>{[...workspace.examples].reverse().map(example => {
        const ids = new Set(workspace.connections.filter(link => link.exampleId === example.id).map(link => link.wordId))
        const words = workspace.words.filter(word => ids.has(word.id))
        return <article className={styles.panel} key={example.id}>
          {example.language && <p className={styles.eyebrow}>{example.language}</p>}
          <h3>{example.text}</h3>
          {example.translation && <p>{example.translation}</p>}
          {words.length > 0 && <div className={styles.grades}>{words.map(word => <button key={word.id} disabled={busy} onClick={() => openWord(word.id)}>{word.text}</button>)}</div>}
        </article>
      })}</div>
    </section>}
  </>
}
