/**
 * storeHierarchy.ts — Single source of truth for food store categories.
 *
 * Defines 7 store categories with price scores, display metadata, and
 * classification helpers. Consumed by:
 *   - MapView.tsx  → 7 deck.gl ScatterplotLayer instances
 *   - LayerTogglePanel.tsx → toggle UI
 *   - ResourceTooltip.tsx  → price dots
 *   - api/hooks.ts         → mapResource enrichment
 *
 * Price score: 0.0 = free / lowest cost, 1.0 = most expensive
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoreCategory =
  | 'convenience'
  | 'supermarket'
  | 'grocery'
  | 'wholesale'
  | 'farmersmarket'
  | 'pantry'
  | 'mobile'

export interface StoreTier {
  /** Display label shown in legend and tooltip */
  label: string
  /** Short label for compact contexts */
  shortLabel: string
  /** Lucide icon name (string key) */
  icon: string
  /** Price score 0.0 (free) → 1.0 (most expensive) */
  priceScore: number
  /** Human-readable price tier label */
  priceTier: string
  /**
   * Price label string, e.g. "$$$$" for convenience.
   * Empty string for free sources.
   */
  priceLabel: string
  /** Number of filled price dots to show (out of 5) */
  priceDots: number
  /** Hex colour for map pin and legend */
  hexColor: string
  /** Tailwind text color class */
  twColor: string
  /** Tailwind bg/border combo for badge */
  twBadge: string
}

// ─── Hierarchy ────────────────────────────────────────────────────────────────

export const STORE_HIERARCHY: Record<StoreCategory, StoreTier> = {
  convenience: {
    label:      'Convenience Store',
    shortLabel: 'Convenience',
    icon:       'ShoppingBag',
    priceScore: 0.95,
    priceTier:  'Very High',
    priceLabel: '$$$$',
    priceDots:  5,
    hexColor:   '#ef4444',  // red-500
    twColor:    'text-red-400',
    twBadge:    'text-red-400 bg-red-400/10 border-red-400/30',
  },
  supermarket: {
    label:      'Supermarket / Chain',
    shortLabel: 'Supermarket',
    icon:       'Store',
    priceScore: 0.65,
    priceTier:  'Moderate-High',
    priceLabel: '$$$',
    priceDots:  3,
    hexColor:   '#f59e0b',  // amber-500
    twColor:    'text-amber-400',
    twBadge:    'text-amber-400 bg-amber-400/10 border-amber-400/30',
  },
  grocery: {
    label:      'Independent Grocery',
    shortLabel: 'Grocery',
    icon:       'ShoppingCart',
    priceScore: 0.50,
    priceTier:  'Moderate',
    priceLabel: '$$',
    priceDots:  2,
    hexColor:   '#84cc16',  // lime-500
    twColor:    'text-lime-400',
    twBadge:    'text-lime-400 bg-lime-400/10 border-lime-400/30',
  },
  wholesale: {
    label:      'Wholesale / Club',
    shortLabel: 'Wholesale',
    icon:       'Warehouse',
    priceScore: 0.35,
    priceTier:  'Low (bulk)',
    priceLabel: '$',
    priceDots:  2,
    hexColor:   '#3b82f6',  // blue-500
    twColor:    'text-blue-400',
    twBadge:    'text-blue-400 bg-blue-400/10 border-blue-400/30',
  },
  farmersmarket: {
    label:      "Farmer's Market",
    shortLabel: 'Market',
    icon:       'Leaf',
    priceScore: 0.25,
    priceTier:  'Low',
    priceLabel: '$',
    priceDots:  1,
    hexColor:   '#8b5cf6',  // violet-500
    twColor:    'text-violet-400',
    twBadge:    'text-violet-400 bg-violet-400/10 border-violet-400/30',
  },
  pantry: {
    label:      'Food Pantry',
    shortLabel: 'Pantry',
    icon:       'Heart',
    priceScore: 0.0,
    priceTier:  'Free',
    priceLabel: '',
    priceDots:  0,
    hexColor:   '#10b981',  // emerald-500
    twColor:    'text-emerald-400',
    twBadge:    'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  },
  mobile: {
    label:      'Mobile Food Unit',
    shortLabel: 'Mobile',
    icon:       'Truck',
    priceScore: 0.0,
    priceTier:  'Free',
    priceLabel: '',
    priceDots:  0,
    hexColor:   '#06b6d4',  // cyan-500
    twColor:    'text-cyan-400',
    twBadge:    'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  },
}

/** Ordered from most-expensive to least-expensive for legend display. */
export const PRICE_ORDER: StoreCategory[] = [
  'convenience',
  'supermarket',
  'grocery',
  'wholesale',
  'farmersmarket',
  'pantry',
  'mobile',
]

// ─── Classification helpers ───────────────────────────────────────────────────

/**
 * Maps backend `type` strings (and freeform store_type labels) to a StoreCategory.
 * Backend types: 'pantry' | 'grocery' | 'market' | 'mobile'
 * PolicyMap store_type examples: "Supermarket", "Super Store", "Convenience Store",
 *   "Grocery Store", "Specialty Food Store", "Wholesale Club"
 */
export function classifyStoreType(
  backendType: string,
  storeName?: string,
): StoreCategory {
  const t = (backendType ?? '').toLowerCase().trim()
  const n = (storeName ?? '').toLowerCase().trim()

  // Direct backend type passthrough
  if (t === 'pantry')  return 'pantry'
  if (t === 'mobile')  return 'mobile'
  if (t === 'market')  return 'farmersmarket'

  // PolicyMap store_type strings
  if (t.includes('convenience'))              return 'convenience'
  if (t.includes('super store') || t === 'supermarket') return 'supermarket'
  if (t.includes('wholesale') || t.includes('club'))    return 'wholesale'
  if (t.includes('farmers') || t.includes('farm market')) return 'farmersmarket'
  if (t.includes('grocery'))                 return 'grocery'

  // Chain name heuristics (name-based fallback)
  if (n.match(/7-?eleven|circle k|cumberland|speedway|wawa/)) return 'convenience'
  if (n.match(/costco|bj['']?s|sam['']?s club/))              return 'wholesale'
  if (n.match(/whole foods|trader joe|wegmans|star market|stop & shop|shaw|hannaford|aldi|market basket/)) return 'supermarket'

  // Default grocery bucket
  return 'grocery'
}

/**
 * Returns a price score override for known chain names, or null if unknown.
 * Use this to refine the default category score when chain context is available.
 */
export function getChainPriceScore(storeName: string): number | null {
  const n = storeName.toLowerCase()
  if (n.match(/whole foods/))              return 0.80
  if (n.match(/trader joe/))              return 0.45
  if (n.match(/aldi/))                    return 0.30
  if (n.match(/market basket/))           return 0.35
  if (n.match(/stop & shop|shaw|hannaford/)) return 0.60
  if (n.match(/star market/))             return 0.65
  if (n.match(/costco|bj['']?s|sam['']?s/))  return 0.35
  if (n.match(/7-?eleven|circle k|cumberland/)) return 0.95
  return null
}
