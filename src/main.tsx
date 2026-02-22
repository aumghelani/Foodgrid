import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

// NOTE: React.StrictMode is intentionally omitted.
// deck.gl v9 (luma.gl WebGLCanvasContext) is not StrictMode-compatible:
// the double-mount cycle destroys the WebGL context between renders, which
// triggers the "Cannot read properties of undefined (reading
// 'maxTextureDimension2D')" crash in canvas-context.ts:238.
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
