import { Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import LandingPage from './pages/LandingPage';
import SelectionPage from './pages/SelectionPage';
import JobDetailsPage from './pages/JobDetailsPage';
import ApplicationFormPage from './pages/ApplicationFormPage';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/select"
        element={
          <AppShell>
            <SelectionPage />
          </AppShell>
        }
      />
      <Route
        path="/job/:id"
        element={
          <AppShell>
            <JobDetailsPage />
          </AppShell>
        }
      />
      <Route
        path="/apply/:id"
        element={
          <AppShell>
            <ApplicationFormPage />
          </AppShell>
        }
      />
      <Route
        path="/admin"
        element={
          <AppShell>
            <AdminDashboard />
          </AppShell>
        }
      />
    </Routes>
  );
}

export default App;
