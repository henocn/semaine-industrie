import { BrowserRouter, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LabelRequestPage from './pages/LabelRequestPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import OrganizationPage from './pages/OrganizationPage'
import OrgaLabelsPage from './pages/OrgaLabelsPage'

/* Routeur principal : site public + label + orga. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/label" element={<LabelRequestPage />} />
        <Route path="/carte" element={<MapPage />} />
        <Route path="/o/:slug" element={<OrganizationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/orga/labels" element={<OrgaLabelsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
