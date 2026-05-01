import { useQueryState } from 'nuqs'

export function useDebugMode(): boolean {
  const [d] = useQueryState('d')
  return d === '1'
}
