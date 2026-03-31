import { useState } from "react";
import { FiEye, FiEyeOff, FiArrowRight } from "react-icons/fi";
import "./../assets/styles/login.css";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: id === "email" ? value.toLowerCase().trim() : value,
    }));
  };

  const isFormValid =
    formData.email.trim() !== "" &&
    formData.password.trim() !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isFormValid) return;

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Login failed.");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data));
      window.location.href = "/admin";
    } catch (error) {
      console.error(error);
      setErrorMessage("Error connecting to server.");
    }
  };

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-card__header">
          <h1>Welcome Back</h1>
          <p>Sign in to access your Taskora dashboard.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-form__group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="login-form__group">
            <label htmlFor="password">Password</label>
            <div className="login-password-field">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEye /> : <FiEyeOff />}
              </button>
            </div>
          </div>

          {errorMessage && <p className="login-error">{errorMessage}</p>}

<button type="submit" className="login-btn" disabled={!isFormValid}>
  <FiArrowRight />
  <span>Access Dashboard</span>
</button>
        </form>
      </div>
    </main>
  );
}