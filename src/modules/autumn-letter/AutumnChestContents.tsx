export default function AutumnChestContents({ onReadNote }: { onReadNote: () => void }) {
  return <div className="autumn-chest-interior">
    <button type="button" className="autumn-chest-note-button" aria-label="상자 속 쪽지 읽기"
      aria-haspopup="dialog" onClick={onReadNote}>
      <span className="autumn-chest-note" aria-hidden="true" />
    </button>
    <span className="autumn-chest-rings" role="img" aria-label="살짝 각진 민무늬 실버링 한 쌍">
      <i /><b />
    </span>
    <span className="autumn-chest-keyring" role="img" aria-label="쿼카 인형 키링이 달린 열쇠">
      <i /><b /><span className="autumn-chest-quokka-charm" />
    </span>
  </div>
}
