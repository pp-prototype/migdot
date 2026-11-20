import { useState } from 'react'
import type { RefObject } from 'react'
import { fifthLetter, fifthLetterHint } from './clues'
import flyerArt from './cinema-flyer.jpg'

export default function AutumnFlyer({ dialog }: { dialog: RefObject<HTMLDialogElement | null> }) {
  const [back, setBack] = useState(false)

  return <dialog ref={dialog} className="autumn-dialog" aria-label="영화 전단지" onClose={() => setBack(false)}>
    <div className="autumn-paper autumn-paper-flyer">
      <button className="autumn-close" type="button" aria-label="전단지 닫기"
        onClick={() => dialog.current?.close()}>×</button>
      <button type="button" className={`autumn-flyer-sheet ${back ? 'autumn-flyer-back' : 'autumn-flyer-art'}`}
        aria-label={back ? '전단지 앞면 보기' : '전단지 뒷면 보기'}
        aria-describedby={back ? 'autumn-flyer-note' : 'autumn-flyer-image'}
        onClick={() => setBack(current => !current)}>
        {back ? <span id="autumn-flyer-note" className="autumn-letter-face">
          <span className="autumn-flyer-title">다섯 번째 편지</span>
          <span>{fifthLetter}</span>
          <span className="autumn-flyer-hint">{fifthLetterHint}</span>
        </span> : <img id="autumn-flyer-image" className="autumn-letter-face"
          src={flyerArt} alt="붉은 등롱과 청록색 네온이 비치는 홍콩의 빗길을 걷는 두 사람" />}
      </button>
    </div>
  </dialog>
}
