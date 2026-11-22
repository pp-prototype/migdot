import styles from './experience.module.css'

export default function Executioner({ mood = 'ready', level }: { mood?: 'ready' | 'working' | 'proud' | 'rest'; level?: 1 | 2 }) {
  const evolved = level === 2
  return <svg className={`${styles.character} ${mood === 'working' ? styles.working : ''}`} viewBox={level ? "53 24 194 201" : "0 0 300 260"} aria-hidden={level ? true : undefined} role="img" aria-label={`귀여운 후드 집행관 익스큐셔너 · ${{ ready: '임무 대기', working: '함께 실행 중', proud: '완료를 축하하는 중', rest: '하루를 마치고 쉬는 중' }[mood]}`}>
    <circle cx="150" cy="127" r="103" fill={evolved ? "#f3dfa4" : "#eee4d0"} /><circle cx="150" cy="127" r="82" fill="none" stroke="#d9cdb5" strokeDasharray="3 8" />
    <path d="m50 65 3-9 3 9 9 3-9 3-3 9-3-9-9-3zm197 72 2-7 3 7 7 3-7 2-3 7-2-7-7-2z" fill="#aa8055" />
    <ellipse cx="150" cy="237" rx="74" ry="10" fill="#d8cdb9" />
    <path d="M115 163q-24 16-32 54l22-7 6 15 39-12 41 12 7-15 20 7q-10-40-34-54" fill={evolved ? "#3b776b" : "#a45e50"} stroke={evolved ? "#27564b" : "#74483f"} strokeWidth="3" strokeLinejoin="round" />
    <path d="M120 161h61l11 56h-83z" fill="#37463f" /><path d="M119 214v19q11 8 25 0v-20m13 0v20q15 8 26 0v-19" fill="#29352f" />
    <path d="M126 214h50" stroke="#172b23" strokeWidth="8" /><rect x="144" y="208" width="14" height="12" rx="3" fill="#dbb36b" />
    <path d="M116 167q-17 10-17 25" stroke="#37463f" strokeWidth="20" strokeLinecap="round" /><circle cx="99" cy="194" r="11" fill="#e4c7a4" />
    <path d={mood === 'proud' ? 'M184 168q17-6 21-26' : 'M183 168q16 10 17 25'} stroke="#37463f" strokeWidth="20" strokeLinecap="round" /><circle cx={mood === 'proud' ? 205 : 201} cy={mood === 'proud' ? 141 : 194} r="11" fill="#e4c7a4" />
    <path d="M87 135q0-53 35-75 18-18 30-30 6 21 25 29 38 21 38 76l-13 40q-49 21-100 0z" fill={evolved ? "#38665c" : "#33463e"} stroke={evolved ? "#244e45" : "#263b31"} strokeWidth="3" strokeLinejoin="round" />
    <path d="M103 129q0-39 24-55 12-8 24-19 6 17 23 24 25 16 25 50" fill={evolved ? "#5e9987" : "#456052"} />
    <path d="M105 130q8-31 47-31t47 31v26q-47 24-94 0z" fill="#172b23" />
    {mood === 'rest' ? <path d="m123 135 10 2m34 0 10-2" stroke="#f1dfac" strokeWidth="4" strokeLinecap="round" /> : mood === 'proud' ? <path d="m122 137 6-5 6 5m32 0 6-5 6 5" fill="none" stroke="#f1dfac" strokeWidth="4" strokeLinecap="round" /> : <><rect x="123" y="130" width="10" height="12" rx="4" fill="#f1dfac" /><rect x="167" y="130" width="10" height="12" rx="4" fill="#f1dfac" /><path d="m120 121 16 3m28 0 16-3" stroke="#668171" strokeWidth="4" strokeLinecap="round" /></>}
    <path d="M145 150q6 4 12 0" fill="none" stroke="#a7b89c" strokeWidth="2" strokeLinecap="round" />
    <path d="M103 165q48 16 95 0v11q-47 19-95 0z" fill="#c07b62" /><path d="m172 175 16 28 13-13-15-19" fill="#b16d57" />
    <g transform={mood === 'proud' ? 'translate(217 115) rotate(20)' : 'translate(218 182) rotate(-12)'}><rect x="-4" y="-18" width="8" height="34" rx="4" fill="#b28659" /><rect x="-15" y="11" width="30" height="12" rx="4" fill="#e0bd7c" stroke="#a17b49" strokeWidth="2" /><path d="m-6 17 4 3 8-7" fill="none" stroke="#425b49" strokeWidth="2" /></g>
    {mood === 'proud' && <><path d="m230 49 4 8 9 1-6 6 1 9-8-4-8 4 2-9-7-6 9-1z" fill="#c7a65e" /><path d="m78 116-8-4m12-7-4-8" stroke="#b98c56" strokeWidth="3" strokeLinecap="round" /></>}
    {evolved && <><path d="m150 53 13 16-13 16-13-16z" fill="#eacf80" stroke="#fff1bf" strokeWidth="3" /><path d="M115 185q35 12 70 0" stroke="#eacf80" strokeWidth="5" fill="none" /></>}
    {mood === 'rest' && <text x="220" y="83" fill="#718570" fontSize="20" fontFamily="sans-serif">z z</text>}
  </svg>
}
