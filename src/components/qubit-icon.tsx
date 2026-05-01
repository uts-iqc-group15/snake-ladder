import { GiAtom, GiAtomicSlashes } from 'react-icons/gi'

interface QubitIconProps {
  entangled?: boolean
  className?: string
}

export function QubitIcon({ entangled = false, className }: QubitIconProps) {
  const Icon = entangled ? GiAtomicSlashes : GiAtom
  return (
    <Icon
      className={className}
      aria-label={entangled ? 'Entangled qubit' : 'Qubit'}
    />
  )
}
