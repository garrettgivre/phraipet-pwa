import { describe, it, expect } from 'vitest'
import { clampNeed, computeSpirit, describeNeed, applyNeedsDecay, MAX_NEED_VALUE, MIN_NEED_VALUE } from './pet'

describe('pet utils', () => {
  it('clamps need values', () => {
    expect(clampNeed(999)).toBe(MAX_NEED_VALUE)
    expect(clampNeed(-10)).toBe(MIN_NEED_VALUE)
    expect(clampNeed(60.7)).toBe(61)
  })

  it('computes spirit as avg clamp', () => {
    expect(
      computeSpirit({ hunger: 120, happiness: 120, cleanliness: 120, affection: 120 })
    ).toBe(120)
    expect(
      computeSpirit({ hunger: 0, happiness: 0, cleanliness: 0, affection: 0 })
    ).toBe(0)
  })

  it('describes needs', () => {
    expect(describeNeed('hunger', 60)).toBeTruthy()
    expect(describeNeed('hunger', undefined)).toBe('Unknown')
  })

  it('applies decay over time', () => {
    const start = Date.now()
    const pet = { hunger: 100, happiness: 100, cleanliness: 100, affection: 100, lastNeedsUpdateTime: start }
    const after6h = start + 6 * 60 * 60 * 1000
    const decayed = applyNeedsDecay(pet, after6h, {
      hungerPerDay: 24,
      happinessPerDay: 24,
      cleanlinessPerDay: 24,
      affectionPerDay: 24,
    })
    expect(decayed.hunger).toBe(94) // 6 hours of 24/day => 6
    expect(decayed.spirit).toBeLessThan(100)
    expect(decayed.lastNeedsUpdateTime).toBe(after6h)
  })
}) 