import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import "./../assets/styles/verify-otp.css";

export default function VerifyOtpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const otpValue = otp.join("");
  const isFormValid = otpValue.length === 6 && email.trim() !== "";

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    e.preventDefault();

    const updated = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, index) => {
      updated[index] = char;
    });

    setOtp(updated);

    const focusIndex = Math.min(pasted.length, 5);
    inputsRef.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid || loading) return;

    setErrorMessage("");

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/auth/verify-reset-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp: otpValue,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Invalid or expired code.");
        return;
      }

      navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otpValue)}`);
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
          <h1>Enter Verification Code</h1>
          <p>We sent a 6-digit code to your email.</p>
        </div>

        {!email && (
          <p className="login-error">
            Missing email address. Please go back and request a new code.
          </p>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="otp-group">
            <label>Verification Code</label>

            <div className="otp-inputs" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="otp-input"
                />
              ))}
            </div>
          </div>

          {errorMessage && <p className="login-error">{errorMessage}</p>}

          <button type="submit" className="login-btn" disabled={!isFormValid || loading}>
            <FiArrowRight />
            <span>{loading ? "Verifying..." : "Continue"}</span>
          </button>
        </form>

        <div className="forgot-back">
          <span>Entered the wrong email?</span>
          <Link to="/forgot-password">Go back</Link>
        </div>
      </div>
    </main>
  );
}