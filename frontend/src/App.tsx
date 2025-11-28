import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AssessmentBuilder from './pages/AssessmentBuilder';
import AssessmentList from './pages/AssessmentList';
import AssessmentAnalytics from './pages/AssessmentAnalytics';
import PublicSurvey from './pages/PublicSurvey';
import EmailSequences from './pages/EmailSequences';
import CustomDomains from './pages/CustomDomains';

// Components
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/survey/:slug" element={<PublicSurvey />} />

        {/* Protected routes */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/assessments" element={<AssessmentList />} />
            <Route path="/assessments/new" element={<AssessmentBuilder />} />
            <Route path="/assessments/:id/edit" element={<AssessmentBuilder />} />
            <Route path="/assessments/:id/analytics" element={<AssessmentAnalytics />} />
            <Route path="/assessments/:id/emails" element={<EmailSequences />} />
            <Route path="/custom-domains" element={<CustomDomains />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<div>Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
