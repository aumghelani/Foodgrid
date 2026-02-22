import type { FoodResource } from '../types'

export const foodResources: FoodResource[] = [
  {
    id: 'fr-001',
    name: 'Roxbury Comprehensive Community Health Center',
    type: 'pantry',
    address: '435 Warren St, Roxbury, MA 02119',
    coordinates: [-71.0839, 42.3246],
    transitMinutes: 8,
    tags: ['SNAP', 'Open Now', 'Free'],
  },
  {
    id: 'fr-002',
    name: 'Dudley Street Food Co-op',
    type: 'grocery',
    address: '2149 Washington St, Roxbury, MA 02119',
    coordinates: [-71.0825, 42.3261],
    transitMinutes: 12,
    tags: ['SNAP', 'EBT'],
  },
  {
    id: 'fr-003',
    name: 'Nubian Square Farmers Market',
    type: 'farmers_market',
    address: 'Nubian Square, Roxbury, MA',
    coordinates: [-71.0831, 42.3257],
    transitMinutes: 14,
    tags: ['SNAP', 'EBT', 'Open Now'],
    hours: 'Tue & Sat 10am–3pm',
  },
  {
    id: 'fr-004',
    name: 'Boston Mobile Food Truck – GBFB',
    type: 'mobile',
    address: 'Malcolm X Blvd & Shawmut Ave (rotating)',
    coordinates: [-71.0807, 42.3242],
    transitMinutes: 18,
    tags: ['Free', 'Open Now'],
  },
  {
    id: 'fr-005',
    name: 'Warren Gardens Resident Pantry',
    type: 'pantry',
    address: '10 Cheney St, Roxbury, MA 02119',
    coordinates: [-71.0861, 42.3239],
    transitMinutes: 22,
    tags: ['Free', 'SNAP'],
  },
  {
    id: 'fr-006',
    name: 'Dorchester Food Forest',
    type: 'grocery',
    address: '1450 Dorchester Ave, Dorchester, MA',
    coordinates: [-71.0651, 42.3085],
    transitMinutes: 27,
    tags: ['Open Now', 'EBT'],
  },
  {
    id: 'fr-007',
    name: 'South End Food Bank',
    type: 'pantry',
    address: '95 Berkeley St, South End, MA 02116',
    coordinates: [-71.0717, 42.3449],
    transitMinutes: 19,
    tags: ['Free', 'SNAP', 'Open Now'],
  },
]

// Color coding by resource type
export const resourceColors: Record<string, [number, number, number, number]> = {
  pantry:         [52, 211, 153, 220],  // green
  grocery:        [245, 166, 35, 220],  // amber
  farmers_market: [167, 139, 250, 220], // purple
  mobile:         [96, 165, 250, 220],  // blue
}

export const resourceLabels: Record<string, string> = {
  pantry:         'Pantry',
  grocery:        'Grocery',
  farmers_market: 'Farmers Market',
  mobile:         'Mobile',
}
