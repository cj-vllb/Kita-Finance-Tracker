import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import { isConfigured } from './lib/supabaseClient.js'
import './styles/tokens.css'
import './styles/app.css'
createRoot(document.getElementById('root')).render(isConfigured
  ? <><BrowserRouter><AppProvider><App /></AppProvider></BrowserRouter><Analytics /><SpeedInsights /></>
  : <main className="auth"><h1>Supabase is not configured</h1><p className="muted">Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env.local file, then restart the dev server.</p></main>)
