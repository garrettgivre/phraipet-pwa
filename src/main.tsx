import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// Register service worker
function showUpdateToast(onReload: () => void) {
  const bar = document.createElement('div')
  bar.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 14px;border-radius:8px;z-index:9999;display:flex;gap:8px;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.25)'
  bar.textContent = 'New version available.'
  const button = document.createElement('button')
  button.textContent = 'Reload'
  button.style.cssText = 'background:#ffd966;color:#213547;border:none;padding:6px 10px;border-radius:6px;cursor:pointer'
  button.onclick = () => { document.body.removeChild(bar); onReload() }
  bar.appendChild(button)
  document.body.appendChild(bar)
}

const updateSW = registerSW({
  onNeedRefresh() {
    showUpdateToast(() => { void updateSW(true) })
  },
  onOfflineReady() {
    if (import.meta.env.DEV) console.log('App ready to work offline')
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
