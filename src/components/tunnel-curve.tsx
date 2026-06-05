/**
 * TunnelCurve — P(통과) vs φ 간섭 곡선 시각화 컴포넌트
 *
 * φ ∈ [0, 2π) 구간에서 P = sin²(θ)·cos²(φ/2) 곡선을 SVG로 렌더하고,
 * 현재 φ 위치에 마커를 표시한다. cos²(φ/2) > 0.9 일 때 공명 배지를 표시.
 */

import { useMemo } from 'react'
import {
  BARRIER_THETA,
  buildCurveSamples,
  isResonant,
  tunnelPassProbability,
} from '@/lib/tunnel-circuit'

interface TunnelCurveProps {
  /** 현재 위상 φ (라디안, 0 이상 2π 미만) */
  phi: number
  /** 배리어 회전각 θ. 기본값: BARRIER_THETA (1.2) */
  theta?: number
}

/** SVG 뷰박스 치수 */
const SVG_W = 260
const SVG_H = 68
const PAD_L = 24
const PAD_R = 8
const PAD_T = 8
const PAD_B = 18
const PLOT_W = SVG_W - PAD_L - PAD_R
const PLOT_H = SVG_H - PAD_T - PAD_B

const TWO_PI = 2 * Math.PI

/**
 * φ 값 → SVG x 좌표
 */
function phiToX(phi: number): number {
  return PAD_L + (phi / TWO_PI) * PLOT_W
}

/**
 * P 값 → SVG y 좌표 (위가 0, 아래가 1)
 */
function probToY(p: number): number {
  return PAD_T + (1 - p) * PLOT_H
}

export function TunnelCurve({ phi, theta = BARRIER_THETA }: TunnelCurveProps) {
  const { phis, probs } = useMemo(() => buildCurveSamples(theta), [theta])

  const pathD = useMemo(() => {
    const parts: string[] = []
    for (let i = 0; i < phis.length; i++) {
      const x = phiToX(phis[i])
      const y = probToY(probs[i])
      parts.push(i === 0 ? `M${x.toFixed(2)},${y.toFixed(2)}` : `L${x.toFixed(2)},${y.toFixed(2)}`)
    }
    return parts.join(' ')
  }, [phis, probs])

  const currentP = tunnelPassProbability(theta, phi)
  const resonant = isResonant(phi)

  const markerX = phiToX(phi)
  const markerY = probToY(currentP)
  const pPercent = (currentP * 100).toFixed(1)

  // 라벨 위치: 마커 오른쪽에 붙이되 경계 넘지 않도록 조정
  const labelX = markerX + PAD_L > SVG_W - 36 ? markerX - 2 : markerX + 3
  const labelAnchor = markerX + PAD_L > SVG_W - 36 ? 'end' : 'start'

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        background: 'rgba(44, 74, 124, 0.04)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-2 pt-1.5 pb-0.5"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <span className="font-mono text-[0.6rem] font-semibold tracking-wide uppercase">
          P(pass) vs φ
        </span>
        <div className="flex items-center gap-1.5">
          {resonant && (
            <span
              className="px-1.5 py-0.5 rounded-full font-mono text-[0.55rem] font-bold leading-none"
              style={{
                background: 'rgba(124, 94, 16, 0.15)',
                color: '#7c5e10',
                border: '1px solid rgba(124, 94, 16, 0.3)',
              }}
              aria-label="공명 상태"
            >
              &#x26A1; 공명
            </span>
          )}
          <span
            className="font-mono text-[0.6rem] tabular-nums"
            style={{ color: '#2c4a7c' }}
          >
            φ={phi.toFixed(3)}
          </span>
        </div>
      </div>

      {/* 텍스트 회로 폴백: ry(θ)·rz(φ)·ry(θ) */}
      <div
        className="px-2 pb-0.5 font-mono text-[0.55rem]"
        style={{ color: 'var(--color-text-secondary)' }}
        aria-label="터널 간섭계 회로"
      >
        ry({theta.toFixed(3)}) · rz({phi.toFixed(3)}) · ry({theta.toFixed(3)})
      </div>

      {/* SVG 곡선 */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width="100%"
        aria-label={`양자 터널링 간섭 곡선. 현재 φ=${phi.toFixed(3)} rad, 통과확률 ${pPercent}%`}
        role="img"
        style={{ display: 'block' }}
      >
        {/* 축 */}
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth="0.5"
        />
        <line
          x1={PAD_L}
          y1={PAD_T}
          x2={PAD_L}
          y2={PAD_T + PLOT_H}
          stroke="var(--color-border)"
          strokeWidth="0.5"
        />

        {/* y축 레이블 */}
        <text
          x={PAD_L - 2}
          y={PAD_T + 3}
          textAnchor="end"
          fontSize="5"
          fill="var(--color-text-secondary)"
          fontFamily="ui-monospace, monospace"
        >
          1
        </text>
        <text
          x={PAD_L - 2}
          y={PAD_T + PLOT_H}
          textAnchor="end"
          fontSize="5"
          fill="var(--color-text-secondary)"
          fontFamily="ui-monospace, monospace"
        >
          0
        </text>

        {/* x축 레이블 */}
        <text
          x={PAD_L}
          y={SVG_H - 3}
          textAnchor="middle"
          fontSize="5"
          fill="var(--color-text-secondary)"
          fontFamily="ui-monospace, monospace"
        >
          0
        </text>
        <text
          x={PAD_L + PLOT_W / 2}
          y={SVG_H - 3}
          textAnchor="middle"
          fontSize="5"
          fill="var(--color-text-secondary)"
          fontFamily="ui-monospace, monospace"
        >
          π
        </text>
        <text
          x={PAD_L + PLOT_W}
          y={SVG_H - 3}
          textAnchor="middle"
          fontSize="5"
          fill="var(--color-text-secondary)"
          fontFamily="ui-monospace, monospace"
        >
          2π
        </text>

        {/* 곡선 영역 (fill) */}
        <path
          d={`${pathD} L${(PAD_L + PLOT_W).toFixed(2)},${(PAD_T + PLOT_H).toFixed(2)} L${PAD_L.toFixed(2)},${(PAD_T + PLOT_H).toFixed(2)} Z`}
          fill="rgba(44, 74, 124, 0.08)"
          stroke="none"
        />

        {/* 곡선 선 */}
        <path
          d={pathD}
          fill="none"
          stroke="#2c4a7c"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 현재 φ 수직 점선 */}
        <line
          x1={markerX}
          y1={PAD_T}
          x2={markerX}
          y2={PAD_T + PLOT_H}
          stroke={resonant ? '#7c5e10' : '#2c4a7c'}
          strokeWidth="0.75"
          strokeDasharray="2 2"
          opacity="0.6"
        />

        {/* 현재 위치 마커 점 */}
        <circle
          cx={markerX}
          cy={markerY}
          r="3"
          fill={resonant ? '#7c5e10' : '#2c4a7c'}
          stroke="var(--color-surface)"
          strokeWidth="1"
        />

        {/* P(pass)% 라벨 */}
        <text
          x={labelX}
          y={markerY - 3}
          textAnchor={labelAnchor}
          fontSize="5.5"
          fill={resonant ? '#7c5e10' : '#2c4a7c'}
          fontFamily="ui-monospace, monospace"
          fontWeight="600"
        >
          {pPercent}%
        </text>
      </svg>
    </div>
  )
}
