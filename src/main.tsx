import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AutumnEntry from './modules/autumn-letter/AutumnEntry'
import { publicApps } from './shell/modules'
import App from './shell/App'
import AuthProvider from './shared/auth/AuthProvider'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Routes><Route path="/autumn-letter" element={<AutumnEntry />} />{publicApps.map(({ id, path, component: Page }) => <Route key={id} path={path} element={<Page />} />)}<Route path="*" element={<AuthProvider><App /></AuthProvider>} /></Routes></BrowserRouter></StrictMode>)
