/**
 * ChatButton.tsx
 *
 * Floating action button shown in resident mode (bottom-right of map).
 * Clicking it toggles the ChatPanel open/closed.
 */

import { MessageCircle, X } from 'lucide-react'
import { motion } from 'framer-motion'

interface ChatButtonProps {
  open: boolean
  onClick: () => void
}

export default function ChatButton({ open, onClick }: ChatButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      className="absolute bottom-6 right-6 z-20 w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-[#f5a623] text-[#0a1628] hover:bg-[#e8961f] transition-colors duration-150"
      aria-label={open ? 'Close food assistant' : 'Open food assistant'}
    >
      <motion.div
        key={open ? 'close' : 'open'}
        initial={{ rotate: -20, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        exit={{ rotate: 20, opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </motion.div>
    </motion.button>
  )
}
