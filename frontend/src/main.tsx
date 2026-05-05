import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles/tokens.css'
import App from './App'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'

function AppWithBoundary() {
  const [key, setKey] = React.useState(0)
  return (
    <ErrorBoundary onReset={() => setKey((k) => k + 1)}>
      <App key={key} />
    </ErrorBoundary>
  )
}

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppWithBoundary />
    </React.StrictMode>
  )
  // Tell index.html the app mounted successfully → removes the boot badge
  ;(window as any).__urbanmind_ready?.()
} catch (error) {
  const bootStatus = document.getElementById('boot-status')
  if (bootStatus) {
    bootStatus.innerHTML = `<b>⚠ Startup crash</b><br>${error instanceof Error ? error.message : String(error)}`
    bootStatus.style.borderColor = '#ef4444'
    bootStatus.style.color = '#fecaca'
    bootStatus.style.background = '#1a0a0a'
  }
  throw error
}
