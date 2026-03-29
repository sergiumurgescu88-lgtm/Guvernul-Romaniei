/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { MinisterDashboard } from './pages/MinisterDashboard';
import { MinisterChat } from './pages/MinisterChat';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="citizen" element={<CitizenDashboard />} />
            <Route path="minister" element={<MinisterDashboard />} />
            <Route path="chat/:ministryId" element={<MinisterChat />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
