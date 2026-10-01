import type { ScoreOverTimePoint } from '../../../services/metrics.service'

/**
 * Gráfico de línea simple vía SVG propio (misma decisión que `PieChart`: sin
 * dependencia nueva). Única responsabilidad: graficar la evolución del
 * puntaje del estudiante en el tiempo (issue #226) — no agrega los datos, eso
 * ya viene resuelto por día desde el backend.
 */
export function ScoreOverTimeChart({ points }: { points: ScoreOverTimePoint[] }) {
  if (points.length === 0) {
    return <p className="text-[14px] text-text/70">Aún no hay suficiente historial para graficar la evolución.</p>
  }

  const width = 480
  const height = 160
  const padding = 24
  const maxScore = Math.max(...points.map((point) => point.totalScore), 1)

  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0
  const coords = points.map((point, index) => {
    const x = padding + index * stepX
    const y = height - padding - (point.totalScore / maxScore) * (height - padding * 2)
    return { x, y, point }
  })

  const linePath = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="currentColor"
        strokeOpacity={0.2}
      />
      <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2} />
      {coords.map((coord) => (
        <circle key={coord.point.date} cx={coord.x} cy={coord.y} r={3} fill="#2563eb" />
      ))}
    </svg>
  )
}
