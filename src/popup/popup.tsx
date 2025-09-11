import React from 'react'
import ReactDOM from 'react-dom/client'
import '../globals.css'
import PopupApp from './PopupApp'

const root = ReactDOM.createRoot(
  document.getElementById('popup-root') as HTMLElement
)

root.render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>
)