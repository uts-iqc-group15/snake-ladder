import { useRef, useState } from 'react'
import { useLatest, useMemoizedFn } from 'ahooks'
import {
  INITIAL_SETUP,
  INITIAL_STATE,
  resetQubitIdCounter,
} from '@/lib/game-helpers'
import {
  DEFAULT_ENTANGLEMENT_STRATEGY,
  type EntanglementStrategy,
} from '@/lib/entanglement-strategy'
import {
  BARRIER_THETA,
  buildTunnelQASM,
  computeTunnelPhase,
  tunnelPassProbability,
} from '@/lib/tunnel-circuit'
import type { GameState, LogEntry } from '@/types/game'
import { useGameAnimations } from '@/hooks/use-game-animations'
import { useCollapse } from '@/hooks/use-collapse'
import { usePlay } from '@/hooks/use-play'
import { useSetup } from '@/hooks/use-setup'

interface UseGameOptions {
  entanglementStrategy?: EntanglementStrategy
}

export type {
  GamePhase,
  GameState,
  LogEntry,
  PlacedQubit,
  CollapseParams,
  CollapseResult,
} from '@/types/game'

export function useGame(options: UseGameOptions = {}) {
  const entanglementStrategy =
    options.entanglementStrategy ?? DEFAULT_ENTANGLEMENT_STRATEGY
  const [state, setState] = useState<GameState>({ ...INITIAL_STATE })
  const stateRef = useLatest(state)
  const logsRef = useRef<LogEntry[]>([])

  const addLog = useMemoizedFn((type: LogEntry['type'], message: string) => {
    const entry: LogEntry = { timestamp: Date.now(), type, message }
    logsRef.current = [...logsRef.current, entry]
    setState((prev) => ({ ...prev, logs: logsRef.current }))
  })

  const { hopAlongBoard, slideToCell } = useGameAnimations(setState)

  const { collapseMutation } = useCollapse({
    setState,
    stateRef,
    addLog,
    slideToCell,
    entanglementStrategy,
  })

  const { selectQubit, placeQubit, randomPlaceAll, confirmPass } = useSetup(setState)

  const { handleRoll } = usePlay({
    setState,
    stateRef,
    addLog,
    hopAlongBoard,
    slideToCell,
    collapseMutation,
  })

  // Debug-only: log the tunnel interferometer circuit for the current player's
  // accumulated path WITHOUT moving any token, so the QuantumLog renders the
  // P(pass)-vs-φ curve on demand. φ is path-dependent, so rolling a few times
  // and previewing again shows the marker move along the interference fringe.
  const previewTunnel = useMemoizedFn(() => {
    const s = stateRef.current
    const player = s.currentPlayer
    const pathLen = s.paths[player].length
    const phi = computeTunnelPhase(pathLen)
    const theta = BARRIER_THETA
    const pPass = tunnelPassProbability(theta, phi)
    const isResonant = Math.cos(phi / 2) ** 2 > 0.9
    addLog(
      'info',
      `[DEBUG] Tunnel preview — Player ${player + 1}, path length ${pathLen}`,
    )
    addLog('qasm', buildTunnelQASM(theta, phi))
    addLog(
      'info',
      `Tunnel circuit: φ=${phi.toFixed(4)} rad, P(pass)=${pPass.toFixed(4)}${isResonant ? ' [RESONANCE]' : ''}`,
    )
  })

  const reset = useMemoizedFn(() => {
    resetQubitIdCounter()
    logsRef.current = []
    setState({
      ...INITIAL_STATE,
      setupRemaining: [[...INITIAL_SETUP[0]], [...INITIAL_SETUP[1]]],
      logs: [],
      paths: [[1], [1]],
    })
  })

  return {
    state,
    selectQubit,
    placeQubit,
    randomPlaceAll,
    confirmPass,
    handleRoll,
    previewTunnel,
    reset,
  }
}
