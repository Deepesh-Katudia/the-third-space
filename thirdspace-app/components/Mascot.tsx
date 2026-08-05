import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, View } from 'react-native'
import Svg, { Circle, Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg'
import { MASCOT_FIGURES, type MascotIdle, type MascotShape } from '../constants/mascotFigures'
import { font } from '../constants/design'
import { useReduceMotion } from '../hooks/useReduceMotion'

const AnimatedG = Animated.createAnimatedComponent(G)

/** The comp's viewBox. Every figure is authored against it. */
const VIEW = 170

/** Milliseconds for one full cycle, per keyframe set in the comp. */
const IDLE_DURATION: Record<Exclude<MascotIdle, 'none'>, number> = {
  bob: 2600,
  wiggle: 1400,
  pulse: 1800,
  swing: 2200,
  drift: 4000,
  jump: 1300,
  blink: 3600,
}

const DEFAULT_SPIN_SECONDS = 14

/**
 * Maps a 0->1 driver to the transform the comp's keyframes describe. Whole-figure idles
 * ride an RN view rather than an SVG group, so they run on the native driver — these are
 * decorative loops that must never compete with a list scroll.
 */
function idleTransform(idle: Exclude<MascotIdle, 'none' | 'blink'>, t: Animated.Value) {
  const i = (out: number[]) => t.interpolate({ inputRange: [0, 0.5, 1], outputRange: out })
  const deg = (out: string[]) => t.interpolate({ inputRange: [0, 0.5, 1], outputRange: out })

  switch (idle) {
    case 'bob':
      return [{ translateY: i([0, -8, 0]) }, { rotate: deg(['-2deg', '3deg', '-2deg']) }]
    case 'wiggle':
      return [{ rotate: deg(['-6deg', '6deg', '-6deg']) }]
    case 'pulse':
      return [{ scale: i([1, 1.1, 1]) }]
    case 'swing':
      return [{ rotate: deg(['-9deg', '9deg', '-9deg']) }]
    case 'drift':
      return [{ translateX: i([0, -3, 0]) }, { translateY: i([0, -6, 0]) }]
    case 'jump':
      return [{ translateY: i([0, -14, 0]) }, { scaleY: i([1, 1.06, 1]) }]
  }
}

/** One looping 0->1->0 driver. Returns a started animation the caller must stop. */
function loop(value: Animated.Value, duration: number, useNativeDriver: boolean, delay = 0) {
  return Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver }),
    ]),
  )
}

interface SpinningRingProps {
  shape: Extract<MascotShape, { t: 'circle' }>
  reduceMotion: boolean
}

/**
 * The orbit ring. It rotates inside the SVG, so it cannot use the native driver — but it
 * is one property on one node at 14s per revolution, which is not where frames go.
 */
function SpinningRing({ shape, reduceMotion }: SpinningRingProps) {
  const driver = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reduceMotion) return
    const seconds = shape.spinDur ?? DEFAULT_SPIN_SECONDS
    const spin = Animated.loop(
      Animated.timing(driver, { toValue: 1, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: false }),
    )
    spin.start()
    return () => spin.stop()
  }, [driver, reduceMotion, shape.spinDur])

  const rotation = driver.interpolate({
    inputRange: [0, 1],
    outputRange: shape.spin === -1 ? ['360deg', '0deg'] : ['0deg', '360deg'],
  })

  return (
    <AnimatedG originX={shape.cx} originY={shape.cy} rotation={rotation as unknown as number}>
      <Circle
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r}
        fill="none"
        stroke={shape.s}
        strokeWidth={shape.w}
        strokeDasharray={shape.dash}
        opacity={shape.o}
      />
    </AnimatedG>
  )
}

interface BlinkProps {
  shape: MascotShape
  reduceMotion: boolean
  children: React.ReactNode
}

/** Squashes an eyelid on a long cycle. The comp holds open 92% of the time. */
function Blink({ shape, reduceMotion, children }: BlinkProps) {
  const driver = useRef(new Animated.Value(1)).current
  const originY = shape.t === 'ellipse' ? shape.cy : 0

  useEffect(() => {
    if (reduceMotion) return
    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(IDLE_DURATION.blink * 0.9 + (shape.delay ?? 0)),
        Animated.timing(driver, { toValue: 0.1, duration: 90, useNativeDriver: false }),
        Animated.timing(driver, { toValue: 1, duration: 110, useNativeDriver: false }),
      ]),
    )
    blink.start()
    return () => blink.stop()
  }, [driver, reduceMotion, shape.delay])

  return (
    <AnimatedG
      originX={shape.t === 'ellipse' ? shape.cx : 0}
      originY={originY}
      scaleY={driver as unknown as number}
    >
      {children}
    </AnimatedG>
  )
}

function renderShape(shape: MascotShape, key: number, bodyFill: string) {
  const fill = shape.f === 'body' ? bodyFill : shape.f
  const common = {
    fill,
    stroke: shape.s,
    strokeWidth: shape.w,
    strokeDasharray: shape.dash,
    opacity: shape.o,
    ...(shape.rot ? { rotation: shape.rot[0], originX: shape.rot[1], originY: shape.rot[2] } : {}),
  }

  switch (shape.t) {
    case 'path':
      return <Path key={key} d={shape.d} strokeLinecap={shape.cap ? 'round' : undefined} {...common} />
    case 'circle':
      return <Circle key={key} cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />
    case 'ellipse':
      return <Ellipse key={key} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />
    case 'rect':
      return <Rect key={key} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} {...common} />
    case 'line':
      return <Line key={key} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...common} />
    case 'text':
      return (
        <SvgText key={key} x={shape.x} y={shape.y} fontSize={shape.size} fontFamily={font.display} {...common}>
          {shape.v}
        </SvgText>
      )
  }
}

export interface MascotProps {
  /** A key of MASCOT_FIGURES. An unknown id renders nothing rather than throwing. */
  id: string
  size?: number
  /**
   * Locked rewards render the same figure at low opacity and desaturated by the caller's
   * container, so the shape is recognisable but clearly not yet yours.
   */
  dimmed?: boolean
}

export function Mascot({ id, size = 150, dimmed = false }: MascotProps) {
  const figure = MASCOT_FIGURES[id]
  const reduceMotion = useReduceMotion()
  const driver = useRef(new Animated.Value(0)).current
  const gradientId = `mascot-${id}`

  const wholeFigureIdle = figure && figure.idle !== 'none' && figure.idle !== 'blink' ? figure.idle : null

  useEffect(() => {
    if (!wholeFigureIdle || reduceMotion) return
    const animation = loop(driver, IDLE_DURATION[wholeFigureIdle] / 2, true)
    animation.start()
    return () => animation.stop()
  }, [driver, wholeFigureIdle, reduceMotion])

  const transform = useMemo(
    () => (wholeFigureIdle && !reduceMotion ? idleTransform(wholeFigureIdle, driver) : []),
    [wholeFigureIdle, reduceMotion, driver],
  )

  // An unknown id is a data bug, not a crash: the roster still lays out and the missing
  // character is obvious in review.
  if (!figure) return <View style={{ width: size, height: size }} testID={`mascot-missing-${id}`} />

  return (
    <Animated.View
      testID={`mascot-${id}`}
      style={[{ width: size, height: size, opacity: dimmed ? 0.35 : 1 }, !!transform.length && { transform }]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
        <Defs>
          <RadialGradient id={gradientId} cx={figure.grad.cx} cy={figure.grad.cy} r={figure.grad.r}>
            {figure.grad.stops.map(([offset, color]) => (
              <Stop key={offset} offset={`${offset}%`} stopColor={color} />
            ))}
          </RadialGradient>
        </Defs>

        {figure.shapes.map((shape, i) => {
          if (shape.t === 'circle' && shape.spin) return <SpinningRing key={i} shape={shape} reduceMotion={reduceMotion} />
          if (shape.anim === 'blink') {
            return (
              <Blink key={i} shape={shape} reduceMotion={reduceMotion}>
                {renderShape(shape, i, `url(#${gradientId})`)}
              </Blink>
            )
          }
          return renderShape(shape, i, `url(#${gradientId})`)
        })}
      </Svg>
    </Animated.View>
  )
}

Mascot.displayName = 'Mascot'
