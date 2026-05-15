const DOT_LAYOUTS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

const FACE_PLACEMENT: Record<number, string> = {
  1: 'translateZ(var(--dice-half))',
  2: 'rotateY(90deg) translateZ(var(--dice-half))',
  3: 'rotateX(90deg) translateZ(var(--dice-half))',
  4: 'rotateX(-90deg) translateZ(var(--dice-half))',
  5: 'rotateY(-90deg) translateZ(var(--dice-half))',
  6: 'rotateY(180deg) translateZ(var(--dice-half))',
}

const FACE_TO_FRONT: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(0deg) rotateY(-90deg)',
  3: 'rotateX(-90deg) rotateY(0deg)',
  4: 'rotateX(90deg) rotateY(0deg)',
  5: 'rotateX(0deg) rotateY(90deg)',
  6: 'rotateX(0deg) rotateY(-180deg)',
}

interface DiceProps {
  value: number
  rolling?: boolean
}

export function Dice({ value, rolling }: DiceProps) {
  const restTransform = FACE_TO_FRONT[value] ?? FACE_TO_FRONT[1]

  return (
    <div className="dice-3d w-16 h-16 lg:w-[4.5rem] lg:h-[4.5rem] select-none">
      <div
        className="dice-cube"
        data-rolling={rolling ? 'true' : 'false'}
        style={{ transform: restTransform }}
      >
        {[1, 2, 3, 4, 5, 6].map((face) => (
          <DiceFace key={face} face={face} />
        ))}
      </div>
    </div>
  )
}

function DiceFace({ face }: { face: number }) {
  const dots = DOT_LAYOUTS[face]
  return (
    <div className="dice-face" style={{ transform: FACE_PLACEMENT[face] }}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex items-center justify-center">
          {dots.includes(i) && (
            <div
              className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full"
              style={{
                background: 'radial-gradient(circle at 35% 35%, #5a4a3a, #3a3226)',
                boxShadow: '0 0.5px 1px rgba(0,0,0,0.15), inset 0 0.5px 0 rgba(255,255,255,0.2)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
