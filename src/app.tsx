import { Board } from '@/components/board'
import { Controls } from '@/components/controls'
import { useGame } from '@/hooks/use-game'

function App() {
  const { state, handleRoll, reset } = useGame()

  return (
    <div className="paper-bg min-h-screen flex flex-col items-center justify-center font-body text-text">
      <div className="flex flex-col items-center gap-5 p-4">
        <h1 className="font-display text-[1.75rem] lg:text-[2.25rem] text-text font-bold select-none">
          Snake &amp; Ladder
        </h1>

        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <Board positions={state.positions} />
          <Controls state={state} onRoll={handleRoll} onReset={reset} />
        </div>
      </div>
    </div>
  )
}

export default App
