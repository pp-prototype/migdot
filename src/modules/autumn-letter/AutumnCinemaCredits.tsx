import { cinemaScreen } from './cinemaRoom'
import { sceneHeight, sceneWidth } from './scene'
import { cinemaCreditsText } from './text'

export default function AutumnCinemaCredits() {
  return <div className="autumn-cinema-screen" lang="yue-Hant" aria-label={cinemaCreditsText.title} role="region" tabIndex={0}
    style={{
      left: `${cinemaScreen.x / sceneWidth * 100}%`,
      top: `${cinemaScreen.y / sceneHeight * 100}%`,
      width: `${cinemaScreen.width / sceneWidth * 100}%`,
      height: `${cinemaScreen.height / sceneHeight * 100}%`,
    }}>
    <div className="autumn-cinema-credits">
      <p>{cinemaCreditsText.title}</p>
      {cinemaCreditsText.lines.map((line, index) => <p key={index}>{line}</p>)}
    </div>
  </div>
}
