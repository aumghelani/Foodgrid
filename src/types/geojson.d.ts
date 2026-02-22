/** Ambient module declaration for *.geojson static imports.
 *  Enables: import rawTracts from './boston_tracts.geojson'
 *  The geojson-loader Vite plugin (vite.config.ts) performs the actual transform. */
declare module '*.geojson' {
  import type { FeatureCollection } from 'geojson'
  const value: FeatureCollection
  export default value
}
