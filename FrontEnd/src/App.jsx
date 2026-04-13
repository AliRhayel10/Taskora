import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import TeamLeaderDashboard from "./pages/TeamLeaderDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TeamDetailsPage from "./components/admin/TeamDetailsPage";
import "./assets/styles/global.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/teams/:teamId" element={<TeamDetailsPage />} />
      <Route path="/teamleader" element={<TeamLeaderDashboard />} />
      <Route path="/employee" element={<div>Employee Page</div>} />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}