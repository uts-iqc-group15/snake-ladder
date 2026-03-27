const TEAM = [
  {
    name: 'Evan Jones',
    role: 'Team Leader / Game Lead',
    email: 'EvanVanichphinyo.Jones@student.uts.edu.au',
  },
  {
    name: 'Sarah Hobson',
    role: 'Quantum Lead',
    email: 'Sarah.Hobson@student.uts.edu.au',
  },
  {
    name: 'Rithviknath Gali',
    role: 'Technical Plan',
    email: 'Rithhviknath.gali@student.uts.edu.au',
  },
  {
    name: 'Eunkwang Shin',
    role: 'Prototype',
    email: 'Eunkwang.Shin@student.uts.edu.au',
  },
  {
    name: 'Irfan Faisal',
    role: 'Documentation',
    email: 'irfan.faisal@student.uts.edu.au',
  },
] as const

interface CreditsProps {
  onBack: () => void
}

export function Credits({ onBack }: CreditsProps) {
  return (
    <div className="paper-bg min-h-screen flex flex-col items-center justify-center font-body text-text p-4">
      <div className="card-panel w-full max-w-lg p-8">
        <h1 className="font-display text-2xl font-bold text-center mb-2">
          Credits
        </h1>
        <p className="text-text-secondary text-sm text-center mb-6">
          Snakes OR Ladders — Team Members
        </p>

        <div className="flex flex-col gap-4">
          {TEAM.map((member) => (
            <div
              key={member.email}
              className="flex items-start gap-4 p-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg)]"
            >
              <div
                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-text-inverse"
                style={{ background: 'var(--color-board-dark)' }}
              >
                {member.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm">{member.name}</div>
                <div className="text-text-secondary text-xs mt-0.5">
                  {member.role}
                </div>
                <a
                  href={`mailto:${member.email}`}
                  className="text-[var(--color-player-2)] text-xs hover:underline break-all"
                >
                  {member.email}
                </a>
              </div>
            </div>
          ))}
        </div>

        <button
          className="mt-6 w-full py-2.5 text-sm font-bold text-text-inverse rounded-[var(--radius-button)] cursor-pointer transition-all hover:brightness-90"
          style={{ background: 'var(--color-board-dark)' }}
          onClick={onBack}
        >
          Back to Game
        </button>
      </div>
    </div>
  )
}
