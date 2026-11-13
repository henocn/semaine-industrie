import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { RequireAdmin } from './components/auth/RequireAdmin'
import { RequireOrga } from './components/auth/RequireOrga'
import { ScrollToTop } from './components/ScrollToTop'
import { PublicLayout } from './components/layout/PublicLayout'
import { isBackofficeHost } from './lib/seo'
import { peekOrgaUser } from './api/auth'
// Rencontres d'affaires et vote retirés du public (programme validé) ; pages conservées pour une reprise éventuelle.
// import BusinessRegisterPage from './pages/BusinessRegisterPage'
import AccreditationMediasPage from './pages/AccreditationMediasPage'
import ConcoursVideoPage from './pages/ConcoursVideoPage'
import FaqPage from './pages/FaqPage'
import HomePage from './pages/HomePage'
import IndustriesPage from './pages/IndustriesPage'
// Visites des écoles / universités retirées du public (inscriptions closes) ; page conservée pour une reprise éventuelle.
// import InscriptionGroupPage from './pages/InscriptionGroupPage'
import InscriptionParticulierPage from './pages/InscriptionParticulierPage'
import JourneesPalaisPage from './pages/JourneesPalaisPage'
import LabelRequestPage from './pages/LabelRequestPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import MonEspacePage from './pages/MonEspacePage'
import NotFoundPage from './pages/NotFoundPage'
// Fiche détaillée retirée : les industries s'ouvrent en carte sur /industrie (QR /o/:slug redirigés).
// import OrganizationPage from './pages/OrganizationPage'
import OrgaAuditPage from './pages/OrgaAuditPage'
import OrgaChatbotPage from './pages/OrgaChatbotPage'
import OrgaChatbotDetailPage from './pages/OrgaChatbotDetailPage'
import OrgaBusinessPage from './pages/OrgaBusinessPage'
import OrgaDashboardPage from './pages/OrgaDashboardPage'
import OrgaResourcesPage from './pages/OrgaResourcesPage'
import OrgaLabelsPage from './pages/OrgaLabelsPage'
import OrgaParticipationsPage from './pages/OrgaParticipationsPage'
import OrgaSurveyPage from './pages/OrgaSurveyPage'
import OrgaUsersPage from './pages/OrgaUsersPage'
import OrgaVisitsPage from './pages/OrgaVisitsPage'
import PassagePage from './pages/PassagePage'
import PrivacyPage from './pages/PrivacyPage'
import ReglesPage from './pages/ReglesPage'
import ProgrammePage from './pages/ProgrammePage'
// import VotePage from './pages/VotePage'
import VueParVousPage from './pages/VueParVousPage'

/* Ancienne adresse du questionnaire (liens, QR) : garde phase / code. */
function SurveyRedirect() {
  const { search } = useLocation()
  const extra = search.replace(/^\?/, '')
  return <Navigate to={`/vue-par-vous?jeu=sondage${extra ? `&${extra}` : ''}`} replace />
}

/* Ancien lien du passeport (messages déjà envoyés) : ouvre le même dossier dans Mon espace. */
function PassportRedirect() {
  const { code = '' } = useParams()
  return <Navigate to={`/mon-espace?code=${encodeURIComponent(code)}`} replace />
}

/* Ancienne fiche d'une industrie (QR des labels, messages) : ouvre sa carte dans la liste des industries. */
function OrganizationRedirect() {
  const { slug = '' } = useParams()
  return <Navigate to={`/industrie/?o=${encodeURIComponent(slug)}`} replace />
}

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

/* Arbre des routes, partagé par le navigateur (BrowserRouter) et le pré-rendu (StaticRouter). */
export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <BackofficeGate>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/programme" element={<ProgrammePage />} />
            <Route path="/label" element={<LabelRequestPage />} />
            {/* <Route path="/inscription" element={<Navigate to="/inscription-groupe/" replace />} /> */}
            {/* <Route path="/inscription-groupe" element={<InscriptionGroupPage />} /> */}
            <Route path="/inscription-particulier" element={<InscriptionParticulierPage />} />
            <Route path="/journees-au-palais" element={<JourneesPalaisPage />} />
            <Route path="/accreditation-medias" element={<AccreditationMediasPage />} />
            <Route path="/ressources" element={<Navigate to="/#ressources" replace />} />
            <Route path="/mon-espace" element={<MonEspacePage />} />
            {/* <Route path="/affaires" element={<BusinessRegisterPage />} /> */}
            <Route path="/carte" element={<MapPage />} />
            <Route path="/industrie" element={<IndustriesPage />} />
            <Route path="/passeport/:code" element={<PassportRedirect />} />
            <Route path="/passage/:code" element={<PassagePage />} />
            <Route path="/questions" element={<Navigate to="/" replace />} />
            {/* <Route path="/vote" element={<VotePage />} /> */}
            <Route path="/questionnaire" element={<SurveyRedirect />} />
            <Route path="/vue-par-vous" element={<VueParVousPage />} />
            <Route path="/concours-video" element={<ConcoursVideoPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/confidentialite" element={<PrivacyPage />} />
            <Route path="/regles-de-participation" element={<ReglesPage />} />
            <Route path="/o/:slug" element={<OrganizationRedirect />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />

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
              <Route path="/orga/chatbot" element={<OrgaChatbotPage />} />
              <Route path="/orga/chatbot/:phone" element={<OrgaChatbotDetailPage />} />
              <Route path="/orga/audit" element={<OrgaAuditPage />} />
              <Route path="/orga/utilisateurs" element={<OrgaUsersPage />} />
            </Route>
            <Route path="/orga/qr" element={<Navigate to="/orga/labels" replace />} />
            <Route path="/orga/live" element={<Navigate to="/orga/enquete" replace />} />
            <Route path="/orga/passeports" element={<Navigate to="/orga" replace />} />
          </Route>
        </Routes>
      </BackofficeGate>
    </>
  )
}

/* Routeur : layout public partagé + espace orga. */
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
