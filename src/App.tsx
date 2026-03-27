import { Board } from '@/components/Board'
import { Controls } from '@/components/Controls'
import { useGame } from '@/hooks/useGame'
import styles from './App.module.css'

function App() {
  const { state, handleRoll, reset } = useGame()

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Snake &amp; Ladder</h1>
      <div className={styles.gameArea}>
        <Board positions={state.positions} />
        <Controls state={state} onRoll={handleRoll} onReset={reset} />
      </div>
    </div>
  )
}

export default App
