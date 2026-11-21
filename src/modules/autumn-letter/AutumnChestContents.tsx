import { chestText } from './text'
export default function AutumnChestContents({ onReadNote, onTakeKey, onTakeRings, noteAcquired, keyAcquired, ringsAcquired }: {
  onReadNote: () => void
  onTakeKey: () => void
  onTakeRings: () => void
  noteAcquired: boolean
  keyAcquired: boolean
  ringsAcquired: boolean
}) {
  return <div className="autumn-chest-interior">
    {!noteAcquired && <button type="button" className="autumn-chest-item-button autumn-chest-note-slot" aria-label={chestText.note}
      aria-haspopup="dialog" onClick={onReadNote}>
      <span className="autumn-chest-note" aria-hidden="true" />
    </button>}
    {!ringsAcquired && <button type="button" className="autumn-chest-item-button autumn-chest-rings-slot" aria-label={chestText.takeRings} onClick={onTakeRings}>
      <span className="autumn-chest-rings" aria-hidden="true"><i /><b /></span>
    </button>}
    <div className="autumn-chest-key-slot">
      <span className="autumn-visually-hidden" role="status">
        {ringsAcquired ? chestText.ringsReceived : ''}{keyAcquired ? chestText.keyReceived : ''}
      </span>
      {!keyAcquired && <button type="button" className="autumn-chest-item-button" aria-label={chestText.takeKey} onClick={onTakeKey}>
        <span className="autumn-chest-keyring" aria-hidden="true">
          <i /><b /><span className="autumn-chest-quokka-charm" />
        </span>
      </button>}
    </div>
  </div>
}
