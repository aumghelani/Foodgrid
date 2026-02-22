import type { AiExplanation } from '../types'

export const aiExplanations: AiExplanation[] = [
  {
    tractId: 'TRACT_001',
    text: 'Roxbury shows a critical food risk score of 0.88, driven by a 29% food insecurity rate and only 1.2 food supply points per 1,000 residents. The Orange Line provides partial coverage, but 38% of residents lack reliable MBTA access to a full-service grocery store within 30 minutes.',
    confidence: 91,
  },
  {
    tractId: 'TRACT_002',
    text: 'Dorchester\'s food risk score of 0.76 reflects high demand relative to supply. Food insecurity affects 24% of residents, and pantry coverage drops sharply south of Fields Corner. Transit coverage is moderate at 71%, but food-insecure households cluster in lower-coverage census blocks.',
    confidence: 87,
  },
  {
    tractId: 'TRACT_003',
    text: 'Mattapan carries the second-highest risk score at 0.82, with transit coverage at only 49% — the lowest in the city. A 31% food insecurity rate combined with no farmers markets and limited mobile pantry service creates a compounding access gap for the ~6,700 affected households.',
    confidence: 89,
  },
  {
    tractId: 'TRACT_004',
    text: 'South End\'s food risk score of 0.42 reflects relatively better supply density and strong transit access at 88%. However, gentrification has reduced affordable food options — SNAP acceptance among local vendors has declined 18% since 2019.',
    confidence: 82,
  },
  {
    tractId: 'TRACT_005',
    text: 'Downtown Boston shows the lowest food risk in the city (0.22) with near-full transit coverage at 97% and abundant food retail options. Food insecurity affects only 7% of residents, though this likely undercounts the unhoused population not captured in ACS survey data.',
    confidence: 78,
  },
  {
    tractId: 'TRACT_006',
    text: 'East Boston\'s food risk score of 0.71 is heavily influenced by its predominantly immigrant population (68% non-English speaking), which creates barriers to navigating food assistance programs. Supply density is moderate, but language-accessible pantries cover only 31% of need.',
    confidence: 85,
  },
  {
    tractId: 'TRACT_007',
    text: 'Charlestown shows a low risk score of 0.35 with good transit and grocery coverage. Pockets of public housing (Bunker Hill development) face higher localized need, though neighborhood-level statistics mask this concentration effect.',
    confidence: 80,
  },
  {
    tractId: 'TRACT_008',
    text: 'Jamaica Plain\'s food risk of 0.48 reflects a mixed profile: strong transit and cooperative grocery options in the northern corridor, but significant gaps in the southern portion near the Forest Hills cluster. Mobile pantry coverage could reduce risk by an estimated 0.09 points.',
    confidence: 84,
  },
  {
    tractId: 'TRACT_009',
    text: 'Hyde Park\'s food risk of 0.64 is driven by poor transit coverage (54%) and geographic isolation from the city\'s food resource network. 19% food insecurity with limited pantry hours creates an access bottleneck on weekends, when SNAP reloads but most pantries are closed.',
    confidence: 88,
  },
  {
    tractId: 'TRACT_010',
    text: 'Allston-Brighton\'s food risk of 0.53 is complicated by a large student population that underutilizes food assistance due to eligibility confusion. Non-student households face a 17% food insecurity rate, with moderate transit at 72% providing reasonable but not full coverage.',
    confidence: 83,
  },
]

export function getExplanation(tractId: string): AiExplanation {
  return (
    aiExplanations.find((e) => e.tractId === tractId) ?? {
      tractId,
      text: 'Select a census tract on the map to view AI-generated food access analysis for that neighborhood.',
      confidence: 0,
    }
  )
}
