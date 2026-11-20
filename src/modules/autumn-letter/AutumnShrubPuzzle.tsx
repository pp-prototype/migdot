import { useState } from 'react'
import type { RefObject } from 'react'
import AutumnNoodleStopper from './AutumnNoodleStopper'
import { noodleStopperId } from './clues'
import { sceneHeight, sceneWidth, shrubPuzzlePiles, shrubPuzzleTree } from './scene'

const droppedId = 'shrub-tree-stopper-dropped'

function position(x: number, y: number) {
  return { left: `${x / sceneWidth * 100}%`, top: `${y / sceneHeight * 100}%` }
}

export default function AutumnShrubPuzzle({ tree, discoveries, discover }: {
  tree: RefObject<HTMLCanvasElement | null>
  discoveries: string[]
  discover: (id: string) => void
}) {
  const acquired = discoveries.includes(noodleStopperId)
  const dropped = discoveries.includes(droppedId)
  const treeReady = !dropped && !acquired && shrubPuzzlePiles.every(({ id }) => discoveries.includes(id))
  const [rustled, setRustled] = useState<string[]>([])

  return <>
    <canvas ref={tree} width={sceneWidth * 2} height={sceneHeight * 2}
      className={`autumn-landscape autumn-shrub-tree ${treeReady ? 'autumn-shrub-tree-ready' : ''}`}
      aria-hidden="true" style={{ transformOrigin: `${shrubPuzzleTree.x / sceneWidth * 100}% ${shrubPuzzleTree.y / sceneHeight * 100}%` }} />
    {shrubPuzzlePiles.map(({ id, x, y, width }, index) => {
      const touched = discoveries.includes(id)
      return <button key={id} type="button" className="autumn-shrub-touch"
        style={{ ...position(x, y), width: `${width * 2 / sceneWidth * 100}%` }}
        aria-label={`길가 덤불 ${index + 1} 건드리기`} disabled={touched || acquired}
        onClick={() => {
          setRustled(current => [...current, id])
          discover(id)
        }}>
        {rustled.includes(id) && <span className="autumn-shrub-rustled" aria-hidden="true" />}
      </button>
    })}
    {treeReady && <button type="button" className="autumn-shrub-tree-touch"
      style={position(shrubPuzzleTree.x, shrubPuzzleTree.y - 65)}
      aria-label="흔들리는 큰 나무 건드리기" onClick={() => discover(droppedId)} />}
    {dropped && !acquired && <button type="button" className="autumn-noodle-stopper-pickup"
      style={position(shrubPuzzleTree.x - 2, shrubPuzzleTree.y - 2)}
      aria-label="흰 햄스터 도자기 누들 스토퍼 줍기" onClick={() => discover(noodleStopperId)}>
      <AutumnNoodleStopper />
    </button>}
  </>
}
