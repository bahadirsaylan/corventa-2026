import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { IS_STANDARD } from '@shared/edition'

// STANDART SÜRÜM (2026-11-17) — pencere / görev çubuğu başlığında sürüm adı (AI sürümünde başlık aynen kalır)
if (IS_STANDARD) document.title = 'Corventa Desktop — Standart'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
