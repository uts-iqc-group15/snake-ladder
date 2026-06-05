import type { LogEntry } from '@/types/game'

/**
 * 로그 배열에서 가장 최근 터널 회로의 φ를 파싱한다.
 *
 * use-play / use-game 이 addLog('info', `Tunnel circuit: φ=${phi.toFixed(4)} rad, ...`)
 * 형태로 기록하므로, 해당 패턴을 정규식으로 추출한다.
 *
 * @returns φ 라디안 값, 또는 해당 로그가 없으면 null
 */
export function parseLatestTunnelPhi(logs: LogEntry[]): number | null {
  const pattern = /Tunnel circuit: φ=([\d.]+) rad/
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].type === 'info') {
      const m = logs[i].message.match(pattern)
      if (m) {
        const val = parseFloat(m[1])
        return Number.isFinite(val) ? val : null
      }
    }
  }
  return null
}
