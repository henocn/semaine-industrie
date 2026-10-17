import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PublicLayout } from './components/layout/PublicLayout'
import BilanPage from './pages/BilanPage'
import BusinessRegisterPage from './pages/BusinessRegisterPage'
import HomePage from './pages/HomePage'
import IndustriesPage from './pages/IndustriesPage'
import LabelRequestPage from './pages/LabelRequestPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import OrganizationPage from './pages/OrganizationPage'
import OrgaBusinessPage from './pages/OrgaBusinessPage'
import OrgaDashboardPage from './pages/OrgaDashboardPage'
import OrgaLabelsPage from './pages/OrgaLabelsPage'
import OrgaLivePage from './pages/OrgaLivePage'
import OrgaPassportsPage from './pages/OrgaPassportsPage'
import OrgaQrPage from './pages/OrgaQrPage'
import OrgaVisitsPage from './pages/OrgaVisitsPage'
import PassportPage from './pages/PassportPage'
import ProgrammePage from './pages/ProgrammePage'
import QuestionsPage from './pages/QuestionsPage'
import SurveyPage from './pages/SurveyPage'
import VotePage from './pages/VotePage'

/* Routeur : layout public partagé + espace orga. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/programme" element={<ProgrammePage />} />
          <Route path="/label" element={<LabelRequestPage />} />
          <Route path="/affaires" element={<BusinessRegisterPage />} />
          <Route path="/carte" element={<MapPage />} />
          <Route path="/industrie" element={<IndustriesPage />} />
          <Route path="/passeport/:code" element={<PassportPage />} />
          <Route path="/questions" element={<QuestionsPage />} />
          <Route path="/vote" element={<VotePage />} />
          <Route path="/questionnaire" element={<SurveyPage />} />
          <Route path="/o/:slug" element={<OrganizationPage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/bilan" element={<BilanPage />} />
        <Route path="/orga" element={<OrgaDashboardPage />} />
        <Route path="/orga/labels" element={<OrgaLabelsPage />} />
        <Route path="/orga/visites" element={<OrgaVisitsPage />} />
        <Route path="/orga/affaires" element={<OrgaBusinessPage />} />
        <Route path="/orga/passeports" element={<OrgaPassportsPage />} />
        <Route path="/orga/live" element={<OrgaLivePage />} />
        <Route path="/orga/qr" element={<OrgaQrPage />} />
      </Routes>
    </BrowserRouter>
  )
}
