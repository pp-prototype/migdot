export const entryCode = '0506'

export const clues = [
  { id: 'leaf', name: '은행잎', count: 3, hint: '잎맥 끝에 작은 점을 남겨뒀어. 몇 개나 보여?' },
  { id: 'lamp', name: '가로등', count: 5, hint: '가로등이 깜빡이며 인사했어. 몇 번이었을까?' },
  { id: 'bird', name: '새', count: 2, hint: '새가 편지 위를 콩콩 걸어갔어. 발자국이 몇 개 남았을까?' },
] as const

export type Clue = typeof clues[number]
export const firstLetter = `사랑하는 희선아,
어서 와. 작은 가을 풍경으로 너를 초대해봤는데 어때, 귀엽지? ㅎㅎ
우리 같이 좀 걸어볼까?`
export const finalLetter = '찾아줘서 고마워. 이 가을을 너와 나누고 싶었어.'

export const firstLetterBack = `우리가 함께 걷지 못한 가을 한 가운데의 단풍이 물든 풍경을 영원히 볼 수 있게 담아두었어.
이 산책로에는 다른 것도 좀 숨겨두었는데, 공주가 모두 찾을 수 있으려나? ㅋㅋ`

export const secondLetter = '걸어오면서 숨겨둔 물건과 편지는 읽어보았니? 아니라면 다시 살펴봐~'
export const phoneHint = '이 산책로에서 첫 번째 숫자를 알아낼 수 있어.'

export const phoneDaytimeMessage = '따뜻한 낮의 풍경도 보여주고 싶었는데 우린 자꾸 밤에 만나니까 낙엽 흩날리는 밤의 가을 풍경만 보여줬던게 생각나.'

export const thirdLetter = `얼마 전의 호수에서 본 별이 생생해. 핸드폰을 열어 별을 찍던 네 모습은 더.
두 번째 숫자의 행방은 별이 가득한 밤하늘에 두고 왔어.`

export const skyPhotoId = 'lakeside-clear-star-photo'

export const fourthLetter = `한 밤에 강아지들과 산책하던 기억.
사랑하는 사람이 나의 것처럼 아끼고 예뻐해주는 모습에 마음이 많이 가서 그 어떤 것보다 사랑스러움을 느꼈지.`
export const fourthLetterHint = '세 번째 숫자는 우리와 함께한 것의 수.'

export const fifthLetter = '우리 만의 조용한 영화관에서 아늑한 분위기를 느끼며 보았던 그 시간은 지나가다, 잠들기전, 그냥 문득 떠오르고 좋아지는거 있지?'
export const fifthLetterHint = '2층 1관에서 네 번째 숫자를 알 수 있어.'
