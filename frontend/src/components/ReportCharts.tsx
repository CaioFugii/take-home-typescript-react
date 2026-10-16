type RevenuePoint = {
  date: string
  revenue: number
}

type StatusBar = {
  label: string
  count: number
}

const width = 640
const height = 220

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const pad = { top: 16, right: 16, bottom: 32, left: 56 }
  const max = Math.max(...points.map((point) => point.revenue), 1)
  const innerWidth = width - pad.left - pad.right
  const innerHeight = height - pad.top - pad.bottom
  const step = points.length <= 1 ? 0 : innerWidth / (points.length - 1)
  const coords = points.map((point, index) => ({
    ...point,
    x: pad.left + step * index,
    y: pad.top + innerHeight - (point.revenue / max) * innerHeight,
  }))
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const labels = coords.filter((_, index) => index === 0 || index === coords.length - 1 || index === Math.floor(coords.length / 2))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Receita diária no período" className="h-56 w-full">
      <line x1={pad.left} y1={pad.top + innerHeight} x2={width - pad.right} y2={pad.top + innerHeight} stroke="#e3dacb" />
      <text x={pad.left - 8} y={pad.top + 4} textAnchor="end" className="fill-[#8a7b68] text-[11px]">
        {max.toFixed(0)}
      </text>
      <path d={path} fill="none" stroke="#d4532b" strokeWidth="3" />
      {coords.map((point) => (
        <circle key={point.date} cx={point.x} cy={point.y} r="4" fill="#1b3329" />
      ))}
      {labels.map((point) => (
        <text key={point.date} x={point.x} y={height - 8} textAnchor="middle" className="fill-[#8a7b68] text-[11px]">
          {point.date.slice(5)}
        </text>
      ))}
    </svg>
  )
}

export function StatusChart({ bars }: { bars: StatusBar[] }) {
  const pad = { top: 12, right: 12, bottom: 36, left: 28 }
  const max = Math.max(...bars.map((bar) => bar.count), 1)
  const innerWidth = width - pad.left - pad.right
  const innerHeight = height - pad.top - pad.bottom
  const slot = innerWidth / bars.length

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pedidos por status" className="h-56 w-full">
      <line x1={pad.left} y1={pad.top + innerHeight} x2={width - pad.right} y2={pad.top + innerHeight} stroke="#e3dacb" />
      {bars.map((bar, index) => {
        const barHeight = (bar.count / max) * innerHeight
        const x = pad.left + slot * index + slot * 0.2
        const y = pad.top + innerHeight - barHeight
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={slot * 0.6} height={barHeight} rx="6" fill={index % 2 === 0 ? '#1b3329' : '#d4532b'} />
            <text x={x + slot * 0.3} y={y - 6} textAnchor="middle" className="fill-[#5c5146] text-[11px]">
              {bar.count}
            </text>
            <text x={x + slot * 0.3} y={height - 10} textAnchor="middle" className="fill-[#8a7b68] text-[11px]">
              {bar.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
