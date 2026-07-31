import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'
import { useTheme } from './store/useTheme'
import { useAuth } from './store/useAuth'

initAnalytics()
useAuth.getState().init()

// Honor an optional ?theme=light|dark override (deep-linkable) on load.
const themeParam = new URLSearchParams(location.search).get('theme')
if (themeParam === 'light' || themeParam === 'dark') {
  useTheme.getState().setTheme(themeParam)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
