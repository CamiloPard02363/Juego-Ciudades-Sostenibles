import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { ToastProvider } from './hooks/useToast.tsx'
import { ThemeProvider } from './hooks/useTheme.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ScrollMoreHint } from './components/ScrollMoreHint.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <ThemeProvider>
              <App />
              {/* Páginas que hacen scroll con la ventana (públicas, login, registro…).
                  Los layouts de pantalla completa traen su propio indicador. */}
              <ScrollMoreHint scope="window" />
            </ThemeProvider>
          </AuthProvider>
        </ToastProvider>
        <Analytics />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
