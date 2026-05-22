import { useEffect, useRef, useState } from 'react'
import { useKeyPress } from 'ahooks'
import { LuSettings, LuUsers } from 'react-icons/lu'
import confetti from 'canvas-confetti'
import { Board } from '@/components/board'
import { Controls } from '@/components/controls'
import { Credits } from '@/components/credits'
import { Poc } from '@/components/poc'
import { QuantumLog } from '@/components/quantum-log'
import { SettingsModal } from '@/components/settings-modal'
import { useDebugMode } from '@/hooks/use-debug-mode'
import { useGame } from '@/hooks/use-game'

type Page = 'poc' | 'complete' | 'credits'

function getPageFromHash(): Page {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'poc' || hash === 'credits') return hash
  return 'complete'
}

function App() {
  const { state, selectQubit, placeQubit, randomPlaceAll, confirmPass, handleRoll, reset } = useGame()
  const [page, setPage] = useState<Page>(getPageFromHash)
  const [winOverlayDismissed, setWinOverlayDismissed] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmNewGameOpen, setConfirmNewGameOpen] = useState(false)
  const confettiFired = useRef(false)
  const debug = useDebugMode()

  const handleReset = () => {
    setWinOverlayDismissed(false)
    reset()
  }

  const confirmNewGame = () => {
    setConfirmNewGameOpen(false)
    handleReset()
  }

  const isOverlayOpen =
    settingsOpen ||
    confirmNewGameOpen ||
    state.phase === 'passing' ||
    (state.gameOver && !winOverlayDismissed)

  const isTypingTarget = () => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return false
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable
    )
  }

  const navigate = (p: Page) => {
    window.location.hash = p === 'complete' ? '' : p
    setPage(p)
  }

  useEffect(() => {
    const onHashChange = () => setPage(getPageFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useKeyPress(
    'space',
    (e) => {
      if (page !== 'complete' || isOverlayOpen || isTypingTarget()) return
      if (
        state.phase !== 'play' ||
        state.isRolling ||
        state.isCollapsing ||
        state.gameOver
      ) {
        return
      }
      e.preventDefault()
      handleRoll()
    },
    { exactMatch: true },
  )

  useKeyPress(
    'r',
    (e) => {
      if (page !== 'complete' || isOverlayOpen || isTypingTarget()) return
      if (state.phase !== 'setup') return
      if (state.setupRemaining[state.currentPlayer].length === 0) return
      e.preventDefault()
      randomPlaceAll()
    },
    { exactMatch: true },
  )

  useKeyPress(
    'n',
    (e) => {
      if (page !== 'complete' || settingsOpen || confirmNewGameOpen || isTypingTarget()) return
      e.preventDefault()
      setConfirmNewGameOpen(true)
    },
    { exactMatch: true },
  )

  useKeyPress(
    'enter',
    (e) => {
      if (confirmNewGameOpen) {
        e.preventDefault()
        confirmNewGame()
        return
      }
      if (state.phase === 'passing' && page === 'complete' && !settingsOpen) {
        e.preventDefault()
        confirmPass()
      }
    },
  )

  useKeyPress(
    'esc',
    (e) => {
      if (!confirmNewGameOpen) return
      e.preventDefault()
      setConfirmNewGameOpen(false)
    },
  )

  useEffect(() => {
    if (!debug) return
    if (state.phase === 'setup' && state.setupRemaining[state.currentPlayer].length > 0) {
      randomPlaceAll(50)
    } else if (state.phase === 'passing') {
      confirmPass()
    }
  }, [debug, state.phase, state.currentPlayer, state.setupRemaining, randomPlaceAll, confirmPass])

  useEffect(() => {
    if (state.gameOver && !confettiFired.current) {
      confettiFired.current = true
      const end = Date.now() + 2500
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } })
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }
    if (!state.gameOver) {
      confettiFired.current = false
    }
  }, [state.gameOver])

  if (page === 'credits') {
    return <Credits onBack={() => navigate('complete')} />
  }

  if (page === 'poc') {
    return <Poc />
  }

  // page === 'complete'
  return (
    <div className="paper-bg min-h-screen flex flex-col items-center justify-center font-body text-text">
      <div className="flex flex-col items-center gap-5 p-4">
        <h1 className="font-display text-[1.75rem] lg:text-[2.25rem] text-text font-bold select-none">
          Snakes OR Ladders
        </h1>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <Board
            positions={state.positions}
            qubits={state.qubits}
            currentPlayer={state.currentPlayer}
            phase={state.phase}
            selectedConfigIndex={state.selectedConfigIndex}
            slidingPlayer={state.slidingPlayer}
            overshootPlayer={state.overshootPlayer}
            onCellClick={placeQubit}
          />
          <Controls
            state={state}
            onRoll={handleRoll}
            onReset={() => setConfirmNewGameOpen(true)}
            onSelectQubit={selectQubit}
            onRandomPlace={randomPlaceAll}
          />
        </div>
      </div>

      {/* Pass device overlay */}
      {state.phase === 'passing' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(0,0,0,0.85)]"
          onClick={confirmPass}
        >
          <div className="flex flex-col items-center gap-6 p-8 card-panel max-w-sm text-center">
            <div className="text-2xl font-bold text-text">
              Pass to Player {state.currentPlayer + 1}
            </div>
            <div className="text-text-secondary text-sm">
              {state.setupRemaining[state.currentPlayer].length > 0
                ? 'Your turn to place quantum items on the board.'
                : 'Setup complete! The game will begin.'}
            </div>
            <button
              className="py-3 px-8 text-sm font-bold text-text-inverse rounded-[var(--radius-button)] cursor-pointer transition-all hover:brightness-90"
              style={{
                background:
                  state.currentPlayer === 0
                    ? 'var(--color-player-1)'
                    : 'var(--color-player-2)',
              }}
              onClick={confirmPass}
            >
              Continue <span className="opacity-70 font-mono">(Enter)</span>
            </button>
          </div>
        </div>
      )}

      {/* Win overlay */}
      {state.gameOver && !winOverlayDismissed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.85)] cursor-pointer"
          onClick={() => setWinOverlayDismissed(true)}
        >
          <div
            className="flex flex-col items-center gap-6 p-10 card-panel max-w-md text-center cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-text-secondary">
              Quantum Victory
            </div>
            <div
              className="text-4xl font-display font-bold"
              style={{
                color:
                  state.currentPlayer === 0
                    ? 'var(--color-player-1)'
                    : 'var(--color-player-2)',
              }}
            >
              Player {state.currentPlayer + 1} Wins!
            </div>
            <div className="text-text-secondary text-sm">
              Click anywhere to view the final board.
            </div>
            <div className="flex gap-3">
              <button
                className="py-3 px-6 text-sm font-bold text-text-inverse rounded-[var(--radius-button)] cursor-pointer transition-all hover:brightness-90"
                style={{
                  background:
                    state.currentPlayer === 0
                      ? 'var(--color-player-1)'
                      : 'var(--color-player-2)',
                }}
                onClick={handleReset}
              >
                New Game
              </button>
              <button
                className="py-3 px-6 text-sm text-text-secondary rounded-[var(--radius-button)] bg-transparent border-[1.5px] border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)]"
                onClick={() => setWinOverlayDismissed(true)}
              >
                View Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-3 text-center flex justify-center items-center gap-4">
        <button
          className="text-text-secondary text-xs font-body hover:text-text cursor-pointer transition-colors flex items-center gap-1"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
        >
          <LuSettings className="text-sm" />
          Settings
        </button>
        <button
          className="text-text-secondary text-xs font-body hover:text-text cursor-pointer transition-colors flex items-center gap-1"
          onClick={() => navigate('credits')}
          aria-label="View credits"
        >
          <LuUsers className="text-sm" />
          Credits
        </button>
      </footer>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* New Game Confirm Modal */}
      {confirmNewGameOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.75)] cursor-pointer"
          onClick={() => setConfirmNewGameOpen(false)}
        >
          <div
            className="flex flex-col gap-5 p-8 card-panel max-w-md w-[min(90vw,24rem)] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xl font-display font-bold text-text">
              Start a new game?
            </div>
            <div className="text-text-secondary text-sm">
              Current game progress will be lost.
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="py-2 px-5 text-sm text-text-secondary rounded-[var(--radius-button)] bg-transparent border-[1.5px] border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-surface-hover)]"
                onClick={() => setConfirmNewGameOpen(false)}
              >
                Cancel <span className="opacity-60 font-mono">(Esc)</span>
              </button>
              <button
                className="py-2 px-5 text-sm font-bold text-text-inverse rounded-[var(--radius-button)] bg-player-1 cursor-pointer transition-all hover:brightness-90"
                onClick={confirmNewGame}
              >
                New Game <span className="opacity-70 font-mono">(Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quokka Log Panel */}
      <QuantumLog logs={state.logs} />
    </div>
  )
}

export default App
