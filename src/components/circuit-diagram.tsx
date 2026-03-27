import { useMemo } from 'react'
import { Circuit } from '@kirkelliott/ket'

interface CircuitDiagramProps {
  qasm: string
}

export function CircuitDiagram({ qasm }: CircuitDiagramProps) {
  const svg = useMemo(() => {
    try {
      return Circuit.fromQASM(qasm).toSVG()
    } catch {
      return null
    }
  }, [qasm])

  if (!svg) return null

  return (
    <div className="my-1 rounded border overflow-hidden" style={{ borderColor: 'var(--color-border-subtle)' }}>
      <div
        className="flex items-center justify-center p-2 [&>svg]:max-w-full [&>svg]:h-auto"
        style={{ background: '#fff' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  )
}
