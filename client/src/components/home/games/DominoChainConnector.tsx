import type { DominoConnection, DominoViewport, Point } from './dominoChainLayout'

export function connectorPoints(points: readonly Point[], offset: Point = { x: 0, y: 0 }) {
  return points.map((point) => `${point.x + offset.x},${point.y + offset.y}`).join(' ')
}

/** Capa SVG pasiva para los conectores calculados por layoutDominoChain. */
export function DominoChainConnectors({
  connections,
  viewport,
  offset = { x: 0, y: 0 },
}: {
  connections: readonly DominoConnection[]
  viewport: DominoViewport
  offset?: Point
}) {
  return (
    <svg
      className="domino-chain-connectors"
      viewBox={`0 0 ${viewport.width} ${viewport.height}`}
      width={viewport.width}
      height={viewport.height}
      aria-hidden="true"
    >
      {connections.map((connection) => (
        <polyline
          key={`${connection.fromIndex}-${connection.toIndex}`}
          className={`domino-chain-connector domino-chain-connector--${connection.kind}`}
          points={connectorPoints(connection.points, offset)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
