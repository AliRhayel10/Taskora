import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import TeamLeaderDashboard from "./pages/TeamLeaderDashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import VerifyOtpPage from "./pages/VerifyOtpPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TeamDetailsPage from "./components/admin/TeamDetailsPage";
import "./assets/styles/global.css";

const API_BASE = "http://localhost:5000";
const INACTIVE_ACCOUNT_MESSAGE =
  "Your account is inactive. Please contact your administrator.";

function parseStoredUser() {
  try {
    const authUser = localStorage.getItem("authUser");
    const user = localStorage.getItem("user");

    return authUser ? JSON.parse(authUser) : user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function getStoredUserId(user) {
  return Number(
    user?.userId ||
      user?.UserId ||
      user?.id ||
      user?.employeeId ||
      user?.EmployeeId ||
      0
  );
}

function clearStoredUser() {
  localStorage.removeItem("authUser");
  localStorage.removeItem("user");
}

function ProtectedActiveRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    const logoutInactiveUser = (message = INACTIVE_ACCOUNT_MESSAGE) => {
      clearStoredUser();

      if (isMounted) {
        setIsAllowed(false);
        setIsChecking(false);
        navigate("/login", {
          replace: true,
          state: { message },
        });
      }
    };

    const checkUserStatus = async () => {
      const storedUser = parseStoredUser();
      const userId = getStoredUserId(storedUser);

      if (!storedUser || !userId) {
        clearStoredUser();

        if (isMounted) {
          setIsAllowed(false);
          setIsChecking(false);
          navigate("/login", {
            replace: true,
            state: {
              message: "Please log in to continue.",
            },
          });
        }

        return;
      }

      if (
        storedUser.isActive === false ||
        String(storedUser.status || "").trim().toLowerCase() === "inactive"
      ) {
        logoutInactiveUser();
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/auth/profile/${userId}`, {
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 403 || data?.isActive === false) {
          logoutInactiveUser(data?.message || INACTIVE_ACCOUNT_MESSAGE);
          return;
        }

        if (!response.ok || data?.success === false) {
          throw new Error(data?.message || "Unable to verify account status.");
        }

        const nextUser = {
          ...storedUser,
          fullName: data.fullName ?? storedUser.fullName,
          email: data.email ?? storedUser.email,
          role: data.role ?? storedUser.role,
          companyName: data.companyName ?? storedUser.companyName,
          profileImageUrl: data.profileImageUrl ?? storedUser.profileImageUrl,
          jobTitle: data.jobTitle ?? storedUser.jobTitle,
          isActive: data.isActive ?? true,
          status: data.status || "Active",
        };

        localStorage.setItem("user", JSON.stringify(nextUser));
        localStorage.setItem("authUser", JSON.stringify(nextUser));

        if (isMounted) {
          setIsAllowed(true);
          setIsChecking(false);
        }
      } catch {
        if (isMounted) {
          setIsAllowed(true);
          setIsChecking(false);
        }
      }
    };

    checkUserStatus();
    intervalId = window.setInterval(checkUserStatus, 10000);
    window.addEventListener("focus", checkUserStatus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkUserStatus();
      }
    });

    return () => {
      isMounted = false;

      if (intervalId) {
        window.clearInterval(intervalId);
      }

      window.removeEventListener("focus", checkUserStatus);
    };
  }, [navigate, location.pathname]);

  if (isChecking) {
    return null;
  }

  if (!isAllowed) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: "Please log in to continue." }}
      />
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedActiveRoute>
            <AdminDashboard />
          </ProtectedActiveRoute>
        }
      />
      <Route
        path="/teams/:teamId"
        element={
          <ProtectedActiveRoute>
            <TeamDetailsPage />
          </ProtectedActiveRoute>
        }
      />
      <Route
        path="/teamleader"
        element={
          <ProtectedActiveRoute>
            <TeamLeaderDashboard />
          </ProtectedActiveRoute>
        }
      />

      <Route
        path="/employee"
        element={
          <ProtectedActiveRoute>
            <EmployeeDashboard />
          </ProtectedActiveRoute>
        }
      />
      <Route
        path="/employee/tasks/:taskId"
        element={
          <ProtectedActiveRoute>
            <EmployeeDashboard />
          </ProtectedActiveRoute>
        }
      />

      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}
