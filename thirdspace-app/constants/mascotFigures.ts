// Reward mascot figures, transcribed from docs/rewards_avatar.html.
//
// WHY THIS IS DATA AND NOT 25 COMPONENTS: `__tests__/constants/tokens.test.ts` fails any
// quoted hex under app/ or components/, and every one of these characters is built from
// colours that are deliberately outside the brand palette — hot pink, cyan, lavender.
// They encode identity, exactly like the avatar tints in utils/avatar.ts, which is the
// other granted exemption. Keeping the colours here leaves components/Mascot.tsx free of
// literals, so the guard stays absolute rather than gaining an allowlist.
//
// Coordinates are the comp's 170x170 viewBox, untouched, so a figure can be diffed
// against the HTML line by line.

/**
 * Idle loops, matching the comp's keyframe names. Most apply to the whole figure;
 * 'blink' and 'drift' are also used on individual parts (an eyelid, a cloud of dots).
 */
export type MascotIdle = 'none' | 'bob' | 'wiggle' | 'pulse' | 'swing' | 'drift' | 'jump' | 'blink'

/** `'body'` resolves to the character's own radial gradient; anything else is literal. */
type Paint = string

interface Common {
  f?: Paint
  s?: Paint
  /** Stroke width. */
  w?: number
  o?: number
  /** SVG stroke-dasharray, verbatim. */
  dash?: string
  /** [degrees, originX, originY] — the comp's `transform="rotate(...)"`. */
  rot?: [number, number, number]
  /** Per-shape idle, for the parts that move independently of the body. */
  anim?: MascotIdle
  /** Animation offset in ms, so paired shapes (two eyelids) do not blink in lockstep. */
  delay?: number
  /** Orbit ring: 1 clockwise, -1 counter. Spins on its own timeline. */
  spin?: 1 | -1
  /** Seconds for one spin revolution. Defaults to the roster's standard 14s. */
  spinDur?: number
}

export type MascotShape =
  | ({ t: 'path'; d: string; cap?: boolean } & Common)
  | ({ t: 'circle'; cx: number; cy: number; r: number } & Common)
  | ({ t: 'ellipse'; cx: number; cy: number; rx: number; ry: number } & Common)
  | ({ t: 'rect'; x: number; y: number; width: number; height: number; rx?: number } & Common)
  | ({ t: 'line'; x1: number; y1: number; x2: number; y2: number } & Common)
  | ({ t: 'text'; x: number; y: number; size: number; v: string } & Common)

export interface MascotFigure {
  /** Radial gradient for the body. `[offset%, color]`, in order. */
  grad: { cx: string; cy: string; r: string; stops: [number, string][] }
  idle: MascotIdle
  shapes: MascotShape[]
}

const INK = '#161213'
const WHITE = '#fff'
const GOLD = '#FFD166'

/** Every character wears the same dashed orbit; only the tint and radius change. */
const ring = (cx: number, cy: number, r: number, s: string, o = 0.5, dash = '3 5', w = 1.6): MascotShape =>
  ({ t: 'circle', cx, cy, r, f: 'none', s, w, dash, o, spin: 1 })

/** The floating dots that sit outside the body, inside the orbit. */
const dot = (cx: number, cy: number, r: number, f: string): MascotShape => ({ t: 'circle', cx, cy, r, f })

/**
 * The five-point star used as an eye, a cheek mark, or a held sparkle. `k` scales the
 * comp's smallest variant; the roster uses three sizes and they differ by scale alone,
 * so one template covers all of them. `x, y` is the top point, as in the source paths.
 */
const star = (x: number, y: number, f: string, k = 1): MascotShape => {
  const p = (dx: number, dy: number) => `L${+(x + dx * k).toFixed(1)} ${+(y + dy * k).toFixed(1)}`
  return {
    t: 'path',
    d: `M${x} ${y} ${p(2, 4)} ${p(6, 5)} ${p(3, 8)} ${p(4, 12)} ${p(0, 10)} ${p(-4, 12)} ${p(-3, 8)} ${p(-6, 5)} ${p(-2, 4)}Z`,
    f,
  }
}

/** A curved mouth. Every character has one; only the sweep and weight change. */
const smile = (d: string, w = 4, s: string = INK): MascotShape => ({ t: 'path', d, s, w, f: 'none', cap: true })

export const MASCOT_FIGURES: Record<string, MascotFigure> = {
  'community-creator': {
    grad: { cx: '36%', cy: '24%', r: '82%', stops: [[0, '#D9B8FF'], [45, '#8B3FE0'], [100, '#4A1780']] },
    idle: 'pulse',
    shapes: [
      ring(85, 90, 72, '#B98BFF'),
      dot(24, 60, 4, '#F4D9FF'), dot(146, 70, 3.4, '#F4D9FF'), dot(130, 140, 4, '#F4D9FF'), dot(36, 132, 3, '#F4D9FF'),
      { t: 'path', d: 'M85 34 C104 44 100 60 118 66 C136 72 132 92 112 96 C126 106 118 128 98 128 C110 140 92 150 85 150 C78 150 60 140 72 128 C52 128 44 106 58 96 C38 92 34 72 52 66 C70 60 66 44 85 34Z', f: 'body' },
      { t: 'ellipse', cx: 66, cy: 94, rx: 9, ry: 11, f: INK },
      { t: 'ellipse', cx: 104, cy: 94, rx: 9, ry: 11, f: INK },
      { t: 'path', d: 'M66 88 L67.5 91.5 L71 93 L67.5 94.5 L66 98 L64.5 94.5 L61 93 L64.5 91.5Z', f: WHITE },
      { t: 'path', d: 'M104 88 L105.5 91.5 L109 93 L105.5 94.5 L104 98 L102.5 94.5 L99 93 L102.5 91.5Z', f: WHITE },
      smile('M66 114 Q85 126 104 114'),
    ],
  },

  'the-initiator': {
    grad: { cx: '30%', cy: '22%', r: '82%', stops: [[0, '#FFC79A'], [45, '#FF6A1F'], [100, '#C4360A']] },
    idle: 'none',
    shapes: [
      ring(85, 90, 72, '#FFD9B3'),
      dot(26, 50, 4, '#FFEFD9'), dot(148, 66, 3.4, '#FFEFD9'), dot(134, 138, 4, '#FFEFD9'), dot(30, 128, 3, '#FFEFD9'),
      { t: 'path', d: 'M85 30 C118 34 142 58 138 92 C135 120 112 140 85 148 C64 142 46 122 44 96 C42 66 58 34 85 30Z', f: 'body', rot: [-8, 85, 90] },
      star(118, 78, GOLD, 1.42),
      smile('M58 90 Q63 84 68 90'),
      { t: 'ellipse', cx: 98, cy: 90, rx: 8, ry: 10, f: INK },
      { t: 'circle', cx: 101, cy: 86, r: 2.4, f: WHITE },
      smile('M62 108 Q80 120 100 106'),
    ],
  },

  'the-welcomer': {
    grad: { cx: '34%', cy: '20%', r: '85%', stops: [[0, '#FFE9A8'], [45, '#F0A829'], [100, '#B4700F']] },
    idle: 'none',
    shapes: [
      ring(85, 90, 72, '#FFD98A'),
      dot(28, 56, 4, '#FFF3D0'), dot(144, 60, 3.4, '#FFF3D0'), dot(132, 136, 4, '#FFF3D0'), dot(32, 130, 3, '#FFF3D0'),
      { t: 'path', d: 'M85 26 C112 26 128 50 128 82 C128 122 112 148 85 148 C58 148 42 122 42 82 C42 50 58 26 85 26Z', f: 'body' },
      smile('M56 90 Q66 78 76 90', 5.5),
      { t: 'circle', cx: 106, cy: 88, r: 10, f: INK },
      { t: 'circle', cx: 110, cy: 83, r: 3, f: WHITE },
      { t: 'circle', cx: 60, cy: 100, r: 6, f: '#E8804A', o: 0.4 },
      { t: 'circle', cx: 112, cy: 100, r: 6, f: '#E8804A', o: 0.4 },
      smile('M62 112 Q85 128 108 110', 4.2),
      { t: 'path', d: 'M70 138 L70 148 L100 148 L100 138', f: 'none', s: INK, w: 2, o: 0.35 },
    ],
  },

  'experimenter-of-variety': {
    grad: { cx: '30%', cy: '24%', r: '85%', stops: [[0, '#D8B8FF'], [45, '#7B4FE0'], [100, '#2E9BB0']] },
    idle: 'none',
    shapes: [
      ring(85, 90, 72, '#C9A8FF'),
      dot(26, 54, 4, '#E8D9FF'), dot(146, 64, 3.4, '#E8D9FF'), dot(136, 136, 4, '#E8D9FF'), dot(28, 126, 3, '#E8D9FF'),
      { t: 'path', d: 'M90 30 C118 28 138 50 134 76 C150 82 148 108 128 116 C134 134 114 150 92 144 C80 156 56 150 54 130 C34 130 26 106 42 92 C30 78 42 54 64 56 C66 38 78 30 90 30Z', f: 'body' },
      { t: 'circle', cx: 68, cy: 92, r: 10, f: INK },
      { t: 'circle', cx: 72, cy: 88, r: 2.6, f: WHITE },
      star(104, 82, INK, 1.58),
      smile('M64 114 Q85 124 108 110'),
    ],
  },

  stage: {
    grad: { cx: '32%', cy: '20%', r: '88%', stops: [[0, '#FFAECD'], [45, '#E01F73'], [100, '#8A0F47']] },
    idle: 'none',
    shapes: [
      ring(85, 86, 72, '#FF9AC4'),
      dot(26, 50, 4, '#FFD9E8'), dot(146, 56, 3.4, '#FFD9E8'),
      // Spotlight cones, thrown from off-canvas onto the riser.
      { t: 'path', d: 'M50 10 L30 76 L60 76Z', f: '#FFE9A8', o: 0.35 },
      { t: 'path', d: 'M120 10 L140 76 L110 76Z', f: '#FFE9A8', o: 0.35 },
      { t: 'path', d: 'M22 150 L38 130 L132 130 L148 150Z', f: '#5C1F3A', s: INK, w: 1.6 },
      { t: 'rect', x: 22, y: 150, width: 126, height: 10, f: '#3E1327' },
      dot(42, 150, 3, GOLD), dot(85, 152, 3, GOLD), dot(128, 150, 3, GOLD),
      { t: 'path', d: 'M85 20 C110 20 128 44 126 74 C124 108 106 128 85 128 C64 128 46 108 44 74 C42 44 60 20 85 20Z', f: 'body' },
      smile('M60 78 Q64 72 68 78'),
      { t: 'circle', cx: 102, cy: 76, r: 8, f: INK },
      star(102, 70, GOLD),
      smile('M62 96 Q85 110 106 94'),
      // Mic, held up to the mouth.
      { t: 'ellipse', cx: 108, cy: 80, rx: 14, ry: 19, f: INK, rot: [-24, 108, 92] },
      { t: 'line', x1: 102, y1: 66, x2: 114, y2: 66, s: '#666', w: 1.8, rot: [-24, 108, 92] },
      { t: 'line', x1: 101, y1: 72, x2: 115, y2: 72, s: '#666', w: 1.8, rot: [-24, 108, 92] },
      { t: 'line', x1: 101, y1: 78, x2: 115, y2: 78, s: '#666', w: 1.8, rot: [-24, 108, 92] },
      { t: 'line', x1: 102, y1: 84, x2: 114, y2: 84, s: '#666', w: 1.8, rot: [-24, 108, 92] },
      { t: 'rect', x: 105, y: 98, width: 6, height: 34, rx: 3, f: INK, rot: [-24, 108, 92] },
    ],
  },

  eat: {
    grad: { cx: '32%', cy: '22%', r: '85%', stops: [[0, '#FFD19A'], [45, '#F2793C'], [100, '#A83E14']] },
    idle: 'none',
    shapes: [
      ring(85, 90, 72, '#FFB380'),
      dot(26, 56, 4, '#FFE0C2'), dot(146, 62, 3.4, '#FFE0C2'), dot(132, 136, 4, '#FFE0C2'), dot(30, 128, 3, '#FFE0C2'),
      { t: 'path', d: 'M85 30 C114 28 132 54 128 84 C142 90 138 114 118 118 C120 138 98 150 82 140 C62 150 42 134 50 116 C32 112 30 86 50 78 C46 52 64 32 85 30Z', f: 'body' },
      smile('M60 90 Q64 84 68 90'),
      { t: 'circle', cx: 100, cy: 88, r: 8, f: INK },
      star(100, 82, GOLD),
      smile('M62 108 Q85 122 104 106'),
      { t: 'ellipse', cx: 126, cy: 122, rx: 18, ry: 7, f: WHITE, o: 0.9 },
      { t: 'circle', cx: 121, cy: 119, r: 5, f: '#D6432A' },
      { t: 'circle', cx: 130, cy: 120, r: 4, f: '#F5DD8B' },
      { t: 'line', x1: 108, y1: 96, x2: 108, y2: 118, s: INK, w: 2, rot: [-10, 108, 108] },
      { t: 'line', x1: 105, y1: 96, x2: 105, y2: 102, s: INK, w: 1.4, rot: [-10, 108, 108] },
      { t: 'line', x1: 111, y1: 96, x2: 111, y2: 102, s: INK, w: 1.4, rot: [-10, 108, 108] },
      { t: 'path', d: 'M120 60 Q124 52 120 46 M128 60 Q132 52 128 46', f: 'none', s: WHITE, w: 2.4, o: 0.7, cap: true },
    ],
  },

  'touch-grass': {
    grad: { cx: '30%', cy: '22%', r: '88%', stops: [[0, '#D4F5A8'], [45, '#5FAE2E'], [100, '#2E6A12']] },
    idle: 'none',
    shapes: [
      ring(85, 90, 72, '#A8E080'),
      dot(26, 56, 4, '#D9F5C2'), dot(146, 62, 3.4, '#D9F5C2'), dot(132, 136, 4, '#D9F5C2'), dot(30, 128, 3, '#D9F5C2'),
      { t: 'path', d: 'M88 30 C114 34 130 58 124 86 C138 92 134 116 114 120 C114 140 90 150 78 138 C58 146 40 128 50 110 C32 104 32 78 52 72 C50 48 66 28 88 30Z', f: 'body' },
      smile('M60 88 Q64 82 68 88'),
      { t: 'circle', cx: 98, cy: 86, r: 8, f: INK },
      star(98, 80, GOLD),
      smile('M60 106 Q82 118 102 104'),
      smile('M108 138 Q112 122 118 138', 3.4, '#8FD65A'),
      smile('M118 140 Q124 120 130 140', 3.4, '#6FBE3E'),
      smile('M128 138 Q133 124 138 138', 3.4, '#8FD65A'),
      smile('M40 138 Q45 122 50 138', 3, '#6FBE3E'),
      smile('M48 140 Q53 126 58 140', 3, '#8FD65A'),
    ],
  },

  host: {
    grad: { cx: '34%', cy: '22%', r: '85%', stops: [[0, '#FFE9A8'], [45, '#F0A829'], [100, '#B4700F']] },
    idle: 'none',
    shapes: [
      ring(85, 90, 76, '#FFCF80', 0.45),
      // Three guests behind the host — the reason the badge exists.
      { t: 'rect', x: 20, y: 112, width: 20, height: 30, rx: 10, f: '#7FB8A8' },
      { t: 'circle', cx: 30, cy: 104, r: 12, f: '#7FB8A8' },
      smile('M25 102 Q30 96 35 102', 1.8),
      { t: 'rect', x: 130, y: 108, width: 20, height: 30, rx: 10, f: '#E88FA8' },
      { t: 'circle', cx: 140, cy: 100, r: 12, f: '#E88FA8' },
      smile('M135 98 Q140 92 145 98', 1.8),
      { t: 'rect', x: 74, y: 138, width: 20, height: 28, rx: 10, f: '#C9AEFF' },
      { t: 'circle', cx: 84, cy: 130, r: 12, f: '#C9AEFF' },
      smile('M79 128 Q84 122 89 128', 1.8),
      { t: 'path', d: 'M85 32 C110 32 126 54 124 82 C122 114 104 142 85 142 C66 142 48 114 46 82 C44 54 60 32 85 32Z', f: 'body' },
      smile('M58 88 Q66 78 74 88', 5),
      smile('M96 88 Q104 78 112 88', 5),
      { t: 'circle', cx: 60, cy: 98, r: 6, f: '#E8804A', o: 0.4 },
      { t: 'circle', cx: 110, cy: 98, r: 6, f: '#E8804A', o: 0.4 },
      smile('M64 104 Q85 118 106 104', 4.4),
      // Welcoming arms, thrown wide.
      smile('M46 90 Q30 100 32 112', 9, '#F0A829'),
      smile('M124 90 Q140 100 138 108', 9, '#F0A829'),
    ],
  },

  'spark-starter': {
    grad: { cx: '34%', cy: '24%', r: '82%', stops: [[0, '#FFE28A'], [45, '#FF9036'], [100, '#C4530F']] },
    idle: 'pulse',
    shapes: [
      ring(85, 90, 76, '#FFD98A', 0.45),
      dot(24, 60, 4, '#FFEFC2'), dot(146, 70, 3.4, '#FFEFC2'),
      { t: 'path', d: 'M85 20 L94 46 L118 32 L106 56 L134 60 L108 72 L128 92 L100 84 L104 112 L85 90 L66 112 L70 84 L42 92 L62 72 L36 60 L64 56 L52 32 L76 46Z', f: 'body' },
      { t: 'circle', cx: 72, cy: 78, r: 8.5, f: INK },
      { t: 'circle', cx: 75, cy: 74, r: 2.6, f: WHITE },
      { t: 'circle', cx: 100, cy: 78, r: 8.5, f: INK },
      { t: 'circle', cx: 103, cy: 74, r: 2.6, f: WHITE },
      smile('M70 96 Q85 106 102 96'),
    ],
  },

  'wave-rider': {
    grad: { cx: '32%', cy: '22%', r: '85%', stops: [[0, '#9AE8FF'], [45, '#1FA8D9'], [100, '#0A5C8A']] },
    idle: 'wiggle',
    shapes: [
      ring(85, 90, 76, '#9AE0FF', 0.4),
      { t: 'path', d: 'M6 128 Q22 116 38 128 Q54 140 70 128 Q86 116 102 128 Q118 140 134 128 Q150 116 164 128', f: 'none', s: '#7FD4F5', w: 5, o: 0.55, cap: true },
      { t: 'path', d: 'M2 144 Q18 134 34 144 Q50 154 66 144 Q82 134 98 144 Q114 154 130 144 Q146 134 162 144', f: 'none', s: '#4FC0E8', w: 5, o: 0.4, cap: true },
      { t: 'path', d: 'M85 30 Q100 24 104 40 Q120 34 122 52 Q138 52 134 70 Q148 78 136 92 Q144 106 126 110 Q126 128 106 126 Q98 142 80 134 Q64 146 54 130 Q36 132 40 114 Q24 108 34 92 Q22 78 38 68 Q34 50 52 50 Q54 32 72 36 Q76 24 85 30Z', f: 'body' },
      smile('M56 88 Q64 82 70 90', 4.5),
      smile('M96 90 Q102 82 110 88', 4.5),
      smile('M66 106 Q85 118 104 106'),
    ],
  },

  'clover-luck': {
    grad: { cx: '32%', cy: '24%', r: '85%', stops: [[0, '#C6F5A9'], [45, '#5FAE2E'], [100, '#2E6A12']] },
    idle: 'drift',
    shapes: [
      ring(87, 105, 80, '#C6F5A9', 0.4),
      { t: 'path', d: 'M85 100 C85 70 60 50 60 50 C40 50 28 70 40 88 C20 92 14 116 34 128 C30 148 52 160 68 148 C74 164 100 164 106 148 C124 160 146 146 140 126 C158 116 154 92 134 88 C144 70 128 50 108 52 C108 52 85 70 85 100Z', f: 'body' },
      { t: 'circle', cx: 68, cy: 98, r: 9, f: '#E01F73' },
      { t: 'circle', cx: 104, cy: 98, r: 9, f: '#1F9ED9' },
      smile('M66 116 Q85 128 104 116'),
    ],
  },

  'sweet-talker': {
    grad: { cx: '32%', cy: '20%', r: '88%', stops: [[0, '#FFB3DD'], [45, '#FF2E9E'], [100, '#A80F5E']] },
    idle: 'swing',
    shapes: [
      ring(85, 85, 78, '#FF9AD9', 0.4),
      { t: 'path', d: 'M85 42 C70 20 34 26 30 54 C26 78 50 92 85 122 C120 92 144 78 140 54 C136 26 100 20 85 42Z', f: 'body' },
      smile('M60 78 Q64 72 68 78', 4.4),
      { t: 'path', d: 'M96 76 c-1.5-2.5 -6-2 -5.5 2 c0.5 3 5.5 6 5.5 6 c0 0 5-3 5.5-6 c0.5-4 -4-4.5 -5.5-2Z', f: INK },
      smile('M64 92 Q85 102 104 88'),
    ],
  },

  'consistent-one': {
    grad: { cx: '34%', cy: '24%', r: '82%', stops: [[0, '#FFD9B8'], [45, '#F2905C'], [100, '#C4551F']] },
    idle: 'bob',
    shapes: [
      ring(85, 90, 74, '#FFCBA0', 0.45),
      dot(26, 56, 4, '#FFE9D4'), dot(144, 64, 3.4, '#FFE9D4'),
      { t: 'ellipse', cx: 85, cy: 92, rx: 58, ry: 52, f: 'body' },
      smile('M54 86 Q64 78 74 86', 5),
      smile('M96 86 Q106 78 116 86', 5),
      { t: 'circle', cx: 58, cy: 98, r: 6, f: '#D6432A', o: 0.35 },
      { t: 'circle', cx: 112, cy: 98, r: 6, f: '#D6432A', o: 0.35 },
      smile('M66 108 Q85 120 104 108', 4.4),
      smile('M120 84 Q128 80 126 72', 2.4, WHITE),
    ],
  },

  'spiral-thinker': {
    grad: { cx: '32%', cy: '24%', r: '85%', stops: [[0, '#E8D4FF'], [45, '#A87FE8'], [100, '#6B4BB8']] },
    idle: 'none',
    shapes: [
      ring(85, 90, 74, '#D8C2FF', 0.45),
      { t: 'circle', cx: 132, cy: 46, r: 3.4, f: '#F0E4FF', anim: 'drift' },
      { t: 'circle', cx: 146, cy: 60, r: 2.4, f: '#F0E4FF', anim: 'drift' },
      { t: 'circle', cx: 120, cy: 34, r: 2, f: '#F0E4FF', anim: 'drift' },
      { t: 'path', d: 'M85 32 C114 30 132 54 128 82 C138 90 136 112 116 118 C118 138 96 150 82 140 C62 148 44 130 52 112 C34 108 32 82 52 76 C50 50 66 34 85 32Z', f: 'body' },
      { t: 'path', d: 'M62 90 m0,0 a9,9 0 1,1 7,8 a5.5,5.5 0 1,1 -4.5,-5 a2.8,2.8 0 1,1 2.2,2.7', f: 'none', s: INK, w: 2.4, cap: true },
      { t: 'path', d: 'M104 90 m0,0 a9,9 0 1,1 7,8 a5.5,5.5 0 1,1 -4.5,-5 a2.8,2.8 0 1,1 2.2,2.7', f: 'none', s: INK, w: 2.4, cap: true },
      { t: 'circle', cx: 60, cy: 104, r: 5.5, f: '#B85FE0', o: 0.3 },
      { t: 'circle', cx: 108, cy: 104, r: 5.5, f: '#B85FE0', o: 0.3 },
      { t: 'ellipse', cx: 85, cy: 114, rx: 9, ry: 7, f: INK },
    ],
  },

  'fast-rsvp': {
    grad: { cx: '34%', cy: '20%', r: '88%', stops: [[0, '#B8FFE0'], [45, '#1FC49E'], [100, '#0A7A60']] },
    idle: 'none',
    shapes: [
      ring(85, 90, 78, '#7FF0D0', 0.4),
      { t: 'path', d: 'M85 26 L128 82 L104 148 L66 148 L42 82Z', f: 'body' },
      { t: 'ellipse', cx: 68, cy: 88, rx: 9, ry: 11, f: INK, anim: 'blink' },
      { t: 'circle', cx: 71, cy: 84, r: 2.6, f: WHITE },
      { t: 'ellipse', cx: 104, cy: 88, rx: 9, ry: 11, f: INK, anim: 'blink', delay: 150 },
      { t: 'circle', cx: 107, cy: 84, r: 2.6, f: WHITE },
      smile('M66 112 Q85 124 104 112'),
    ],
  },

  'wild-card': {
    grad: { cx: '30%', cy: '20%', r: '88%', stops: [[0, '#FFC79A'], [45, '#FF5A1F'], [100, '#B4300A']] },
    idle: 'jump',
    shapes: [
      ring(85, 90, 80, '#FFB380', 0.4),
      { t: 'path', d: 'M85 32 C112 40 126 66 116 92 C132 100 128 124 106 128 C108 148 84 158 70 144 C50 152 32 134 42 116 C24 110 24 84 44 76 C40 52 62 26 85 32Z', f: 'body' },
      { t: 'path', d: 'M64 90 L67 96 L74 97 L68 101 L70 108 L64 104 L58 108 L60 101 L54 97 L61 96Z', f: INK },
      { t: 'path', d: 'M100 90 L103 96 L110 97 L104 101 L106 108 L100 104 L94 108 L96 101 L90 97 L97 96Z', f: INK },
      smile('M64 118 Q83 130 102 116', 4.4),
    ],
  },

  'first-chat': {
    grad: { cx: '34%', cy: '24%', r: '82%', stops: [[0, '#A8F0E8'], [45, '#1FB8A8'], [100, '#0A6E62']] },
    idle: 'bob',
    shapes: [
      ring(85, 90, 72, '#A8F0E8'),
      dot(26, 56, 4, '#D9FFF7'), dot(146, 62, 3.4, '#D9FFF7'),
      { t: 'rect', x: 108, y: 34, width: 34, height: 22, rx: 8, f: WHITE, o: 0.55 },
      { t: 'rect', x: 118, y: 52, width: 30, height: 20, rx: 8, f: WHITE, o: 0.8 },
      { t: 'path', d: 'M85 30 C110 30 128 52 126 80 C124 112 106 142 85 142 C64 142 46 112 44 80 C42 52 60 30 85 30Z', f: 'body' },
      { t: 'circle', cx: 65, cy: 86, r: 9, f: INK },
      { t: 'circle', cx: 68, cy: 82, r: 2.6, f: WHITE },
      { t: 'circle', cx: 103, cy: 86, r: 9, f: INK },
      { t: 'circle', cx: 106, cy: 82, r: 2.6, f: WHITE },
      smile('M64 104 Q85 116 104 104'),
    ],
  },

  'new-friend': {
    grad: { cx: '32%', cy: '20%', r: '88%', stops: [[0, '#FFC2D6'], [45, '#FF6FA0'], [100, '#C4275C']] },
    idle: 'swing',
    shapes: [
      ring(85, 88, 76, '#FFC2D6'),
      dot(26, 50, 4, '#FFE9F0'), dot(146, 58, 3.4, '#FFE9F0'),
      { t: 'path', d: 'M85 28 C112 28 130 52 128 82 C126 116 108 148 85 148 C62 148 44 116 42 82 C40 52 58 28 85 28Z', f: 'body' },
      { t: 'rect', x: 52, y: 118, width: 66, height: 10, rx: 5, f: GOLD },
      { t: 'circle', cx: 60, cy: 123, r: 3, f: '#1FA8D9' },
      { t: 'circle', cx: 74, cy: 123, r: 3, f: '#5FAE2E' },
      { t: 'circle', cx: 88, cy: 123, r: 3, f: '#FF6FA0' },
      { t: 'circle', cx: 102, cy: 123, r: 3, f: '#7B4FE0' },
      smile('M62 84 Q66 78 70 84'),
      { t: 'path', d: 'M96 82 c-2-3 -8-2 -7 3 c0.8 4 7 7 7 7 c0 0 6.2-3 7-7 c1-5 -5-6 -7-3Z', f: INK },
      smile('M66 100 Q85 110 104 96'),
    ],
  },

  'first-message': {
    grad: { cx: '36%', cy: '24%', r: '82%', stops: [[0, '#AED4FF'], [45, '#3E8FE0'], [100, '#1A4E8A']] },
    idle: 'pulse',
    shapes: [
      ring(85, 90, 72, '#AED4FF'),
      dot(26, 56, 4, '#E0EFFF'), dot(146, 62, 3.4, '#E0EFFF'),
      { t: 'path', d: 'M96 24 Q126 24 126 46 Q126 62 104 64 L106 78 L88 64 Q72 62 72 46 Q72 24 96 24Z', f: WHITE, s: INK, w: 2 },
      { t: 'text', x: 86, y: 50, size: 16, v: 'HI!', f: '#1A4E8A' },
      { t: 'path', d: 'M85 40 C108 40 124 60 122 86 C120 116 104 142 85 142 C66 142 50 116 48 86 C46 60 62 40 85 40Z', f: 'body' },
      smile('M60 92 Q64 86 68 92'),
      smile('M100 92 Q104 86 108 92'),
      { t: 'circle', cx: 62, cy: 104, r: 5, f: '#1A4E8A', o: 0.35 },
      { t: 'circle', cx: 106, cy: 104, r: 5, f: '#1A4E8A', o: 0.35 },
      smile('M66 112 Q85 122 104 112'),
    ],
  },

  'the-connector': {
    grad: { cx: '34%', cy: '24%', r: '76%', stops: [[0, '#B8F2FF'], [50, '#00B4E0'], [100, '#0079A8']] },
    idle: 'pulse',
    shapes: [
      ring(85, 98, 72, '#B8F2FF'),
      { t: 'path', d: 'M35 46 c-3-5 -13-3 -11 4 c1.4 6 11 12 11 12 c0 0 9.6-6 11-12 c2-7 -8-9 -11-4Z', f: '#FF6FA0' },
      { t: 'path', d: 'M135 46 c-3-5 -13-3 -11 4 c1.4 6 11 12 11 12 c0 0 9.6-6 11-12 c2-7 -8-9 -11-4Z', f: '#FF6FA0' },
      { t: 'path', d: 'M85 62 L74 90 L84 90 L77 118 L98 84 L88 84Z', f: GOLD },
      { t: 'ellipse', cx: 85, cy: 98, rx: 47, ry: 45, f: 'body' },
      smile('M75 94 Q79 89 83 94', 2.6),
      smile('M89 94 Q93 89 97 94', 2.6),
      smile('M74 116 Q85 126 97 116', 3.6),
    ],
  },

  'first-event': {
    grad: { cx: '30%', cy: '20%', r: '88%', stops: [[0, '#FFD9A0'], [45, '#F2953C'], [100, '#B4520A']] },
    idle: 'jump',
    shapes: [
      ring(85, 90, 76, '#FFD9A0'),
      dot(20, 30, 4, '#F3B8C4'), dot(146, 40, 3.4, '#A9C4A0'), dot(150, 120, 3.4, '#8FB6D9'),
      { t: 'path', d: 'M85 26 C114 24 132 50 128 80 C142 88 138 112 118 118 C120 138 96 150 82 140 C62 148 42 130 50 112 C32 108 30 82 50 76 C46 50 64 28 85 26Z', f: 'body' },
      smile('M60 86 Q64 80 68 86'),
      { t: 'circle', cx: 100, cy: 84, r: 8, f: INK },
      { t: 'circle', cx: 103, cy: 80, r: 2.4, f: WHITE },
      smile('M62 104 Q85 118 104 102'),
      // The ticket, held up. Same tear-line motif as the event cards.
      { t: 'rect', x: 100, y: 86, width: 34, height: 22, rx: 4, f: WHITE, s: INK, w: 1.8, rot: [-14, 116, 100] },
      { t: 'line', x1: 117, y1: 86, x2: 117, y2: 108, s: INK, w: 1, dash: '2 2', rot: [-14, 116, 100] },
    ],
  },

  'getting-social': {
    grad: { cx: '32%', cy: '22%', r: '85%', stops: [[0, '#D4F5A8'], [45, '#7FC24A'], [100, '#3D7A1A']] },
    idle: 'wiggle',
    shapes: [
      ring(85, 90, 72, '#D4F5A8'),
      dot(30, 46, 3.4, '#EAFFCB'), dot(52, 34, 3, '#EAFFCB'), dot(120, 36, 3, '#EAFFCB'),
      dot(142, 50, 3.4, '#EAFFCB'), dot(85, 24, 3, '#EAFFCB'),
      { t: 'path', d: 'M85 30 C110 30 128 52 126 82 C124 114 106 144 85 144 C64 144 46 114 44 82 C42 52 60 30 85 30Z', f: 'body' },
      smile('M62 88 Q66 82 70 88'),
      { t: 'circle', cx: 100, cy: 86, r: 8, f: INK },
      { t: 'circle', cx: 103, cy: 82, r: 2.4, f: WHITE },
      smile('M62 106 Q85 118 104 104'),
    ],
  },

  'in-the-mix': {
    grad: { cx: '32%', cy: '22%', r: '85%', stops: [[0, '#B3C8FF'], [45, '#3F5FE0'], [100, '#1A2C80']] },
    idle: 'drift',
    shapes: [
      ring(85, 90, 76, '#B3C8FF'),
      dot(24, 40, 3, '#E4EBFF'), dot(40, 26, 2.6, '#E4EBFF'), dot(130, 28, 2.6, '#E4EBFF'),
      dot(148, 44, 3, '#E4EBFF'), dot(150, 120, 2.6, '#E4EBFF'), dot(20, 118, 2.6, '#E4EBFF'),
      { t: 'path', d: 'M85 28 C112 28 130 52 128 82 C126 116 106 148 85 148 C64 148 44 116 42 82 C40 52 58 28 85 28Z', f: 'body' },
      // White facial strokes, not ink — this body is dark enough that ink disappears.
      smile('M60 88 Q64 82 68 88', 4, WHITE),
      { t: 'circle', cx: 102, cy: 86, r: 8, f: INK },
      { t: 'circle', cx: 105, cy: 82, r: 2.4, f: WHITE },
      smile('M62 108 Q85 122 106 106', 4, WHITE),
    ],
  },

  'community-legend': {
    grad: { cx: '36%', cy: '22%', r: '85%', stops: [[0, '#FFE9A8'], [35, '#E8A8FF'], [70, '#8B3FE0'], [100, '#3A1780']] },
    idle: 'pulse',
    shapes: [
      // Two counter-rotating orbits — the only character with a second ring.
      ring(85, 90, 78, '#FFE9A8', 0.6, '2 4', 1.8),
      { t: 'circle', cx: 85, cy: 90, r: 68, f: 'none', s: '#E8A8FF', w: 1.4, dash: '4 3', o: 0.4, spin: -1, spinDur: 20 },
      dot(22, 50, 4, '#FFF3D0'), dot(148, 56, 3.6, '#FFF3D0'), dot(136, 132, 4, '#FFF3D0'),
      dot(24, 126, 3.4, '#FFF3D0'), dot(85, 16, 3, '#FFF3D0'),
      { t: 'path', d: 'M85 32 C112 30 132 54 128 84 C138 90 136 114 116 120 C118 140 96 152 82 142 C62 150 44 132 52 114 C34 108 32 82 52 76 C50 50 66 30 85 32Z', f: 'body' },
      { t: 'path', d: 'M68 44 L74 32 L85 42 L96 32 L102 44 L100 50 L70 50Z', f: '#FFE9A8', s: INK, w: 1.4 },
      { t: 'ellipse', cx: 66, cy: 94, rx: 9, ry: 11, f: INK },
      { t: 'ellipse', cx: 104, cy: 94, rx: 9, ry: 11, f: INK },
      { t: 'path', d: 'M66 88 L67.5 91.5 L71 93 L67.5 94.5 L66 98 L64.5 94.5 L61 93 L64.5 91.5Z', f: WHITE },
      { t: 'path', d: 'M104 88 L105.5 91.5 L109 93 L105.5 94.5 L104 98 L102.5 94.5 L99 93 L102.5 91.5Z', f: WHITE },
      smile('M66 112 Q85 126 104 112'),
    ],
  },

  'third-space-veteran': {
    grad: { cx: '34%', cy: '24%', r: '82%', stops: [[0, '#E8D4A8'], [45, '#B4863E'], [100, '#6E4E1F']] },
    idle: 'bob',
    shapes: [
      ring(85, 90, 74, '#D9C29A'),
      dot(26, 56, 4, '#F0E4C8'), dot(144, 64, 3.4, '#F0E4C8'),
      { t: 'path', d: 'M85 30 C110 30 126 52 124 82 C122 114 104 142 85 142 C66 142 48 114 46 82 C44 52 60 30 85 30Z', f: 'body' },
      { t: 'rect', x: 102, y: 106, width: 32, height: 20, rx: 3, f: '#F0E4C8', s: INK, w: 1.6, rot: [-8, 118, 116] },
      { t: 'text', x: 108, y: 121, size: 13, v: 'OG', f: '#6E4E1F', rot: [-8, 118, 116] },
      smile('M58 86 Q66 78 74 86', 5),
      smile('M96 86 Q104 78 112 86', 5),
      // Laugh lines. Distinguished, not tired.
      smile('M52 90 Q56 92 54 96', 1.6, '#6E4E1F'),
      smile('M118 90 Q122 92 120 96', 1.6, '#6E4E1F'),
      smile('M64 100 Q85 112 106 100', 4.4),
    ],
  },
}
