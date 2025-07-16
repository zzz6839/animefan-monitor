import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CustomThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { TimezoneProvider } from './contexts/TimezoneContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <TimezoneProvider>
        <CustomThemeProvider>
          <App />
        </CustomThemeProvider>
      </TimezoneProvider>
    </LanguageProvider>
  </StrictMode>,
)
