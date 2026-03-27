import { Board } from '@/components/board'
import { Controls } from '@/components/controls'
import { useGame } from '@/hooks/use-game'

function App() {
  const { state, handleRoll, reset } = useGame()

  return (
    <div className="scanlines relative min-h-screen flex flex-col items-center justify-center bg-bg-deep font-body text-text-primary overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-linear-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]" />

      {/* Floating orbs for glassmorphism blur content */}
      <div className="fixed top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-neon-pink/15 blur-[100px] animate-orb-drift-slow" />
      <div className="fixed bottom-1/3 right-1/4 w-[250px] h-[250px] rounded-full bg-neon-cyan/20 blur-[80px] animate-orb-drift-fast" />
      <div className="fixed top-2/3 left-1/2 w-[200px] h-[200px] rounded-full bg-neon-yellow/10 blur-[90px] animate-orb-drift-slow" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-5 p-4">
        <h1 className="font-display text-[1.5rem] lg:text-[2rem] text-neon-pink animate-neon-pulse select-none">
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
