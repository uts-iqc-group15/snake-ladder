import { describe, expect, it } from 'vitest'
import { parseLatestTunnelPhi } from '@/lib/parse-tunnel-log'
import type { LogEntry } from '@/hooks/use-game'

function makeLog(type: LogEntry['type'], message: string): LogEntry {
  return { type, message, timestamp: Date.now() }
}

describe('parseLatestTunnelPhi', () => {
  it('로그가 비어 있으면 null 반환', () => {
    expect(parseLatestTunnelPhi([])).toBeNull()
  })

  it('터널 로그가 없으면 null 반환', () => {
    const logs: LogEntry[] = [
      makeLog('info', 'Player 1 rolled 3'),
      makeLog('qasm', 'OPENQASM 2.0;'),
    ]
    expect(parseLatestTunnelPhi(logs)).toBeNull()
  })

  it('Tunnel circuit 로그에서 φ를 파싱한다', () => {
    const phi = 0.7854
    const logs: LogEntry[] = [
      makeLog('info', `Tunnel circuit: φ=${phi.toFixed(4)} rad, P(pass)=0.8640`),
    ]
    const result = parseLatestTunnelPhi(logs)
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(phi, 3)
  })

  it('여러 터널 로그 중 가장 최근(마지막) φ를 반환', () => {
    const logs: LogEntry[] = [
      makeLog('info', 'Tunnel circuit: φ=0.7854 rad, P(pass)=0.8640'),
      makeLog('info', 'Player 1 moved'),
      makeLog('info', 'Tunnel circuit: φ=1.5708 rad, P(pass)=0.4320'),
    ]
    const result = parseLatestTunnelPhi(logs)
    expect(result).toBeCloseTo(1.5708, 3)
  })

  it('φ=0 인 경우도 올바르게 파싱', () => {
    const logs: LogEntry[] = [
      makeLog('info', 'Tunnel circuit: φ=0.0000 rad, P(pass)=0.8640'),
    ]
    const result = parseLatestTunnelPhi(logs)
    expect(result).toBeCloseTo(0, 3)
  })

  it('공명 배지 텍스트가 포함된 로그도 파싱', () => {
    const logs: LogEntry[] = [
      makeLog('info', 'Tunnel circuit: φ=0.0000 rad, P(pass)=0.8640 [RESONANCE]'),
    ]
    const result = parseLatestTunnelPhi(logs)
    expect(result).not.toBeNull()
    expect(result!).toBeCloseTo(0, 3)
  })

  it('info 타입이 아닌 로그는 무시', () => {
    const logs: LogEntry[] = [
      makeLog('qasm', 'Tunnel circuit: φ=1.2345 rad, fake'),
      makeLog('result', 'Tunnel circuit: φ=9.9999 rad, fake'),
      makeLog('error', 'Tunnel circuit: φ=8.8888 rad, fake'),
    ]
    // 위의 로그들은 info 타입이 아니므로 무시, null 반환
    expect(parseLatestTunnelPhi(logs)).toBeNull()
  })

  it('숫자가 아닌 φ 값이면 null 반환', () => {
    const logs: LogEntry[] = [
      makeLog('info', 'Tunnel circuit: φ=NaN rad, P(pass)=0'),
    ]
    // NaN은 parseFloat('NaN') = NaN → Number.isFinite 실패 → null
    expect(parseLatestTunnelPhi(logs)).toBeNull()
  })
})
