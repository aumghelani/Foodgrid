import type {
  FillLayerSpecification,
  LineLayerSpecification,
  ExpressionSpecification,
} from 'maplibre-gl'

// ─── Type-assertion note ──────────────────────────────────────────────────────
// MapLibre's ExpressionSpecification is a large discriminated-union of specific
// tuples. TypeScript cannot infer that a literal array like
//   ['interpolate', ['linear'], ['get', 'food_risk_score'], 0.0, '#3ecf8e', ...]
// matches any particular variant of that union.  Casting via `as ExpressionSpecification`
// is safe here because we know the expressions are valid at runtime; the cast is
// needed only to satisfy the type checker.

/**
 * Risk-score colour ramp for the choropleth fill.
 * Maps food_risk_score (0–1) to a green → yellow → amber → red gradient.
 */
const riskColorExpr = [
  'interpolate', ['linear'], ['get', 'food_risk_score'],
  0.0,  '#3ecf8e',   // emerald — low risk
  0.35, '#f5e642',   // yellow  — moderate
  0.6,  '#f5a623',   // amber   — high
  1.0,  '#e85d5d',   // red     — critical
] as ExpressionSpecification

/**
 * Fill opacity driven by feature state.
 * Selected tracts are the most opaque; unselected hovered tracts are slightly
 * opaque; all others use the baseline opacity of 0.60.
 */
const fillOpacityExpr = [
  'case',
  ['boolean', ['feature-state', 'selected'], false], 0.85,
  ['boolean', ['feature-state', 'hover'],    false], 0.75,
  0.60,
] as ExpressionSpecification

/**
 * Border colour driven by feature state.
 * Selected: amber (#f5a623) — matches FoodGrid's amber accent.
 * Hovered:  near-white, to indicate interactivity without stealing attention.
 * Default:  very subtle white at 15% opacity.
 */
const borderColorExpr = [
  'case',
  ['boolean', ['feature-state', 'selected'], false], '#f5a623',
  ['boolean', ['feature-state', 'hover'],    false], 'rgba(255,255,255,0.9)',
  'rgba(255,255,255,0.15)',
] as ExpressionSpecification

/**
 * Border width driven by feature state.
 * Selected and hovered tracts get thicker lines to draw the eye.
 */
const borderWidthExpr = [
  'case',
  ['boolean', ['feature-state', 'selected'], false], 3,
  ['boolean', ['feature-state', 'hover'],    false], 2,
  0.8,
] as ExpressionSpecification

/**
 * Border opacity driven by feature state.
 * Active (hovered / selected) borders are fully opaque.
 * Resting borders are very subtle — 30% opacity keeps the map readable.
 *
 * Without this expression MapLibre defaults line-opacity to 1.0 for ALL states,
 * which makes the default thin borders visually noisy and can obscure the
 * choropleth colour ramp beneath them.
 */
const borderOpacityExpr = [
  'case',
  ['boolean', ['feature-state', 'selected'], false], 1.0,
  ['boolean', ['feature-state', 'hover'],    false], 1.0,
  0.3,
] as ExpressionSpecification

// ─── Exported layer specs ─────────────────────────────────────────────────────

/**
 * Government-mode choropleth fill layer.
 *
 * - Colour encodes food_risk_score via a continuous interpolation.
 * - Opacity responds to MapLibre feature-state (hover / selected).
 * - source must match the <Source id="tracts"> in MapView.
 */
export const FILL_LAYER: FillLayerSpecification = {
  id: 'tract-fill',
  type: 'fill',
  source: 'tracts',
  paint: {
    'fill-color':   riskColorExpr,
    'fill-opacity': fillOpacityExpr,
  },
}

/**
 * Near-invisible fill used in resident mode.
 *
 * A flat, almost-transparent fill keeps the GeoJSON source in the render
 * pipeline so that `queryRenderedFeatures` can still detect tract hits for
 * hover/click logic, without the choropleth colours interfering with the
 * scatter-plot resource pins rendered on top by deck.gl.
 */
export const RESIDENT_FILL_LAYER: FillLayerSpecification = {
  id: 'tract-fill',
  type: 'fill',
  source: 'tracts',
  paint: {
    'fill-color':   'rgba(255,255,255,0.0)',
    'fill-opacity': 0.01,
  },
}

/**
 * Tract border layer shared across both modes.
 *
 * - Colour and width respond to feature-state (hover / selected).
 * - Selected border is amber (#f5a623) to match FoodGrid's design system.
 *   This is intentional — not black, not white.
 */
export const BORDER_LAYER: LineLayerSpecification = {
  id: 'tract-border',
  type: 'line',
  source: 'tracts',
  layout: {
    'line-cap':  'round',
    'line-join': 'round',
  },
  paint: {
    'line-color':   borderColorExpr,
    'line-width':   borderWidthExpr,
    'line-opacity': borderOpacityExpr,
  },
}
