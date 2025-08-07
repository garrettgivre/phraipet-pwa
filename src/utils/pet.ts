export type NeedName = 'hunger' | 'happiness' | 'cleanliness' | 'affection' | 'spirit'

export const MAX_NEED_VALUE = 120
export const MIN_NEED_VALUE = 0

const bands: Record<Exclude<NeedName, 'spirit'>, { upTo: number; label: string }[]> = {
  hunger: [
    { upTo: -21, label: 'Dying' },
    { upTo: -11, label: 'Starving' },
    { upTo: -1, label: 'Famished' },
    { upTo: 14, label: 'Very Hungry' },
    { upTo: 29, label: 'Hungry' },
    { upTo: 44, label: 'Not Hungry' },
    { upTo: 59, label: 'Fine' },
    { upTo: 74, label: 'Satiated' },
    { upTo: 89, label: 'Full Up' },
    { upTo: 104, label: 'Very Full' },
    { upTo: 119, label: 'Bloated' },
    { upTo: 120, label: 'Very Bloated' },
  ],
  happiness: [
    { upTo: -21, label: 'Miserable' },
    { upTo: -11, label: 'Sad' },
    { upTo: -1, label: 'Unhappy' },
    { upTo: 14, label: 'Dull' },
    { upTo: 29, label: 'Okay' },
    { upTo: 44, label: 'Content' },
    { upTo: 59, label: 'Happy' },
    { upTo: 74, label: 'Joyful' },
    { upTo: 89, label: 'Delighted' },
    { upTo: 104, label: 'Ecstatic' },
    { upTo: 119, label: 'Overjoyed' },
    { upTo: 120, label: 'Blissful' },
  ],
  cleanliness: [
    { upTo: -21, label: 'Filthy' },
    { upTo: -11, label: 'Very Dirty' },
    { upTo: -1, label: 'Dirty' },
    { upTo: 14, label: 'Slightly Dirty' },
    { upTo: 29, label: 'Unkempt' },
    { upTo: 44, label: 'Decent' },
    { upTo: 59, label: 'Clean' },
    { upTo: 74, label: 'Very Clean' },
    { upTo: 89, label: 'Spotless' },
    { upTo: 104, label: 'Gleaming' },
    { upTo: 119, label: 'Pristine' },
    { upTo: 120, label: 'Radiant' },
  ],
  affection: [
    { upTo: -21, label: 'Neglected' },
    { upTo: -11, label: 'Wary' },
    { upTo: -1, label: 'Distant' },
    { upTo: 14, label: 'Curious' },
    { upTo: 29, label: 'Friendly' },
    { upTo: 44, label: 'Affectionate' },
    { upTo: 59, label: 'Bonded' },
    { upTo: 74, label: 'Loyal' },
    { upTo: 89, label: 'Devoted' },
    { upTo: 104, label: 'Inseparable' },
    { upTo: 119, label: 'Loving' },
    { upTo: 120, label: 'Soulmates' },
  ],
}

export function clampNeed(value: number): number {
  return Math.max(MIN_NEED_VALUE, Math.min(MAX_NEED_VALUE, Math.round(value)))
}

export function computeSpirit(values: {
  hunger: number
  happiness: number
  cleanliness: number
  affection: number
}): number {
  const avg = (values.hunger + values.happiness + values.cleanliness + values.affection) / 4
  return clampNeed(avg)
}

export function describeNeed(need: Exclude<NeedName, 'spirit'>, value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Unknown'
  const needBand = bands[need]
  return needBand.find(b => value <= b.upTo)?.label ?? 'Undefined State'
}

export type DecayRates = {
  hungerPerDay: number
  happinessPerDay: number
  cleanlinessPerDay: number
  affectionPerDay: number
}

export function applyNeedsDecay(
  pet: {
    hunger: number
    happiness: number
    cleanliness: number
    affection: number
    lastNeedsUpdateTime: number
  },
  now: number,
  rates: DecayRates,
): {
  hunger: number
  happiness: number
  cleanliness: number
  affection: number
  spirit: number
  lastNeedsUpdateTime: number
} {
  const hoursElapsed = Math.max(0, (now - pet.lastNeedsUpdateTime) / (60 * 60 * 1000))
  const decay = (current: number, perDay: number) => clampNeed(current - (perDay / 24) * hoursElapsed)
  const hunger = decay(pet.hunger, rates.hungerPerDay)
  const happiness = decay(pet.happiness, rates.happinessPerDay)
  const cleanliness = decay(pet.cleanliness, rates.cleanlinessPerDay)
  const affection = decay(pet.affection, rates.affectionPerDay)
  return {
    hunger,
    happiness,
    cleanliness,
    affection,
    spirit: computeSpirit({ hunger, happiness, cleanliness, affection }),
    lastNeedsUpdateTime: now,
  }
} 