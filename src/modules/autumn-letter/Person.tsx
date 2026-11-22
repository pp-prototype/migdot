import { drawPerson } from './scene'

export default function Person() {
  return <canvas width={180} height={340} aria-hidden="true" ref={element => {
    if (element) drawPerson(element)
  }} />
}
