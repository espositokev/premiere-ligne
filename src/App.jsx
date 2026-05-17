import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import AppLayout from './components/layout/AppLayout'

import RootRedirect from './pages/RootRedirect'
import LoginPage from './pages/auth/LoginPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import Onboarding from './pages/Onboarding'

// Manager pages
import DashboardPage from './pages/manager/DashboardPage'
import EquipePage from './pages/manager/EquipePage'
import MatricePage from './pages/manager/MatricePage'
import PlansPage from './pages/manager/PlansPage'
import DefisPage from './pages/manager/DefisPage'
import ClassementPage from './pages/manager/ClassementPage'
import ParametresPage from './pages/manager/ParametresPage'

// Vendeur pages
import VendeurHomePage from './pages/vendeur/VendeurHomePage'
import VendeurEvalPage from './pages/vendeur/VendeurEvalPage'
import VendeurPlanPage from './pages/vendeur/VendeurPlanPage'
import VendeurDojosPage from './pages/vendeur/VendeurDojosPage'
import VendeurBadgesPage from './pages/vendeur/VendeurBadgesPage'
import VendeurClassementPage from './pages/vendeur/VendeurClassementPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Pages publiques */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Racine → redirection selon rôle */}
          <Route path="/" element={<RootRedirect />} />

          {/* Pages avec layout (sidebar) */}
          <Route element={<AppLayout />}>
            {/* Manager */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/equipe" element={<EquipePage />} />
            <Route path="/matrice" element={<MatricePage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/defis" element={<DefisPage />} />
            <Route path="/classement" element={<ClassementPage />} />
            <Route path="/parametres" element={<ParametresPage />} />

            {/* Vendeur */}
            <Route path="/mon-espace" element={<VendeurHomePage />} />
            <Route path="/mon-evaluation" element={<VendeurEvalPage />} />
            <Route path="/mon-plan" element={<VendeurPlanPage />} />
            <Route path="/mes-dojos" element={<VendeurDojosPage />} />
            <Route path="/mes-badges" element={<VendeurBadgesPage />} />
            <Route path="/classement-equipe" element={<VendeurClassementPage />} />
            <Route path="/defi-semaine" element={<VendeurClassementPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
