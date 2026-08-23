import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { installChunkRecovery } from './appRecovery.js'

// Before anything renders: a deploy that lands while the app is open makes
// every not-yet-loaded chunk 404, which killed World and Studio simultaneously
// with "Importing a module script failed." See appRecovery.js for the full
// mechanism. This turns that crash into a single reload.
installChunkRecovery()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)
