export default function AutumnChestContents({ onReadNote, onTakeKey, onTakeRings, noteAcquired, keyAcquired, ringsAcquired }: {
  onReadNote: () => void
  onTakeKey: () => void
  onTakeRings: () => void
  noteAcquired: boolean
  keyAcquired: boolean
  ringsAcquired: boolean
}) {
  return <div className="autumn-chest-interior">
    {!noteAcquired && <button type="button" className="autumn-chest-item-button autumn-chest-note-slot" aria-label="상자 속 쪽지 읽기"
      aria-haspopup="dialog" onClick={onReadNote}>
      <span className="autumn-chest-note" aria-hidden="true" />
    </button>}
    {!ringsAcquired && <button type="button" className="autumn-chest-item-button autumn-chest-rings-slot" aria-label="실버 커플링 집기" onClick={onTakeRings}>
      <span className="autumn-chest-rings" aria-hidden="true"><i /><b /></span>
    </button>}
    <div className="autumn-chest-key-slot">
      <span className="autumn-visually-hidden" role="status">
        {ringsAcquired ? '커플링을 획득했어. ' : ''}{keyAcquired ? '열쇠를 획득했어.' : ''}
      </span>
      {!keyAcquired && <button type="button" className="autumn-chest-item-button" aria-label="쿼카 키링 열쇠 집기" onClick={onTakeKey}>
        <span className="autumn-chest-keyring" aria-hidden="true">
          <i /><b /><span className="autumn-chest-quokka-charm" />
        </span>
      </button>}
    </div>
  </div>
}
