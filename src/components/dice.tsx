// Dot position layouts for each dice face (1-6)
// Grid: 3x3 positions → top-left, top-center, top-right, mid-left, center, mid-right, bot-left, bot-center, bot-right
const DOT_LAYOUTS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

interface DiceProps {
  value: number
  rolling?: boolean
}

export function Dice({ value, rolling }: DiceProps) {
  const dots = DOT_LAYOUTS[value] ?? DOT_LAYOUTS[6]

  return (
    <div
      className={`w-16 h-16 lg:w-[4.5rem] lg:h-[4.5rem] rounded-xl grid grid-cols-3 grid-rows-3 p-2 gap-0.5 select-none ${rolling ? 'animate-dice-roll' : ''}`}
      style={{
        background: 'linear-gradient(145deg, #2a2050, #1a1040)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow:
          '0 0 12px var(--color-neon-yellow), inset 0 1px 1px rgba(255,255,255,0.1), 0 4px 8px rgba(0,0,0,0.4)',
      }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex items-center justify-center">
          {dots.includes(i) && (
            <div
              className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #fff, #e0e0e0)',
                boxShadow: '0 0 4px rgba(255, 225, 86, 0.6), inset 0 -1px 2px rgba(0,0,0,0.2)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
