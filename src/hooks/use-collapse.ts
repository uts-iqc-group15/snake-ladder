import { useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useMemoizedFn } from 'ahooks'
import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { QUBIT_CONFIGS, TOTAL_CELLS } from '@/constants/board'
import { sendToQuokka } from '@/lib/quokka'
import { buildSingleQubitQASM } from '@/lib/qasm-builder'
import { computeDisplacement, rollDie } from '@/lib/game-helpers'
import type { EntanglementStrategy } from '@/lib/entanglement-strategy'
import type {
  CollapseParams,
  CollapseResult,
  GamePhase,
  GameState,
  LogEntry,
} from '@/types/game'

interface UseCollapseDeps {
  setState: Dispatch<SetStateAction<GameState>>
  stateRef: MutableRefObject<GameState>
  addLog: (type: LogEntry['type'], message: string) => void
  slideToCell: (
    player: 0 | 1,
    fromCell: number,
    toCell: number,
    isLadder: boolean,
  ) => Promise<void>
  entanglementStrategy: EntanglementStrategy
}

export interface UseCollapseReturn {
  collapseMutation: UseMutationResult<CollapseResult, Error, CollapseParams>
}

export function useCollapse({
  setState,
  stateRef,
  addLog,
  slideToCell,
  entanglementStrategy,
}: UseCollapseDeps): UseCollapseReturn {
  const mutateRef = useRef<((params: CollapseParams) => void) | null>(null)

  const applyCollapseToState = useMemoizedFn(
    async (data: CollapseResult, player: 0 | 1, targetCell: number) => {
      const { qubitId, outcome, partnerId, partnerOutcome } = data

      if (outcome === 'interference') {
        setState((prev) => ({
          ...prev,
          qubits: prev.qubits.map((q) => {
            if (q.id === qubitId) return { ...q, collapsed: 'interference' as const }
            if (
              partnerId &&
              q.id === partnerId &&
              partnerOutcome === 'interference'
            ) {
              return { ...q, collapsed: 'interference' as const }
            }
            return q
          }),
          isCollapsing: false,
          currentPlayer: (player === 0 ? 1 : 0) as 0 | 1,
          message: 'Quantum interference! Nothing happens.',
        }))
        return
      }

      const newCell = computeDisplacement(outcome, targetCell, addLog)
      addLog('info', `Player ${player + 1}: cell ${targetCell} → cell ${newCell}`)

      // Compute partner displacement up front (outside setState) so Strict-Mode
      // double-invoke doesn't roll dice twice or duplicate logs.
      const partnerSettledOutcome: 'snake' | 'ladder' | undefined =
        partnerId && partnerOutcome && partnerOutcome !== 'interference'
          ? (partnerOutcome as 'snake' | 'ladder')
          : undefined
      const partnerCell = partnerSettledOutcome
        ? stateRef.current.qubits.find((q) => q.id === partnerId)?.cell
        : undefined
      const partnerDestination =
        partnerSettledOutcome && partnerCell !== undefined
          ? computeDisplacement(partnerSettledOutcome, partnerCell, addLog)
          : undefined
      const partnerCancelled = !!partnerId && partnerOutcome === 'interference'

      // Reveal the snake/ladder on the board before sliding the token along it.
      setState((prev) => {
        const newQubits = prev.qubits.map((q) => {
          if (q.id === qubitId) {
            return { ...q, collapsed: outcome, destinationCell: newCell }
          }
          if (partnerId && q.id === partnerId) {
            if (partnerSettledOutcome && partnerDestination !== undefined) {
              return {
                ...q,
                collapsed: partnerSettledOutcome,
                destinationCell: partnerDestination,
              }
            }
            if (partnerCancelled) {
              return { ...q, collapsed: 'interference' as const }
            }
          }
          return q
        })

        return {
          ...prev,
          qubits: newQubits,
          message: `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! ${
            outcome === 'ladder' ? 'Climbing' : 'Sliding'
          }...`,
        }
      })

      await slideToCell(player, targetCell, newCell, outcome === 'ladder')

      const gameOver = newCell === TOTAL_CELLS
      const chainQubit = stateRef.current.qubits.find(
        (q) => q.cell === newCell && q.collapsed === null,
      )

      if (!gameOver && chainQubit) {
        addLog(
          'info',
          `Chain! Player ${player + 1} landed on another qubit at cell ${newCell}`,
        )
        setState((prev) => ({
          ...prev,
          isCollapsing: true,
          message: `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! → cell ${newCell} | Chain reaction...`,
        }))
        setTimeout(() => {
          mutateRef.current?.({ qubit: chainQubit, player, targetCell: newCell })
        }, 300)
        return
      }

      setState((prev) => ({
        ...prev,
        isCollapsing: false,
        gameOver,
        phase: gameOver ? ('gameover' as GamePhase) : prev.phase,
        currentPlayer: gameOver
          ? prev.currentPlayer
          : ((player === 0 ? 1 : 0) as 0 | 1),
        message: gameOver
          ? `Player ${player + 1} wins!`
          : `${outcome === 'ladder' ? 'Ladder' : 'Snake'}! → cell ${newCell}`,
      }))
    },
  )

  const collapseMutation = useMutation<CollapseResult, Error, CollapseParams>({
    mutationFn: async ({ qubit }) => {
      const config = QUBIT_CONFIGS[qubit.configIndex]

      const partner = qubit.entangledPartnerId
        ? stateRef.current.qubits.find((q) => q.id === qubit.entangledPartnerId)
        : undefined
      const partnerStillEntangled =
        config.entangled && partner && partner.collapsed === null

      try {
        if (partnerStillEntangled && partner) {
          const partnerConfig = QUBIT_CONFIGS[partner.configIndex]
          const params = config.entangledParams
          const thetaFromProb = (p: number) => 2 * Math.acos(Math.sqrt(p))
          const ctx = params
            ? {
                thetaA: params.thetaA,
                thetaB: params.thetaB,
                phase: params.phase,
              }
            : {
                thetaA: thetaFromProb(config.ladderProb),
                thetaB: thetaFromProb(partnerConfig.ladderProb),
              }
          const qasm = entanglementStrategy.buildQASM(ctx)
          addLog(
            'info',
            `Measuring ENTANGLED qubit [${config.label}] at cell ${qubit.cell} via ${entanglementStrategy.label}...`,
          )
          for (const line of entanglementStrategy.describe(ctx)) addLog('info', line)
          addLog('qasm', qasm)

          const result = await sendToQuokka(qasm)
          const [m0, m1] = [result[0][0], result[0][1]]
          const parsed = entanglementStrategy.parseResult(m0, m1)

          const playerLabel =
            parsed.playerOutcome === 'ladder'
              ? 'Ladder!'
              : parsed.playerOutcome === 'snake'
                ? 'Snake!'
                : 'Interference (no move)'
          const partnerLabel =
            parsed.partnerOutcome === null
              ? 'partner stays active (will measure on visit)'
              : parsed.partnerOutcome === 'interference'
                ? 'partner cancelled'
                : `partner = ${parsed.partnerOutcome}`
          addLog(
            'result',
            `Entangled [m0=${m0}, m1=${m1}] → ${playerLabel}; ${partnerLabel}`,
          )

          return {
            qubitId: qubit.id,
            outcome: parsed.playerOutcome,
            partnerId: qubit.entangledPartnerId,
            partnerOutcome: parsed.partnerOutcome ?? undefined,
          }
        }

        const theta = 2 * Math.acos(Math.sqrt(config.ladderProb))
        const qasm = buildSingleQubitQASM(config.ladderProb)
        const partnerNote =
          config.entangled && partner && partner.collapsed !== null
            ? ' (partner already collapsed — independent measurement)'
            : ''
        addLog(
          'info',
          `Measuring qubit [${config.label}] at cell ${qubit.cell}${partnerNote}...`,
        )
        addLog(
          'info',
          `Circuit: ladderProb=${config.ladderProb} → θ=2·arccos(√${config.ladderProb})=${theta.toFixed(4)}rad → ry(${theta.toFixed(4)})`,
        )
        addLog(
          'info',
          `P(ladder)=cos²(θ/2)=${config.ladderProb}, P(snake)=sin²(θ/2)=${config.snakeProb}`,
        )
        addLog('qasm', qasm)

        const result = await sendToQuokka(qasm)
        const measurement = result[0][0]
        const outcome: 'snake' | 'ladder' = measurement === 0 ? 'ladder' : 'snake'
        addLog(
          'result',
          `Measurement: ${measurement} → ${outcome === 'ladder' ? 'Ladder!' : 'Snake!'}`,
        )

        return { qubitId: qubit.id, outcome }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        addLog('error', `Quokka error: ${msg}. Using local fallback.`)

        const fallback =
          rollDie() <= Math.ceil(config.ladderProb * 6) ? 'ladder' : 'snake'
        addLog('result', `Fallback: ${fallback === 'ladder' ? 'Ladder!' : 'Snake!'}`)

        return { qubitId: qubit.id, outcome: fallback }
      }
    },
    onSuccess: (data, { player, targetCell }) => {
      void applyCollapseToState(data, player, targetCell)
    },
  })

  useEffect(() => {
    mutateRef.current = collapseMutation.mutate
  }, [collapseMutation.mutate])

  return { collapseMutation }
}
