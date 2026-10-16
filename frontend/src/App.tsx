import { BrowserRouter, Route, Routes } from 'react-router-dom'
import BilanPage from './pages/BilanPage'
import BookingPage from './pages/BookingPage'
import HomePage from './pages/HomePage'
import LabelRequestPage from './pages/LabelRequestPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import OrganizationPage from './pages/OrganizationPage'
import OrgaDashboardPage from './pages/OrgaDashboardPage'
import OrgaLabelsPage from './pages/OrgaLabelsPage'
import OrgaQrPage from './pages/OrgaQrPage'
import OrgaVisitsPage from './pages/OrgaVisitsPage'

/* Routeur principal : site public + label + orga. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/label" element={<LabelRequestPage />} />
        <Route path="/visites" element={<BookingPage />} />
        <Route path="/carte" element={<MapPage />} />
        <Route path="/bilan" element={<BilanPage />} />
        <Route path="/o/:slug" element={<OrganizationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/orga" element={<OrgaDashboardPage />} />
        <Route path="/orga/labels" element={<OrgaLabelsPage />} />
        <Route path="/orga/visites" element={<OrgaVisitsPage />} />
        <Route path="/orga/qr" element={<OrgaQrPage />} />
      </Routes>
    </BrowserRouter>
  )
}
