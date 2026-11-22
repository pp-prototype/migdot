import { shrubsText } from './text'
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
        aria-label={shrubsText.touch(index + 1)} disabled={touched || acquired}
        onClick={() => {
          setRustled(current => [...current, id])
          discover(id)
        }}>
        {rustled.includes(id) && <span className="autumn-shrub-rustled" aria-hidden="true" />}
      </button>
    })}
    {treeReady && <button type="button" className="autumn-shrub-tree-touch"
      style={position(shrubPuzzleTree.x, shrubPuzzleTree.y - 65)}
      aria-label={shrubsText.shakeTree} onClick={() => discover(droppedId)} />}
    {dropped && !acquired && <button type="button" className="autumn-noodle-stopper-pickup"
      style={position(shrubPuzzleTree.x - 2, shrubPuzzleTree.y - 2)}
      aria-label={shrubsText.takeStopper} onClick={() => discover(noodleStopperId)}>
      <AutumnNoodleStopper />
    </button>}
  </>
}
