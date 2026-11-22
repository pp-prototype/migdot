import { fifthLetter, fifthLetterHint, flyerText } from './text'
import { useState } from 'react'
import type { RefObject } from 'react'
import flyerArt from './cinema-flyer.jpg'

export default function AutumnFlyer({ dialog }: { dialog: RefObject<HTMLDialogElement | null> }) {
  const [back, setBack] = useState(false)

  return <dialog ref={dialog} className="autumn-dialog" aria-label={flyerText.title} onClose={() => setBack(false)}>
    <div className="autumn-paper autumn-paper-flyer">
      <button className="autumn-close" type="button" aria-label={flyerText.close}
        onClick={() => dialog.current?.close()}>×</button>
      <button type="button" className={`autumn-flyer-sheet ${back ? 'autumn-flyer-back' : 'autumn-flyer-art'}`}
        aria-label={back ? flyerText.front : flyerText.back}
        aria-describedby={back ? 'autumn-flyer-note' : 'autumn-flyer-image'}
        onClick={() => setBack(current => !current)}>
        {back ? <span id="autumn-flyer-note" className="autumn-letter-face">
          <span className="autumn-flyer-title">{flyerText.letterTitle}</span>
          <span>{fifthLetter}</span>
          <span className="autumn-flyer-hint">{fifthLetterHint}</span>
        </span> : <img id="autumn-flyer-image" className="autumn-letter-face"
          src={flyerArt} alt={flyerText.art} />}
      </button>
    </div>
  </dialog>
}
