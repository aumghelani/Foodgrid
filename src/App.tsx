import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header/Header'
import MapView from './components/Map/MapView'
import ResidentSidebar from './components/ResidentMode/ResidentSidebar'
import GovernmentSidebar from './components/GovernmentMode/GovernmentSidebar'
import CityStatsBar from './components/GovernmentMode/CityStatsBar'
import { useMapStore } from './store/useMapStore'

export default function App() {
  const { mode } = useMapStore()

  return (
    <div className="flex flex-col h-screen bg-[#0a1628] overflow-hidden">
      {/* Sticky Header */}
      <Header />

      {/* Main Content: Sidebar + Map */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar — animated on mode switch */}
        <AnimatePresence mode="wait">
          {mode === 'resident' ? (
            <motion.div
              key="resident-sidebar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="flex-shrink-0"
            >
              <ResidentSidebar />
            </motion.div>
          ) : (
            <motion.div
              key="government-sidebar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
              className="flex-shrink-0"
            >
              <GovernmentSidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Panel */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <MapView mode={mode} />
            </motion.div>
          </AnimatePresence>

          {/* Government Mode — city stats overlay rendered outside MapView
              so it's on top of deck.gl canvas */}
          {mode === 'government' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 pointer-events-none"
            >
              <CityStatsBar />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
