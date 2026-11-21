import { settingsText } from './text'
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
    <button className="autumn-settings-toggle" type="button" aria-label={settingsText.title} aria-haspopup="dialog"
      onClick={() => settings.current?.showModal()}>
      <span aria-hidden="true">⚙︎</span>
    </button>
    <dialog ref={settings} className="autumn-settings-dialog" aria-labelledby="autumn-settings-title">
      <h2 id="autumn-settings-title">{settingsText.title}</h2>
      <div className="autumn-settings-actions">
        <form method="dialog"><button>{settingsText.close}</button></form>
        <button type="button" className="autumn-settings-reset" onClick={confirmReset}>{settingsText.reset}</button>
      </div>
    </dialog>
    <dialog ref={confirmation} className="autumn-settings-dialog" role="alertdialog"
      aria-labelledby="autumn-reset-title" aria-describedby="autumn-reset-warning">
      <h2 id="autumn-reset-title">{settingsText.reset}</h2>
      <p id="autumn-reset-warning">{settingsText.warning}</p>
      {resetFailed && <p role="alert">{settingsText.resetFailed}</p>}
      <div className="autumn-settings-actions">
        <form method="dialog"><button>{settingsText.no}</button></form>
        <button type="button" className="autumn-settings-reset" onClick={resetGame}>{settingsText.yes}</button>
      </div>
    </dialog>
  </>
}
