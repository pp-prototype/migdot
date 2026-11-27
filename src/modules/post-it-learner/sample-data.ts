// Reference: post-it-learner f304de0, src/main.jsx. Public sample content only.
import type { Workspace } from './types'
export const sampleWorkspace: Workspace = { topics: [{id:'react', name:'React 깊이 알아가기', emoji:'⚛', description:'컴포넌트부터 나만의 서비스까지'}, {id:'design', name:'일상에서 발견한 디자인', emoji:'✳', description:'좋은 경험을 만드는 작은 관찰들'}, {id:'english', name:'조금씩, 영어', emoji:'Aa', description:'매일 한 문장이라도 내 것으로'}], notes: [
{id:'1',topic:'react',registrationNumber:4,title:'컴포넌트는 작은 레고 블록',body:'화면을 작은 단위로 나누고, 다시 조합한다.\n반복되는 UI를 발견하면 컴포넌트로 만들어보자.\n\n작게 나눌수록 생각하기도 쉬워진다.',color:'yellow',date:'2026-11-09T01:00:00.000Z',tag:'컴포넌트'},
{id:'2',topic:'react',registrationNumber:3,title:'useState, 기억하는 화면',body:'일반 변수는 바뀌어도 화면이 다시 그려지지 않는다.\n\n상태는 React에게 “이 값이 바뀌었으니 화면도 바꿔줘!”라고 알려주는 방법.',color:'pink',date:'2026-11-08T01:00:00.000Z',tag:'React hooks'},
{id:'3',topic:'design',registrationNumber:1,title:'여백도 디자인이다',body:'무언가 더 넣기 전에, 덜어낼 수 있는지 먼저 생각하기.\n\n충분한 여백은 중요한 것을 더 잘 보이게 한다.',color:'green',date:'2026-11-08T02:00:00.000Z',tag:'관찰'},
{id:'4',topic:'react',registrationNumber:2,title:'props는 한 방향으로 흐른다',body:'부모 → 자식으로 데이터를 전달한다.\n자식에서 부모의 값을 바꾸려면?\n함수를 props로 전달하면 된다! ↗',color:'blue',date:'2026-11-07T01:00:00.000Z',tag:'데이터 흐름'},
{id:'5',topic:'english',registrationNumber:1,title:'Little by little.',body:'조금씩, 차근차근.\n\n“Little by little, a little becomes a lot.”\n\n오늘의 작은 배움도 언젠가 큰 무언가가 되겠지.',color:'purple',date:'2026-11-07T02:00:00.000Z',tag:'오늘의 문장'},
{id:'6',topic:'react',registrationNumber:1,title:'오늘은 직접 만들어봤다!',body:'배운 내용을 읽기만 할 때보다\n직접 코드를 써볼 때 더 많이 이해된다.\n\n작동하는 작은 카운터 하나.\n작지만 확실한 한 걸음 🌱',color:'yellow',date:'2026-11-06T01:00:00.000Z',tag:'작은 실습'}]};
