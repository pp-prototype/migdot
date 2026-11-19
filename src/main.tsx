import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import WalletPage from './modules/meta-wallet/WalletPage'
import App from './shell/App'
import AuthProvider from './shared/auth/AuthProvider'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Routes><Route path="/meta-wallet" element={<WalletPage />} /><Route path="*" element={<AuthProvider><App /></AuthProvider>} /></Routes></BrowserRouter></StrictMode>)
