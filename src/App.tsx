import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/Home/index.tsx';
import AuthorizePage from './pages/Authorize/index.tsx';
import LoginPage from './pages/Login/index.tsx';
import ConsentPage from './pages/Consent/index.tsx';
import CallbackPage from './pages/Callback/index.tsx';
import TermsPage from './pages/Terms/index.tsx';
import PrivacyPage from './pages/Privacy/index.tsx';
import ProfilePage from './pages/Profile/index.tsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/authorize" element={<AuthorizePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/consent" element={<ConsentPage />} />
      <Route path="/:connection/callback" element={<CallbackPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
}

export default App;
