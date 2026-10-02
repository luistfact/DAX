import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MotionConfig } from 'motion/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Respaldo global: con prefers-reduced-motion, Motion no anima transformaciones aunque un componente lo pida. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
