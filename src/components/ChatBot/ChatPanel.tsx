/**
 * ChatPanel.tsx
 *
 * Sliding chat panel rendered over the map in resident mode.
 * Calls POST http://localhost:3001/chat with { message, history, language }.
 *
 * Features:
 * - Framer Motion slide-in from right
 * - Scrollable message list with user/assistant bubbles
 * - Language selector (EN | ES | ZH | PT | FR)
 * - Graceful error when chatbot server is offline
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2, Globe } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'zh', label: 'ZH' },
  { code: 'pt', label: 'PT' },
  { code: 'fr', label: 'FR' },
]

const CHATBOT_URL = 'http://localhost:3001/chat'

const WELCOME: Message = {
  role: 'assistant',
  content:
    "Hi! I'm FoodGrid's food access assistant. Ask me about nearby food pantries, SNAP benefits, transit routes, or any food access question in Boston.",
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  open: boolean
}

export default function ChatPanel({ open }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState('en')
  const [offline, setOffline] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 280)
  }, [open])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const history = messages.slice(-10) // last 10 messages for context

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setOffline(false)

    try {
      const res = await fetch(CHATBOT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: text, history, language }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json() as { reply: string }
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ])
    } catch {
      setOffline(true)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Sorry, I could not connect to the assistant right now. Make sure the chatbot server is running on port 3001.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat-panel"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute bottom-20 right-6 z-20 w-80 flex flex-col rounded-2xl border border-[#1e3358] bg-[#0a1628]/95 backdrop-blur-md shadow-2xl overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e3358] bg-[#0e1a30]">
            <div>
              <p className="font-sans font-semibold text-sm text-white">Food Assistant</p>
              <p className="font-mono text-[10px] text-[#7a93b8]">Powered by AI · FoodGrid Boston</p>
            </div>

            {/* Language selector */}
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#7a93b8]" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-[10px] font-mono text-[#7a93b8] outline-none cursor-pointer"
              >
                {LANGUAGES.map(({ code, label }) => (
                  <option key={code} value={code} className="bg-[#0a1628]">
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Offline banner */}
          {offline && (
            <div className="px-3 py-1.5 bg-red-900/30 border-b border-red-800/50">
              <p className="font-mono text-[10px] text-red-400">
                Chatbot server offline — start it with: <code>node server.js</code>
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5 min-h-0">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                    msg.role === 'user'
                      ? 'bg-[#f5a623] text-[#0a1628] font-medium rounded-br-sm'
                      : 'bg-[#111f38] border border-[#1e3358] text-white rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#111f38] border border-[#1e3358] rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <Loader2 className="w-4 h-4 text-[#7a93b8] animate-spin" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[#1e3358] bg-[#0e1a30]">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about food resources…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[#7a93b8]/60 outline-none font-sans"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-[#f5a623] text-[#0a1628] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e8961f] transition-colors duration-150 flex-shrink-0"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
