export const entryCode = '0506'
export const noodleStopperId = 'white-hamster-noodle-stopper'
export const plushBoxId = 'constellation-plush-box'

export const clues = [
  { id: 'leaf', name: '은행잎', count: 3, hint: '잎맥 끝에 작은 점을 남겨뒀어. 몇 개나 보여?' },
  { id: 'lamp', name: '가로등', count: 5, hint: '가로등이 깜빡이며 인사했어. 몇 번이었을까?' },
  { id: 'bird', name: '새', count: 2, hint: '새가 편지 위를 콩콩 걸어갔어. 발자국이 몇 개 남았을까?' },
] as const

export type Clue = typeof clues[number]
export const firstLetter = `비밀 초대장을 받은 사람이여 어서와요.
당신을 초대한 이 곳은 가을의 작은 풍경이에요.
이 곳을 차분히 걸으면서 제가 만든 작은 수수께끼들을 풀어보실래요?`
export const finalLetter = `사랑하는 나의 공주 희선아, 200일을 축하해!
기념하여 내가 만든 작은 가을 산책로는 어땠니? 말만 하면서 가지 못했던 가을이 벌써 지나 겨울이 다가오니, 미안한 마음과 가을 단풍을 한가득 눈에 담아주고 싶던 내 마음으로 네게 선사해.
재밌게 즐겼기를 바라며 - 영상 -`

export const firstLetterBack = `따뜻한 해가 비추는 가을 하늘이 제법 포근하죠?
이렇게 물든 풍경을 영원히 남겨두고 싶어요. 누군가에게 두고두고 보여주고 싶은 제 마음, 느껴지시나요?`
export const firstLetterBackHint = '이 산책로에는 숨겨진 물건들도 있어요'

export const secondLetter = `걸어오면서 숨겨둔 물건과 편지도 보았나요?
아니라면 뒤로 돌아가 보는 것도 방법이에요.`
export const phoneHint = '참고로 여기에선 첫 번째 숫자를 알아낼 수 있어요.'
export const phoneNumberMessage = `첫 번째 숫자는 이 중에 있어.
공주야.`

export const phoneDaytimeMessage = `바람이 부는 낙엽을 보는 풍경은 왠지 마음이 차분히 가라앉아요.
따뜻한 낮의 풍경보다 자주 보여준 것이 이유일까요.`

export const thirdLetter = `호수에서 바라보는 별은 어째서 더 아름답게 느껴질까요.
물에 비추는 별빛이 더 빛나게 주변을 아름답게 밝혀주는 탓 일지도요.`
export const thirdLetterHint = '두 번째 숫자의 행방은 별을 완벽하게 찍은 한 장의 그림 속에 있어요.'

export const skyPhotoId = 'lakeside-clear-star-photo'

export const fourthLetter = `한 밤의 달 빛 가득한 밤에 자주하던 산책은 마음을 가득 채워주는 느낌이에요.
사랑하는 이가 나의 가까운 것을 나만큼이나 아끼고 예뻐해주는 모습에 그 어떤 것보다 사랑스러움이 느껴지죠.`
export const fourthLetterHint = '세 번째 숫자는 함께한 그것의 수.'

export const fifthLetter = `상영관의 어둠은 까만 밤 속을 느긋하게 걷는 것 같죠?
아늑한 분위기를 느끼며 보았던 그 시간은 어쩌면 그 순간보다 다음 날, 그리고 그 다음 날에 금세 떠올라 마음을 충만하게, 또 그립게 만들지 몰라요.`
export const fifthLetterHint = '2층 1관에서 마지막 숫자를 알 수 있어요.'
