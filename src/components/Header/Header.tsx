import { motion } from 'framer-motion'
import { useMapStore } from '../../store/useMapStore'
import type { AppMode } from '../../types'

export default function Header() {
  const { mode, setMode } = useMapStore()

  return (
    <header className="h-16 flex-shrink-0 flex items-center px-6 border-b border-[#1e3358] bg-[#0a1628] z-50 relative">
      {/* Logo */}
      <div className="flex items-center gap-3 w-64">
        <span className="text-xl">🍎</span>
        <div className="flex flex-col">
          <span className="font-display font-bold text-base text-white leading-tight tracking-tight">
            FoodGrid Boston
          </span>
          <span className="font-mono text-[10px] text-[#f5a623] uppercase tracking-widest">
            MVP · v0.1
          </span>
        </div>
      </div>

      {/* Centered mode toggle */}
      <div className="flex-1 flex justify-center">
        <div className="relative flex items-center bg-[#111f38] border border-[#1e3358] rounded-full p-0.5 gap-0">
          <ModeButton
            active={mode === 'resident'}
            onClick={() => setMode('resident')}
            label="Resident Mode"
            icon="🏠"
            value="resident"
          />
          <ModeButton
            active={mode === 'government'}
            onClick={() => setMode('government')}
            label="Government Mode"
            icon="🏛"
            value="government"
          />
        </div>
      </div>

      {/* Right info */}
      <div className="w-64 flex justify-end items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-xs text-[#7a93b8]">Boston, MA · Live Data</span>
      </div>
    </header>
  )
}

interface ModeButtonProps {
  active: boolean
  onClick: () => void
  label: string
  icon: string
  value: AppMode
}

function ModeButton({ active, onClick, label, icon }: ModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 z-10 ${
        active
          ? 'text-[#0a1628]'
          : 'text-[#7a93b8] hover:text-white'
      }`}
    >
      {active && (
        <motion.div
          layoutId="mode-pill"
          className="absolute inset-0 rounded-full bg-[#f5a623]"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10 font-sans font-medium text-sm">{label}</span>
    </button>
  )
}
