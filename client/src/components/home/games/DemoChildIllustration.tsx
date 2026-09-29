/** Ilustración decorativa: la identidad del jugador está en el texto contiguo. */
export function DemoChildIllustration({ rival }: { rival: boolean }) {
  const skin = rival ? '#b97850' : '#f5bd92'
  const hair = rival ? '#392638' : '#663d2c'
  return <svg viewBox="0 0 100 100" className="h-14 w-14 shrink-0 sm:h-20 sm:w-20" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="48" fill={rival ? '#d6f5ed' : '#eee1ff'} />
    <path d="M16 88Q19 67 50 67Q81 67 84 88Q50 106 16 88" fill={rival ? '#16a395' : '#8853dc'} />
    <path d="M40 69Q50 82 60 69" fill="none" stroke={rival ? '#a6f0d6' : '#d7bdff'} strokeWidth="5" />
    {rival && <g fill={hair}><circle cx="25" cy="48" r="14" /><circle cx="75" cy="48" r="14" /></g>}
    <rect x="43" y="60" width="14" height="15" rx="6" fill={skin} />
    <circle cx="27" cy="46" r="6" fill={skin} /><circle cx="73" cy="46" r="6" fill={skin} />
    <rect x="27" y="18" width="46" height="51" rx="22" fill={skin} />
    {rival ? <path d="M26 43Q18 17 42 13Q77 6 75 43L67 31Q53 34 43 24Q37 37 26 43" fill={hair} />
      : <path d="M26 42Q17 23 29 18L27 11L39 15Q63 3 73 23L75 41L67 32Q51 35 43 27Q35 39 26 42" fill={hair} />}
    {rival && <g fill="#ffbe53"><circle cx="26" cy="35" r="4" /><circle cx="74" cy="35" r="4" /></g>}
    <g fill="#302432"><ellipse cx="40" cy="45" rx="2.6" ry="3.5" /><ellipse cx="60" cy="45" rx="2.6" ry="3.5" /></g>
    <g fill="#fff"><circle cx="41" cy="44" r=".9" /><circle cx="61" cy="44" r=".9" /></g>
    <g fill="#e7807d" opacity=".6"><ellipse cx="34" cy="53" rx="4" ry="2.5" /><ellipse cx="66" cy="53" rx="4" ry="2.5" /></g>
    <path d="M43 55Q50 65 57 55Z" fill="#7f3748" /><path d="M45 56H55" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <path d="M15 22V30M11 26H19" stroke={rival ? '#16a395' : '#a16de6'} strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="85" cy="64" r="3" fill="#ffbe53" />
  </svg>
}
