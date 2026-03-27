import { useState } from 'react'
import { Board } from '@/components/board'
import { Controls } from '@/components/controls'
import { Credits } from '@/components/credits'
import { QuantumLog } from '@/components/quantum-log'
import { useGame } from '@/hooks/use-game'

function App() {
  const { state, selectQubit, placeQubit, randomPlaceAll, confirmPass, handleRoll, reset } = useGame()
  const [page, setPage] = useState<'game' | 'credits'>('game')

  if (page === 'credits') {
    return <Credits onBack={() => setPage('game')} />
  }

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
            onCellClick={placeQubit}
          />
          <Controls
            state={state}
            onRoll={handleRoll}
            onReset={reset}
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
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-3 text-center">
        <button
          className="text-text-secondary text-xs font-body hover:text-text cursor-pointer transition-colors"
          onClick={() => setPage('credits')}
        >
          Credits
        </button>
      </footer>

      {/* Quokka Log Panel */}
      <QuantumLog logs={state.logs} />
    </div>
  )
}

export default App
