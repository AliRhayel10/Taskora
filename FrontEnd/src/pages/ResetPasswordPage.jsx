import { useState, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";
import "./../assets/styles/reset-password.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);
  const otp = useMemo(() => searchParams.get("otp") || "", [searchParams]);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordsMatch = formData.newPassword === formData.confirmPassword;
  const isStrongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.newPassword);

  const isFormValid =
    email.trim() !== "" &&
    otp.trim() !== "" &&
    formData.newPassword.trim() !== "" &&
    formData.confirmPassword.trim() !== "" &&
    passwordsMatch &&
    isStrongPassword;

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || loading) return;

    setMessage("");
    setErrorMessage("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: otp,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Password reset failed.");
        setLoading(false);
        return;
      }

      setMessage(data.message || "Password reset successful.");
      setLoading(false);

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error) {
      console.error(error);
      setErrorMessage("Error connecting to server.");
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <h1>Reset Password</h1>
          <p>Create a new password for your account.</p>
        </div>

        {(!email || !otp) && (
          <p className="login-error">
            Missing verification details. Please request a new code.
          </p>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__group">
            <label htmlFor="newPassword">New Password</label>
            <div className="login-password-field">
              <input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
          </div>

          <div className="login-form__group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="login-password-field">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
          </div>

          {formData.newPassword && !isStrongPassword && (
            <p className="login-error">
              Password must be at least 8 characters and include uppercase, lowercase, and a number.
            </p>
          )}

          {formData.confirmPassword && !passwordsMatch && (
            <p className="login-error">Passwords do not match.</p>
          )}

          {message && <p className="login-success">{message}</p>}
          {errorMessage && <p className="login-error">{errorMessage}</p>}

          <button
            type="submit"
            className="login-btn"
            disabled={!isFormValid || loading}
          >
            <FiArrowRight />
            <span>{loading ? "Resetting..." : "Reset Password"}</span>
          </button>
        </form>

        <div className="forgot-back">
          <span>Back to account access?</span>
          <Link to="/login">Go to login</Link>
        </div>
      </div>
    </main>
  );
}