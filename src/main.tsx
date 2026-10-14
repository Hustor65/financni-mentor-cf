import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/hanken-grotesk/index.css'
import './styles/index.css'
import './styles/redesign.css'
import './styles/features.css'
import './styles/system.css'
import './styles/screens/shell.css'
import './styles/screens/academy.css'
import './styles/screens/tools.css'
import './styles/screens/markets.css'
import './styles/screens/mentor.css'
// postup přenesený ze stánku (?postup=…) se musí načíst dřív, než se vykreslí web
import './utils/transfer'
import App from './App'
import { KIOSK } from './utils/kiosk'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline provoz: service worker si uloží kostru webu. Na stánku rovnou i všechno
// ostatní (glóbus, snímky trhů), ať web přežije výpadek Wi‑Fi hned od rána.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // „warm“ musí dostat ten worker, který stránku opravdu řídí — po nasazení nové
    // verze se vymění a starou cache smaže, proto se posílá znovu při každé výměně
    const warm = () => { if (KIOSK) navigator.serviceWorker.controller?.postMessage({ type: 'warm' }) }
    navigator.serviceWorker.addEventListener('controllerchange', warm)
    navigator.serviceWorker.register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(warm)
      .catch(() => { /* bez service workeru web funguje dál, jen ne offline */ })
  })
}
