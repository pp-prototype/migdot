import { useRef, useState } from 'react'
import { clearAutumnProgress } from './progress'

export default function AutumnSettings() {
  const settings = useRef<HTMLDialogElement>(null)
  const confirmation = useRef<HTMLDialogElement>(null)
  const [resetFailed, setResetFailed] = useState(false)

  function confirmReset() {
    setResetFailed(false)
    confirmation.current?.showModal()
  }

  function resetGame() {
    try {
      clearAutumnProgress()
    } catch {
      setResetFailed(true)
      return
    }
    window.location.reload()
  }

  return <>
    <button className="autumn-settings-toggle" type="button" aria-label="게임 설정" aria-haspopup="dialog"
      onClick={() => settings.current?.showModal()}>
      <span aria-hidden="true">⚙︎</span>
    </button>
    <dialog ref={settings} className="autumn-settings-dialog" aria-labelledby="autumn-settings-title">
      <h2 id="autumn-settings-title">게임 설정</h2>
      <div className="autumn-settings-actions">
        <form method="dialog"><button>닫기</button></form>
        <button type="button" className="autumn-settings-reset" onClick={confirmReset}>게임 초기화</button>
      </div>
    </dialog>
    <dialog ref={confirmation} className="autumn-settings-dialog" role="alertdialog"
      aria-labelledby="autumn-reset-title" aria-describedby="autumn-reset-warning">
      <h2 id="autumn-reset-title">게임 초기화</h2>
      <p id="autumn-reset-warning">지금까지 플레이한 내용이 모두 지워집니다. 게임을 초기화할까요?</p>
      {resetFailed && <p role="alert">저장된 진행을 지우지 못했습니다. 다시 시도해 주세요.</p>}
      <div className="autumn-settings-actions">
        <form method="dialog"><button>아니요</button></form>
        <button type="button" className="autumn-settings-reset" onClick={resetGame}>예</button>
      </div>
    </dialog>
  </>
}
