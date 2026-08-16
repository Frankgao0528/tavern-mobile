import React from 'react'
import ReactDOM from 'react-dom/client'
import './api.js'
import App from './App.jsx'
import OverlayProvider from './components/Overlay.jsx'
import './styles.css'
import './mobile.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <OverlayProvider>
      <App />
    </OverlayProvider>
  </React.StrictMode>
)
