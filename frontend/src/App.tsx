import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LabelRequestPage from './pages/LabelRequestPage'
import OrganizationPage from './pages/OrganizationPage'

/* Routeur principal : site public + parcours label. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/label" element={<LabelRequestPage />} />
        <Route path="/o/:slug" element={<OrganizationPage />} />
      </Routes>
    </BrowserRouter>
  )
}
