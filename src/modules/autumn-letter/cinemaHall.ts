import { cinemaHallText, cinemaPosters } from './text'
export function drawCinemaHall(ctx: CanvasRenderingContext2D, width: number, height: number) {
  function block(color: string | CanvasGradient, x: number, y: number, w: number, h: number) {
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  }

  function label(value: string, x: number, y: number, size: number, color: string) {
    ctx.fillStyle = color
    ctx.font = `bold ${size}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(value, x, y)
  }

  const wall = ctx.createLinearGradient(0, 0, 0, 201)
  wall.addColorStop(0, '#292333')
  wall.addColorStop(.48, '#4d3642')
  wall.addColorStop(1, '#302735')
  block(wall, 0, 0, width, height)
  const carpet = ctx.createLinearGradient(0, 194, 0, height)
  carpet.addColorStop(0, '#351e2c')
  carpet.addColorStop(1, '#583342')
  block(carpet, 0, 196, width, height - 196)
  block('#221b28', 0, 191, width, 6)
  block('#705353', 0, 191, width, 1)
  for (let y = 203; y < height; y += 5) {
    for (let x = (y % 2) * 3; x < width; x += 9) block('#c78d8d30', x, y, 2, 1)
  }
  for (const x of [38, 264, 445]) {
    const light = ctx.createRadialGradient(x, 88, 1, x, 88, 51)
    light.addColorStop(0, '#f8ae6a55')
    light.addColorStop(1, '#f8ae6a00')
    block(light, x - 51, 37, 102, 102)
    block('#45313b', x - 4, 74, 8, 20)
    block('#ffd6a1', x - 3, 73, 6, 3)
    block('#d99964', x - 2, 92, 4, 2)
  }

  // Padded auditorium double doors with push bars and narrow viewing panes.
  block('#221c28', 64, 59, 118, 137)
  block('#a57d64', 67, 61, 112, 133)
  block('#402a37', 69, 64, 108, 129)
  for (const x of [73, 124]) {
    block('#683e48', x, 67, 49, 124)
    block('#764852', x + 3, 70, 43, 116)
    block('#54323e', x + 4, 139, 41, 47)
    block('#412d39', x + 17, 80, 15, 38)
    block('#272631', x + 19, 82, 11, 34)
    block('#b07e69', x + 8, 129, 33, 5)
    block('#d4a986', x + 9, 129, 30, 1)
  }
  block('#1b1923', 100, 40, 45, 16)
  label(cinemaHallText.doorSign, 122, 52, 11, '#f7d2a0')

  // The seating diagram marks a screen, a central aisle, and six rows.
  block('#896c61', 193, 74, 59, 67)
  block('#302a38', 195, 76, 55, 63)
  label(cinemaHallText.seatingChart, 222, 87, 8, '#f0d5b2')
  block('#b6a0a4', 204, 94, 36, 2)
  for (let row = 0; row < 6; row++) {
    for (let seat = 0; seat < 8; seat++) {
      block(row === 5 ? '#a56d73' : '#d0a0a1', 201 + seat * 5 + (seat >= 4 ? 4 : 0), 101 + row * 5, 3, 3)
    }
  }

  cinemaPosters.forEach(({ title, date, auditorium }, index) => {
    const x = 267 + index * 51
    block('#241d2a', x - 2, 85, 55, 93)
    block('#9e7861', x, 87, 51, 89)
    block('#e8d2b1', x + 2, 89, 47, 85)
    const colors = [
      ['#842f3c', '#e19768', '#392c36'],
      ['#425268', '#dfd6ad', '#8496a4'],
      ['#433749', '#a77c83', '#d6a98f'],
    ][index]
    block(colors[0], x + 4, 91, 43, 48)
    if (index === 0) {
      block(colors[1], x + 8, 96, 35, 5)
      block(colors[1], x + 8, 96, 4, 39)
      block(colors[2], x + 18, 108, 8, 8)
      block(colors[2], x + 17, 117, 10, 17)
      block('#de9a89', x + 31, 112, 7, 7)
      block('#de9a89', x + 30, 120, 9, 14)
    } else if (index === 1) {
      block(colors[2], x + 12, 102, 29, 30)
      block(colors[1], x + 9, 99, 28, 31)
      for (let y = 104; y <= 123; y += 4) {
        block('#645961', x + 14, y, 2, 2)
        block('#645961', x + 19, y, 12, 1)
      }
    } else {
      block(colors[1], x + 10, 96, 31, 36)
      block(colors[0], x + 14, 100, 23, 32)
      block(colors[2], x + 25, 116, 2, 2)
      block(colors[2], x + 11, 132, 30, 2)
    }
    label(title, x + 25, 148, index === 1 ? 5.8 : 8, '#442f36')
    label(date, x + 25, 158, 7, '#69444a')
    label(auditorium, x + 25, 169, 8, '#442f36')
  })
}
