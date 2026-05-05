import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGame } from '@/hooks/use-game'
import { sendToQuokka } from '@/lib/quokka'

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

describe('useGame — chain reaction through already-collapsed qubits', () => {
  it('second player landing on a collapsed cell chains through subsequent collapsed cells', async () => {
    // Single-qubit measurement = 0 → ladder
    vi.mocked(sendToQuokka).mockResolvedValue([[0]])

    const seed = Array.from({ length: 500 }, (_, k) => ((k * 41 + 17) % 100) / 100)
    let i = 0
    vi.spyOn(Math, 'random').mockImplementation(() => seed[i++ % seed.length])

    const { result } = renderHook(() => useGame(), { wrapper })

    const placeAt = async (configIndex: number, cell: number) => {
      await act(async () => {
        result.current.selectQubit(configIndex)
      })
      await act(async () => {
        result.current.placeQubit(cell)
      })
    }

    // P1 places: non-entangled config 0 at 6 (entry tile), entangled (4) parked
    // in the back half so it never fires.
    await placeAt(0, 6)
    await placeAt(1, 90)
    await placeAt(2, 91)
    await placeAt(3, 92)
    await placeAt(4, 93)
    await act(async () => {
      result.current.confirmPass()
    })

    // P2 places: non-entangled config 0 at 54 (the deterministic landing spot
    // from cell 6 under this seed), so a chain 6→54→? is reachable.
    await placeAt(0, 54)
    await placeAt(1, 80)
    await placeAt(2, 81)
    await placeAt(3, 82)
    await placeAt(4, 83)
    await act(async () => {
      result.current.confirmPass()
    })

    expect(result.current.state.phase).toBe('play')
    expect(result.current.state.currentPlayer).toBe(0)

    // P1 rolls 5: 1 → 6 → collapse → slide → chain to qubit at 54 → another slide.
    await act(async () => {
      await result.current.handleRoll(5)
    })

    await waitFor(() => {
      const q6 = result.current.state.qubits.find((q) => q.cell === 6)
      const q54 = result.current.state.qubits.find((q) => q.cell === 54)
      expect(q6?.collapsed).toBe('ladder')
      expect(q6?.destinationCell).toBe(54)
      expect(q54?.collapsed).toBe('ladder')
      expect(q54?.destinationCell).toBeDefined()
      expect(result.current.state.isCollapsing).toBe(false)
      expect(result.current.state.currentPlayer).toBe(1)
    }, { timeout: 5000 })

    const finalDest = result.current.state.qubits.find(
      (q) => q.cell === 54,
    )!.destinationCell!
    expect(finalDest).not.toBe(54)
    expect(finalDest).not.toBe(6)

    // P2 rolls 5: 1 → 6 → must chain 6→54→finalDest, NOT stop at 54.
    await act(async () => {
      await result.current.handleRoll(5)
    })

    await waitFor(() => {
      expect(result.current.state.positions[1]).toBe(finalDest)
    }, { timeout: 5000 })
  }, 15000)
})
