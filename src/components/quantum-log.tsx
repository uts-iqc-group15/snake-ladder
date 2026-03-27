import { useCallback, useEffect, useRef, useState } from 'react'
import { CircuitDiagram } from '@/components/circuit-diagram'
import type { LogEntry } from '@/hooks/use-game'

interface QuantumLogProps {
  logs: LogEntry[]
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false })
}

const TYPE_COLORS: Record<LogEntry['type'], string> = {
  info: '#2c4a7c',
  qasm: '#7c5e10',
  result: '#2d6a4f',
  error: '#c04530',
}

const TYPE_PREFIX: Record<LogEntry['type'], string> = {
  info: '\u25B6',
  qasm: '\u2261',
  result: '\u25C0',
  error: '\u2717',
}

const MIN_HEIGHT = 160
const DEFAULT_HEIGHT = 320

export function QuantumLog({ logs }: QuantumLogProps) {
  const [expanded, setExpanded] = useState(false)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const scrollRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const onDragStart = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true
    startYRef.current = e.clientY
    startHeightRef.current = height
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [height])

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const delta = startYRef.current - e.clientY
    const maxHeight = window.innerHeight - 32
    setHeight(Math.min(Math.max(startHeightRef.current + delta, MIN_HEIGHT), maxHeight))
  }, [])

  const onDragEnd = useCallback(() => {
    draggingRef.current = false
  }, [])

  if (!expanded) {
    return (
      <button
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs cursor-pointer transition-all card-panel hover:shadow-[var(--shadow-board)]"
        style={{ color: '#2c4a7c' }}
        onClick={() => setExpanded(true)}
      >
        <span className="text-sm">{'\uD83D\uDC39'}</span>
        Quokka Log
        {logs.length > 0 && (
          <span
            className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold text-text-inverse"
            style={{ background: '#2c4a7c' }}
          >
            {logs.length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col rounded-xl overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-board)]"
      style={{
        width: 'min(640px, calc(100vw - 2rem))',
        height: `${height}px`,
        background: 'var(--color-surface)',
      }}
    >
      {/* Top drag handle */}
      <div
        className="h-2 cursor-ns-resize shrink-0 flex items-center justify-center hover:bg-[var(--color-surface-hover)] transition-colors"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div className="w-8 h-0.5 rounded bg-[var(--color-border)]" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border-subtle)] shrink-0 bg-[var(--color-bg)]">
        <div className="flex items-center gap-2 font-mono text-xs font-bold" style={{ color: '#2c4a7c' }}>
          <span className="text-sm">{'\uD83D\uDC39'}</span>
          Quokka Log
          <span className="text-text-secondary font-normal">({logs.length})</span>
        </div>
        <button
          className="w-6 h-6 flex items-center justify-center rounded text-text-secondary hover:text-text hover:bg-[var(--color-surface-hover)] cursor-pointer text-xs"
          onClick={() => setExpanded(false)}
          title="Minimize"
        >
          &#x2500;
        </button>
      </div>

      {/* Log content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-[0.7rem] leading-relaxed"
      >
        {logs.length === 0 ? (
          <div className="text-text-secondary text-center py-4">
            Waiting for quokka measurements...
          </div>
        ) : (
          logs.map((log, i) => {
            const color = TYPE_COLORS[log.type]
            const prefix = TYPE_PREFIX[log.type]
            const isQasm = log.type === 'qasm'

            return (
              <div key={i} className={isQasm ? 'my-1' : 'py-0.5'}>
                {isQasm ? (
                  <>
                    <pre
                      className="whitespace-pre-wrap px-2 py-1.5 rounded border text-[0.65rem] leading-snug"
                      style={{
                        background: 'rgba(160, 125, 74, 0.06)',
                        borderColor: 'var(--color-border-subtle)',
                        color: '#5c4a1e',
                      }}
                    >
                      {log.message}
                    </pre>
                    <CircuitDiagram qasm={log.message} />
                  </>
                ) : (
                  <div className="flex gap-1.5">
                    <span className="text-text-secondary shrink-0">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className="shrink-0" style={{ color }}>
                      {prefix}
                    </span>
                    <span className="break-all" style={{ color }}>
                      {log.message}
                    </span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
