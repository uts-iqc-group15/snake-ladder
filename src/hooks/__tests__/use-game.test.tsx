import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGame } from '@/hooks/use-game'
import { sendToQuokka } from '@/lib/quokka'
import {
  DEFAULT_SETTINGS,
  SettingsContext,
  resolveTimings,
  type Settings,
} from '@/lib/settings'

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

// Debug mode is read from the URL via nuqs; mock it directly so individual
// tests can flip the flag without touching the query-state plumbing.
const debugModeMock = vi.fn<() => boolean>(() => false)
vi.mock('@/hooks/use-debug-mode', () => ({
  useDebugMode: () => debugModeMock(),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

// Wrapper that pins a specific Settings value so tests can verify how the
// runtime reads (or ignores) stored overrides.
function makeWrapperWithSettings(overrides: Partial<Settings>) {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...overrides }
  return function SettingsWrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    return (
      <QueryClientProvider client={client}>
        <SettingsContext.Provider
          value={{
            settings,
            setSettings: () => {},
            timings: resolveTimings(settings),
          }}
        >
          {children}
        </SettingsContext.Provider>
      </QueryClientProvider>
    )
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  debugModeMock.mockReturnValue(false)
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

describe('useGame — tunneling through the opponent', () => {
  async function setupBackHalfQubits(
    result: { current: ReturnType<typeof useGame> },
  ) {
    const placeAt = async (configIndex: number, cell: number) => {
      await act(async () => {
        result.current.selectQubit(configIndex)
      })
      await act(async () => {
        result.current.placeQubit(cell)
      })
    }
    // Park every qubit deep in the back half so cells 2–10 stay empty.
    await placeAt(0, 80)
    await placeAt(1, 81)
    await placeAt(2, 82)
    await placeAt(3, 83)
    await placeAt(4, 84)
    await act(async () => {
      result.current.confirmPass()
    })
    await placeAt(0, 90)
    await placeAt(1, 91)
    await placeAt(2, 92)
    await placeAt(3, 93)
    await placeAt(4, 94)
    await act(async () => {
      result.current.confirmPass()
    })
  }
  it('lands one square past the opponent when the 10% gate passes', async () => {
    const { result } = renderHook(() => useGame(), { wrapper })
    await setupBackHalfQubits(result)

    // P1: 1 → 4 (no opponent on 4 yet — opponent still at 1).
    await act(async () => {
      await result.current.handleRoll(3)
    })
    expect(result.current.state.positions[0]).toBe(4)

    // Force shouldTunnel() → true (random < 0.1).
    vi.spyOn(Math, 'random').mockReturnValue(0.05)

    // P2 rolls 3 → would land on 4 (P1's cell) → tunnels one extra step to 5.
    await act(async () => {
      await result.current.handleRoll(3)
    })
    await waitFor(() => {
      expect(result.current.state.positions[1]).toBe(5)
    })
  })

  it('stops on the opponent square when the 10% gate fails (debug on)', async () => {
    debugModeMock.mockReturnValue(true)
    const { result } = renderHook(() => useGame(), { wrapper })
    await setupBackHalfQubits(result)

    await act(async () => {
      await result.current.handleRoll(3)
    })
    expect(result.current.state.positions[0]).toBe(4)

    // Force shouldTunnel() → false (random ≥ 0.1).
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    await act(async () => {
      await result.current.handleRoll(3)
    })
    await waitFor(() => {
      expect(result.current.state.positions[1]).toBe(4)
    })
  })

  it('ignores a stored tunnelProbability override when debug is off', async () => {
    // Stored override would force a tunnel every time (100%) — but with debug
    // off the runtime must fall back to the 10% default, so a 0.5 random fails.
    const customWrapper = makeWrapperWithSettings({ tunnelProbability: 1 })
    const { result } = renderHook(() => useGame(), { wrapper: customWrapper })
    await setupBackHalfQubits(result)

    await act(async () => {
      await result.current.handleRoll(3)
    })
    expect(result.current.state.positions[0]).toBe(4)

    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    await act(async () => {
      await result.current.handleRoll(3)
    })
    await waitFor(() => {
      // No tunnel — stored override is debug-only, default 10% wins here.
      expect(result.current.state.positions[1]).toBe(4)
    })
  })

  it('applies the stored tunnelProbability override when debug is on', async () => {
    debugModeMock.mockReturnValue(true)
    // Stored override = 1.0 → shouldTunnel short-circuits to true regardless
    // of Math.random, so the piece must phase past the opponent.
    const customWrapper = makeWrapperWithSettings({ tunnelProbability: 1 })
    const { result } = renderHook(() => useGame(), { wrapper: customWrapper })
    await setupBackHalfQubits(result)

    await act(async () => {
      await result.current.handleRoll(3)
    })
    expect(result.current.state.positions[0]).toBe(4)

    // Set Math.random high enough to fail the default 10% gate; with the
    // override active the result should still tunnel.
    vi.spyOn(Math, 'random').mockReturnValue(0.99)

    await act(async () => {
      await result.current.handleRoll(3)
    })
    await waitFor(() => {
      expect(result.current.state.positions[1]).toBe(5)
    })
  })
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

describe('useGame — player path tracking', () => {
  // Place all 10 qubits at the same low-edge cells for both players. Every
  // placement collides, so every qubit ends up as 'interference' — landing on
  // an interference qubit doesn't trigger collapse or sliding, which lets the
  // tests drive players freely up the board without random detours.
  async function setupInterferenceLowZone(
    result: { current: ReturnType<typeof useGame> },
  ) {
    const placeAt = async (configIndex: number, cell: number) => {
      await act(async () => {
        result.current.selectQubit(configIndex)
      })
      await act(async () => {
        result.current.placeQubit(cell)
      })
    }
    const cells = [6, 7, 8, 9, 10]
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < cells.length; i++) {
        await placeAt(i, cells[i])
      }
      await act(async () => {
        result.current.confirmPass()
      })
    }
  }

  it('paths start at cell 1 for both players', () => {
    const { result } = renderHook(() => useGame(), { wrapper })
    expect(result.current.state.paths).toEqual([[1], [1]])
  })

  it('records every cell hopped through during a normal roll', async () => {
    const { result } = renderHook(() => useGame(), { wrapper })
    await setupInterferenceLowZone(result)

    // P1: 1 → 2 → 3 → 4 (rolled 3, no qubits in the way).
    await act(async () => {
      await result.current.handleRoll(3)
    })
    await waitFor(() => {
      expect(result.current.state.positions[0]).toBe(4)
    })
    expect(result.current.state.paths[0]).toEqual([1, 2, 3, 4])
    // P2 has not moved yet.
    expect(result.current.state.paths[1]).toEqual([1])
  })

  it('captures the bounce-back detour when the roll overshoots TOTAL_CELLS', async () => {
    const { result } = renderHook(() => useGame(), { wrapper })
    await setupInterferenceLowZone(result)

    // Walk P1 to cell 97, then roll 6 to force a bounce off 100 back to 97.
    await act(async () => {
      await result.current.handleRoll(6)
    })
    await waitFor(() => {
      expect(result.current.state.currentPlayer).toBe(1)
    })
    // P2 just inches forward to clear their turn.
    await act(async () => {
      await result.current.handleRoll(1)
    })
    await waitFor(() => {
      expect(result.current.state.currentPlayer).toBe(0)
    })

    // Crank P1 up to cell 97 in big jumps.
    const climb = async (step: number, expected: number) => {
      await act(async () => {
        await result.current.handleRoll(step)
      })
      await waitFor(() => {
        expect(result.current.state.positions[0]).toBe(expected)
      })
      // Skip P2's turn with a 1.
      await act(async () => {
        await result.current.handleRoll(1)
      })
      await waitFor(() => {
        expect(result.current.state.currentPlayer).toBe(0)
      })
    }
    await climb(6, 13)
    await climb(6, 19)
    // Quickly pile P1 up to 97 — exact intermediate landings don't matter, we
    // only care that the bounce appends both 100 and the return cell.
    while (result.current.state.positions[0] < 97) {
      const remaining = 97 - result.current.state.positions[0]
      const step = Math.min(6, remaining)
      await climb(step, result.current.state.positions[0] + step)
    }
    expect(result.current.state.positions[0]).toBe(97)

    // Now roll 6 — overshoots, bounces.
    await act(async () => {
      await result.current.handleRoll(6)
    })
    await waitFor(() => {
      expect(result.current.state.positions[0]).toBe(97)
    })

    const path = result.current.state.paths[0]
    // Path must include 100 (apex) followed by 99, 98, 97 on the way back.
    const apexIdx = path.lastIndexOf(100)
    expect(apexIdx).toBeGreaterThan(-1)
    expect(path.slice(apexIdx)).toEqual([100, 99, 98, 97])
  }, 20000)

  it('records the tunnel destination (skipping the opponent cell intermediate)', async () => {
    debugModeMock.mockReturnValue(true)
    const { result } = renderHook(() => useGame(), { wrapper })
    await setupInterferenceLowZone(result)

    await act(async () => {
      await result.current.handleRoll(3)
    })
    expect(result.current.state.paths[0]).toEqual([1, 2, 3, 4])

    vi.spyOn(Math, 'random').mockReturnValue(0.05)

    // P2: 1 → 2 → 3 → 4 → 5 (tunneled past P1 at 4).
    await act(async () => {
      await result.current.handleRoll(3)
    })
    await waitFor(() => {
      expect(result.current.state.positions[1]).toBe(5)
    })
    expect(result.current.state.paths[1]).toEqual([1, 2, 3, 4, 5])
  })
})
