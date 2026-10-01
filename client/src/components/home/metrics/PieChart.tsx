export type PieChartSlice = {
  label: string
  value: number
}

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2']

/**
 * Gráfico de pie genérico vía SVG propio (sin dependencia externa nueva —
 * issue #226 no justifica agregar una librería de charting para un único
 * gráfico). Única responsabilidad: convertir una lista de `{label, value}`
 * en sectores de un círculo. No sabe de dónde vienen los datos.
 */
export function PieChart({ slices, size = 160 }: { slices: PieChartSlice[]; size?: number }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  if (total === 0) {
    return <p className="text-[14px] text-text/70">Sin datos suficientes para graficar.</p>
  }

  const radius = size / 2

  const paths = slices.reduce<{ path: string; color: string; slice: PieChartSlice; endAngle: number }[]>(
    (accumulated, slice, index) => {
      const previousEndAngle = accumulated.at(-1)?.endAngle ?? 0
      const fraction = slice.value / total
      const endAngle = previousEndAngle + fraction * 360
      const path = describeArc(radius, radius, radius, previousEndAngle, endAngle)

      return [...accumulated, { path, color: COLORS[index % COLORS.length], slice, endAngle }]
    },
    [],
  )

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map(({ path, color, slice }) => (
          <path key={slice.label} d={path} fill={color} />
        ))}
      </svg>
      <ul className="flex flex-col gap-1 text-[13px]">
        {paths.map(({ color, slice }) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            {slice.label} ({slice.value})
          </li>
        ))}
      </ul>
    </div>
  )
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleDegrees: number) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  }
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}
