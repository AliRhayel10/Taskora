import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import "./../assets/styles/forgot-password.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const isFormValid = email.trim() !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || loading) return;

    setErrorMessage("");

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to send reset link.");
        return;
      }

      if (data.token) {
        navigate(`/reset-password?token=${encodeURIComponent(data.token)}`);
        return;
      }

      setErrorMessage("No reset token was returned.");
    } catch (error) {
      console.error(error);
      setErrorMessage("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <h1>Forgot Your Password?</h1>
          <p>Enter your email and we’ll help you reset your password.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
              required
            />
          </div>

          {errorMessage && <p className="login-error">{errorMessage}</p>}

          <button
            type="submit"
            className="login-btn"
            disabled={!isFormValid || loading}
          >
            <FiArrowRight />
            <span>{loading ? "Sending..." : "Send Reset Link"}</span>
          </button>
        </form>

        <div className="forgot-back">
          <span>Remembered your password?</span>
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </main>
  );
}