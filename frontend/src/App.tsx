import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { RequireAdmin } from './components/auth/RequireAdmin'
import { RequireOrga } from './components/auth/RequireOrga'
import { PublicLayout } from './components/layout/PublicLayout'
import { isBackofficeHost } from './lib/seo'
import { peekOrgaUser } from './api/auth'
import BusinessRegisterPage from './pages/BusinessRegisterPage'
import FaqPage from './pages/FaqPage'
import HomePage from './pages/HomePage'
import IndustriesPage from './pages/IndustriesPage'
import LabelRequestPage from './pages/LabelRequestPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import OrganizationPage from './pages/OrganizationPage'
import OrgaAuditPage from './pages/OrgaAuditPage'
import OrgaBusinessPage from './pages/OrgaBusinessPage'
import OrgaDashboardPage from './pages/OrgaDashboardPage'
import OrgaResourcesPage from './pages/OrgaResourcesPage'
import OrgaLabelsPage from './pages/OrgaLabelsPage'
import OrgaParticipationsPage from './pages/OrgaParticipationsPage'
import OrgaSurveyPage from './pages/OrgaSurveyPage'
import OrgaUsersPage from './pages/OrgaUsersPage'
import OrgaVisitsPage from './pages/OrgaVisitsPage'
import PassportPage from './pages/PassportPage'
import PrivacyPage from './pages/PrivacyPage'
import ProgrammePage from './pages/ProgrammePage'
import ResourcesPage from './pages/ResourcesPage'
import SurveyPage from './pages/SurveyPage'
import VotePage from './pages/VotePage'

/* Sur le sous-domaine backoffice, n'autorise que login + espace orga. */
function BackofficeGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  if (!isBackofficeHost()) return children
  if (pathname === '/' || pathname === '/bilan') {
    return <Navigate to={peekOrgaUser() ? '/orga' : '/login'} replace />
  }
  const allowed = pathname === '/login' || pathname.startsWith('/orga')
  if (!allowed) return <Navigate to="/login" replace />
  return children
}

/* Routeur : layout public partagé + espace orga. */
export default function App() {
  return (
    <BrowserRouter>
      <BackofficeGate>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/programme" element={<ProgrammePage />} />
            <Route path="/label" element={<LabelRequestPage />} />
            <Route path="/ressources" element={<ResourcesPage />} />
            <Route path="/affaires" element={<BusinessRegisterPage />} />
            <Route path="/carte" element={<MapPage />} />
            <Route path="/industrie" element={<IndustriesPage />} />
            <Route path="/passeport/:code" element={<PassportPage />} />
            <Route path="/questions" element={<Navigate to="/" replace />} />
            <Route path="/vote" element={<VotePage />} />
            <Route path="/questionnaire" element={<SurveyPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/confidentialite" element={<PrivacyPage />} />
            <Route path="/o/:slug" element={<OrganizationPage />} />
          </Route>

          <Route path="/login" element={<LoginPage />} />
          <Route path="/bilan" element={<Navigate to="/orga" replace />} />

          <Route element={<RequireOrga />}>
            <Route path="/orga" element={<OrgaDashboardPage />} />
            <Route path="/orga/labels" element={<OrgaLabelsPage />} />
            <Route path="/orga/participations" element={<OrgaParticipationsPage />} />
            <Route path="/orga/visites" element={<OrgaVisitsPage />} />
            <Route path="/orga/affaires" element={<OrgaBusinessPage />} />
            <Route path="/orga/enquete" element={<OrgaSurveyPage />} />
            <Route path="/orga/ressources" element={<OrgaResourcesPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="/orga/audit" element={<OrgaAuditPage />} />
              <Route path="/orga/utilisateurs" element={<OrgaUsersPage />} />
            </Route>
            <Route path="/orga/qr" element={<Navigate to="/orga/labels" replace />} />
            <Route path="/orga/live" element={<Navigate to="/orga/enquete" replace />} />
            <Route path="/orga/passeports" element={<Navigate to="/orga" replace />} />
          </Route>
        </Routes>
      </BackofficeGate>
    </BrowserRouter>
  )
}
