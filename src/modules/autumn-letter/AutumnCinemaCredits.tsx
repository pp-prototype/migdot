import { cinemaScreen } from './cinemaRoom'
import { sceneHeight, sceneWidth } from './scene'

export default function AutumnCinemaCredits() {
  return <div className="autumn-cinema-screen" lang="yue-Hant" aria-label="片尾字幕" role="region" tabIndex={0}
    style={{
      left: `${cinemaScreen.x / sceneWidth * 100}%`,
      top: `${cinemaScreen.y / sceneHeight * 100}%`,
      width: `${cinemaScreen.width / sceneWidth * 100}%`,
      height: `${cinemaScreen.height / sceneHeight * 100}%`,
    }}>
    <div className="autumn-cinema-credits">
      <p>片尾字幕</p>
      <p>演出<br />你與我</p>
      <p>場景<br />秋夜的小戲院</p>
      <p>呢套戲嘅片名有幾多個字？</p>
      <p>音樂<br />街角的夜風</p>
      <p>多謝收睇</p>
    </div>
  </div>
}
