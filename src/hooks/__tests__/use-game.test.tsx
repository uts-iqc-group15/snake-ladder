import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGame } from '@/hooks/use-game'

vi.mock('@/lib/quokka', () => ({
  // measurement = 1 → snake outcome
  sendToQuokka: vi.fn().mockResolvedValue([[1]]),
}))

vi.mock('@/lib/game-helpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/game-helpers')>(
    '@/lib/game-helpers',
  )
  return {
    ...actual,
    sleep: () => Promise.resolve(),
  }
})

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

afterEach(() => {
  vi.restoreAllMocks()
})

async function placeAllAndStart(
  result: { current: ReturnType<typeof useGame> },
) {
  await act(async () => {
    result.current.randomPlaceAll()
  })
  await act(async () => {
    result.current.confirmPass()
  })
  await act(async () => {
    result.current.randomPlaceAll()
  })
  await act(async () => {
    result.current.confirmPass()
  })
}

async function rollAs(
  result: { current: ReturnType<typeof useGame> },
  player: 0 | 1,
  step: number,
) {
  // If it's not this player's turn yet, do a no-op skip turn for the other
  // player. We can't actually skip — but rolling 1 to a safe empty cell is
  // close enough as long as that cell isn't a qubit.
  while (result.current.state.currentPlayer !== player) {
    await act(async () => {
      await result.current.handleRoll(1)
    })
  }
  await act(async () => {
    await result.current.handleRoll(step)
  })
}

describe('useGame — collapsed snake reuses destinationCell', () => {
  it('second player landing on the same snake cell goes to the same destination', async () => {
    const seed = Array.from({ length: 200 }, (_, k) => ((k * 37) % 100) / 100)
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seed[i++ % seed.length])

    const { result } = renderHook(() => useGame(), { wrapper })

    await placeAllAndStart(result)

    // Pick a non-entangled qubit on a free path (cell <= 50 ideally).
    const candidates = result.current.state.qubits
      .filter((q) => !q.entangledPartnerId && q.cell >= 6 && q.cell <= 50)
      .sort((a, b) => a.cell - b.cell)
    expect(candidates.length).toBeGreaterThan(0)
    const qubit = candidates[0]
    const targetCell = qubit.cell

    // Drive P1 to land exactly on the qubit cell.
    let safety = 80
    while (
      !result.current.state.qubits.find((q) => q.id === qubit.id)?.collapsed &&
      safety-- > 0
    ) {
      const p1 = result.current.state.positions[0]
      if (p1 >= targetCell) break
      const step = Math.min(6, targetCell - p1)
      await rollAs(result, 0, step)
    }

    await waitFor(() => {
      const q = result.current.state.qubits.find((qq) => qq.id === qubit.id)
      expect(q?.collapsed).toBe('snake')
      expect(q?.destinationCell).toBeDefined()
    })

    const firstDestination = result.current.state.qubits.find(
      (q) => q.id === qubit.id,
    )!.destinationCell!
    expect(result.current.state.positions[0]).toBe(firstDestination)

    // P2 walks to the same snake cell.
    safety = 80
    while (result.current.state.positions[1] !== firstDestination && safety-- > 0) {
      const p2 = result.current.state.positions[1]
      if (p2 >= targetCell) break
      const step = Math.min(6, targetCell - p2)
      await rollAs(result, 1, step)
    }

    // P2 should slide to the SAME destination — not a fresh random one.
    expect(result.current.state.positions[1]).toBe(firstDestination)
  }, 15000)
})
