import { useRef, useState } from 'react'
import { useLatest, useMemoizedFn } from 'ahooks'
import {
  INITIAL_SETUP,
  INITIAL_STATE,
  resetQubitIdCounter,
} from '@/lib/game-helpers'
import type { GameState, LogEntry } from '@/types/game'
import { useGameAnimations } from '@/hooks/use-game-animations'
import { useCollapse } from '@/hooks/use-collapse'
import { usePlay } from '@/hooks/use-play'
import { useSetup } from '@/hooks/use-setup'

export type {
  GamePhase,
  GameState,
  LogEntry,
  PlacedQubit,
  CollapseParams,
  CollapseResult,
} from '@/types/game'

export function useGame() {
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

  const reset = useMemoizedFn(() => {
    resetQubitIdCounter()
    logsRef.current = []
    setState({
      ...INITIAL_STATE,
      setupRemaining: [[...INITIAL_SETUP[0]], [...INITIAL_SETUP[1]]],
      logs: [],
    })
  })

  return {
    state,
    selectQubit,
    placeQubit,
    randomPlaceAll,
    confirmPass,
    handleRoll,
    reset,
  }
}
