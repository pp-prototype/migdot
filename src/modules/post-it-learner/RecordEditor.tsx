import { useEffect, useRef, useState, type FormEvent } from 'react'
import { RecordChanged, type LearningRecords, type NoteRecord, type TopicRecord } from './records'
import { prepareImage, thumbnailUrl } from './thumbnail'
import styles from './cloud.module.css'

export type Draft =
  | { kind: 'topic'; id: string; record?: TopicRecord }
  | { kind: 'note'; id: string; topic: string; record?: NoteRecord }

export default function RecordEditor({ records, draft, cancel, done }: {
  records: LearningRecords
  draft: Draft
  cancel: () => void
  done: (message: string, newTopic?: string, deleted?: boolean) => void
}) {
  const note = draft.kind === 'note'
  const [title, setTitle] = useState(draft.kind === 'note' ? draft.record?.title ?? '' : draft.record?.name ?? '')
  const [body, setBody] = useState(draft.kind === 'note' ? draft.record?.body ?? '' : draft.record?.description ?? '')
  const [tag, setTag] = useState(draft.kind === 'note' ? draft.record?.tag ?? '' : '')
  const [image, setImage] = useState<string | null | undefined>()
  const [savedImage, setSavedImage] = useState(draft.kind === 'topic' ? draft.record?.thumbnail_jpeg : draft.record?.photo_jpeg)
  const visibleImage = image === undefined ? savedImage : image
  const imageLabel = note ? '사진' : '썸네일'
  const [processingImage, setProcessingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [version, setVersion] = useState(draft.record?.version)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState<RecordChanged | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = useRef(false)
  const active = useRef(false)
  const label = note ? '포스트잇' : '학습 주제'

  useEffect(() => {
    const node = dialog.current
    const trigger = document.activeElement
    active.current = true
    node?.showModal()
    return () => {
      active.current = false
      node?.close()
      if (trigger instanceof HTMLElement) trigger.focus()
    }
  }, [])

  async function run(action: () => Promise<void>, onSuccess: () => void) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError('')
    try {
      await action()
      if (active.current) onSuccess()
    } catch (failure) {
      if (!active.current) return
      if (failure instanceof RecordChanged) {
        setConflict(failure)
        setConfirmDelete(false)
      } else setError('요청을 완료하지 못했습니다. 입력을 유지했습니다. 연결 상태를 확인하고 다시 시도해 주세요.')
    } finally {
      busy.current = false
      if (active.current) setPending(false)
    }
  }

  async function selectImage(file: File) {
    setProcessingImage(true)
    setImageError('')
    try {
      const jpeg = await prepareImage(file, note ? 'photo' : 'cover')
      if (active.current) setImage(jpeg)
    } catch {
      if (active.current) setImageError('이미지를 불러올 수 없습니다. 10 MB 이하의 JPG, PNG, WebP 파일을 선택해 주세요.')
    } finally {
      if (active.current) setProcessingImage(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (conflict || confirmDelete || processingImage) return
    if (!title.trim() || (note && !body.trim())) {
      setError(note ? '제목과 내용을 입력해 주세요.' : '학습 주제 이름을 입력해 주세요.')
      return
    }
    const fields = note
      ? { title: title.trim(), body: body.trim(), tag: tag.trim(), ...(image !== undefined && { photo_jpeg: image }) }
      : { name: title.trim(), description: body.trim(), ...(image !== undefined && { thumbnail_jpeg: image }) }
    const topic = draft.kind === 'note' ? draft.topic : undefined
    void run(
      () => records.saveRecord({ id: draft.id, version, topic, fields }),
      () => done('저장했습니다.', !note && !draft.record ? draft.id : undefined),
    )
  }

  function deleteRecord() {
    if (draft.kind !== 'note' || !draft.record || version === undefined) return
    const record = { ...draft.record, version }
    void run(() => records.removeNote(record), () => done('포스트잇을 삭제했습니다.', undefined, true))
  }

  const latest = conflict?.latest
  const latestImage = latest && ('name' in latest ? latest.thumbnail_jpeg : latest.photo_jpeg)
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="learning-editor-title" onCancel={event => {
    event.preventDefault()
    if (!busy.current) cancel()
  }}>
    <h2 id="learning-editor-title">{label} {draft.record ? '수정' : '작성'}</h2>
    <form onSubmit={submit}>
      <label>{note ? '제목' : '이름'}<input required maxLength={note ? 120 : 100} value={title} onChange={event => setTitle(event.target.value)} disabled={pending} /></label>
      <label>{note ? '내용' : '설명 (선택)'}<textarea required={note} maxLength={note ? 10000 : 500} rows={note ? 7 : 3} value={body} onChange={event => setBody(event.target.value)} disabled={pending} /></label>
      {note && <label>태그 (선택)<input maxLength={40} value={tag} onChange={event => setTag(event.target.value)} disabled={pending} /></label>}
      <div className={styles.thumbnailField}>
        <label>{imageLabel} (선택)
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={pending || processingImage} onChange={event => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (file) void selectImage(file)
          }} />
        </label>
        {visibleImage && <>
          <img src={thumbnailUrl(visibleImage)} className={note ? styles.photoPreview : undefined} alt={`등록할 ${imageLabel} 미리보기`} />
          <button type="button" disabled={pending || processingImage} onClick={() => { setImage(null); setImageError('') }}>{imageLabel} 제거</button>
        </>}
        {processingImage && <p role="status">이미지를 준비하는 중입니다.</p>}
        {imageError && <p role="alert">{imageError}</p>}
      </div>
      {error && <p role="alert">{error}</p>}
      {conflict && <div className={styles.feedback}>
        <p role="alert">{latest ? '다른 기기에서 수정한 내용이 있습니다. 현재 저장된 내용을 확인해 주세요.' : '이 기록을 다시 불러올 수 없습니다. 입력한 내용은 이 화면에서 확인할 수 있습니다.'}</p>
        {latest && <>
          <strong>{'title' in latest ? latest.title : latest.name}</strong>
          <p className={styles.body}>{'body' in latest ? latest.body : latest.description}</p>
          {'tag' in latest && latest.tag && <p>#{latest.tag}</p>}
          {latestImage && <img className={note ? styles.photoPreview : styles.thumbnail} src={thumbnailUrl(latestImage)} alt={`현재 저장된 ${imageLabel}`} />}
          <button type="button" onClick={() => {
            setSavedImage(latestImage ?? null)
            setVersion(latest.version)
            setConflict(null)
          }}>내 입력을 유지하고 계속</button>
        </>}
      </div>}
      {confirmDelete ? <div className={styles.feedback}>
        <p>이 포스트잇을 삭제할까요?</p>
        <div className={styles.actions}>
          <button type="button" disabled={pending} onClick={() => setConfirmDelete(false)}>돌아가기</button>
          <button type="button" className={styles.danger} disabled={pending} onClick={deleteRecord}>{pending ? '삭제 중…' : '삭제 확인'}</button>
        </div>
      </div> : <div className={styles.actions}>
        {note && draft.record && <button type="button" className={styles.danger} disabled={pending || Boolean(conflict)} onClick={() => setConfirmDelete(true)}>삭제</button>}
        <button type="button" disabled={pending} onClick={cancel}>닫기</button>
        <button type="submit" className={styles.primary} disabled={pending || processingImage || Boolean(conflict)}>{pending ? '저장 중…' : '저장'}</button>
      </div>}
    </form>
  </dialog>
}
