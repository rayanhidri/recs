const PALETTE = [
  '#7B8FA6',
  '#A67B7B',
  '#7BA67B',
  '#A69B7B',
  '#7B9EA6',
  '#9B7BA6',
  '#A6887B',
  '#7BA69B',
]

function colorFromUsername(username) {
  if (!username) return PALETTE[0]
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

export default function Avatar({ avatar, username, className = '', onClick }) {
  if (avatar) {
    return <img src={avatar} alt={username || ''} className={className} onClick={onClick} />
  }

  const letter = (username || '?')[0].toUpperCase()
  const bg = colorFromUsername(username)

  return (
    <div
      className={`avatar-fallback ${className}`}
      style={{ background: bg }}
      onClick={onClick}
      aria-label={username}
    >
      {letter}
    </div>
  )
}
