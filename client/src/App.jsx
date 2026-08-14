import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadCall from './pages/UploadCall';
import Calls from './pages/Calls';
import CallDetail from './pages/CallDetail';
import Proposals from './pages/Proposals';
import ProposalEditor from './pages/ProposalEditor';
import Templates from './pages/Templates';
import Billing from './pages/Billing';
import PublicProposal from './pages/PublicProposal';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/p/:slug" element={<PublicProposal />} />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<UploadCall />} />
        <Route path="calls" element={<Calls />} />
        <Route path="calls/:id" element={<CallDetail />} />
        <Route path="proposals" element={<Proposals />} />
        <Route path="proposals/:id" element={<ProposalEditor />} />
        <Route path="templates" element={<Templates />} />
        <Route path="billing" element={<Billing />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
