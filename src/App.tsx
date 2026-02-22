import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './components/Header/Header'
import MapView from './components/Map/MapView'
import ResidentSidebar from './components/ResidentMode/ResidentSidebar'
import GovernmentSidebar from './components/GovernmentMode/GovernmentSidebar'
import CityStatsBar from './components/GovernmentMode/CityStatsBar'
import ApiErrorBanner from './components/ApiErrorBanner'
import ChatButton from './components/ChatBot/ChatButton'
import ChatPanel from './components/ChatBot/ChatPanel'
import { useMapStore } from './store/useMapStore'
import { useTracts, useCityStats } from './api/hooks'
import type { TractProperties } from './types/map'

export default function App() {
  const [chatOpen, setChatOpen] = useState(false)
  const { mode, setMode, setSelectedTract } = useMapStore()

  // Subscribe to the two most critical queries at App level so we can show
  // the ApiErrorBanner when the backend is unreachable. React Query deduplicates
  // these — no extra network requests are made even though MapView and
  // GovernmentSidebar also call these hooks.
  const { isError: tractsError } = useTracts()
  const { isError: statsError } = useCityStats()
  const apiOffline = tractsError || statsError

  // When the user clicks a tract on the map, store its properties and
  // switch to government mode so the sidebar shows the simulation panel.
  const handleTractSelected = (props: TractProperties) => {
    setSelectedTract(props)
    setMode('government')
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a1628] overflow-hidden">
      {/* Sticky Header */}
      <Header />

      {/* Backend offline banner — shown when Django is unreachable */}
      <ApiErrorBanner visible={apiOffline} />

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
              <MapView mode={mode} onTractSelected={handleTractSelected} />
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

          {/* Chat — resident mode only */}
          {mode === 'resident' && (
            <>
              <ChatPanel open={chatOpen} />
              <ChatButton open={chatOpen} onClick={() => setChatOpen((o) => !o)} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
