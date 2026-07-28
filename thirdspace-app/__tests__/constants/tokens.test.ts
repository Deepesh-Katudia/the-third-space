import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * The conversion to the two-tone orange ticket system is complete, so this list is
 * empty and the rule is now absolute: any literal hex in app/ or components/ fails
 * the build.
 *
 * DO NOT add entries. The list only ever shrinks.
 */
const NOT_YET_CONVERTED: string[] = []

// Matches only QUOTED hex literals — '#FF9F3D', "#FFF", '#FF9F3Dcc' — because in
// React Native a color is always a string. Deliberately does NOT match bare hex runs
// like `// TODO #1234` or `issue #456`, since those are comments/prose, not colors,
// and an unquoted version of this pattern flags them as false positives. Do not widen
// this back to an unquoted match — that was tried and it broke the guard's credibility.
const HEX = /['"]#[0-9a-fA-F]{3,8}['"]/
const ROOTS = ['app', 'components']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full.split('\\').join('/'))
  }
  return out
}

describe('token discipline', () => {
  it('keeps literal colors out of every converted file', () => {
    const offenders = ROOTS.flatMap((root) => walk(root))
      .filter((f) => !NOT_YET_CONVERTED.includes(f))
      .filter((f) => HEX.test(readFileSync(f, 'utf8')))

    expect(offenders).toEqual([])
  })

  it('does not list files that no longer exist', () => {
    const present = new Set(ROOTS.flatMap((root) => walk(root)))
    expect(NOT_YET_CONVERTED.filter((f) => !present.has(f))).toEqual([])
  })
})
