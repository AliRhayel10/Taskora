import { useState } from "react";
import { FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import "./../assets/styles/register.css";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    companyName: "",
    companyCode: "",
    emailDomain: "",
    companyPhone: "",
    address: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });

  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const capitalizeWords = (value) => {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleChange = (e) => {
    const { id, value } = e.target;

    let formattedValue = value;

    if (["companyName", "address", "adminFullName"].includes(id)) {
      formattedValue = capitalizeWords(value);
    }

    if (id === "companyCode") {
      formattedValue = value.toUpperCase();
    }

    if (id === "emailDomain" || id === "adminEmail") {
      formattedValue = value.toLowerCase().trim();
    }

    setFormData((prev) => ({
      ...prev,
      [id]: formattedValue,
    }));
  };

  const allFieldsFilled = Object.values(formData).every(
    (value) => value.trim() !== ""
  );

  const passwordsMatch = formData.adminPassword === formData.confirmPassword;
  const hasPassword = formData.adminPassword.trim() !== "";
  const hasConfirmPassword = formData.confirmPassword.trim() !== "";

  const isValidDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(formData.emailDomain);
  const hasDomain = formData.emailDomain.trim() !== "";

  const hasAdminEmail = formData.adminEmail.trim() !== "";
  const emailMatchesDomain =
    hasDomain &&
    hasAdminEmail &&
    formData.adminEmail.toLowerCase().endsWith(`@${formData.emailDomain.toLowerCase()}`);

  const isStrongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.adminPassword);

  const isFormValid =
    allFieldsFilled &&
    passwordsMatch &&
    isValidDomain &&
    emailMatchesDomain &&
    isStrongPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isFormValid) return;

    try {
      const response = await fetch("http://localhost:5000/api/auth/register-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(data.message || "Registration failed");
        return;
      }

      localStorage.setItem("user", JSON.stringify(data));
      window.location.href = "/admin";
    } catch (error) {
      console.error(error);
      alert("Error connecting to server");
    }
  };

  return (
    <main className="register-page">
      <div className="register-card">
        <div className="register-card__header">
          <h1>Register Your Company</h1>
          <p>Create your company account and set up the admin profile.</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-form__row">
            <div className="register-form__group">
              <label htmlFor="companyName">Company Name</label>
              <input
                id="companyName"
                type="text"
                placeholder="Enter company name"
                value={formData.companyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-form__group">
              <label htmlFor="companyCode">Company Code</label>
              <input
                id="companyCode"
                type="text"
                placeholder="Enter company code"
                value={formData.companyCode}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="register-form__row">
            <div className="register-form__group">
              <label htmlFor="emailDomain">Email Domain</label>
              <div className="register-input-wrap">
                <input
                  id="emailDomain"
                  type="text"
                  placeholder="example.com"
                  value={formData.emailDomain}
                  onChange={handleChange}
                  className={hasDomain ? (isValidDomain ? "input-success" : "input-error") : ""}
                  required
                />
                {hasDomain && (
                  <span className={`input-badge ${isValidDomain ? "input-badge--success" : "input-badge--error"}`}>
                    {isValidDomain ? <FiCheckCircle /> : <FiAlertCircle />}
                    {isValidDomain ? "Valid" : "Invalid"}
                  </span>
                )}
              </div>
            </div>

            <div className="register-form__group">
              <label htmlFor="companyPhone">Company Phone</label>
              <input
                id="companyPhone"
                type="tel"
                placeholder="Enter company phone"
                value={formData.companyPhone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="register-form__group">
            <label htmlFor="address">Address</label>
            <input
              id="address"
              type="text"
              placeholder="Enter company address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="register-form__row">
            <div className="register-form__group">
              <label htmlFor="adminFullName">Admin Full Name</label>
              <input
                id="adminFullName"
                type="text"
                placeholder="Enter admin full name"
                value={formData.adminFullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-form__group">
              <label htmlFor="adminEmail">Admin Email</label>
              <div className="register-input-wrap">
                <input
                  id="adminEmail"
                  type="email"
                  placeholder="Enter admin email"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className={
                    hasAdminEmail && hasDomain && isValidDomain
                      ? emailMatchesDomain
                        ? "input-success"
                        : "input-error"
                      : ""
                  }
                  required
                />
                {hasAdminEmail && hasDomain && isValidDomain && (
                  <span
                    className={`input-badge ${emailMatchesDomain ? "input-badge--success" : "input-badge--error"}`}
                  >
                    {emailMatchesDomain ? <FiCheckCircle /> : <FiAlertCircle />}
                    {emailMatchesDomain ? "Match" : "No match"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="register-form__row">
            <div className="register-form__group">
              <label htmlFor="adminPassword">Admin Password</label>
              <div className="register-password-field">
                <input
                  id="adminPassword"
                  type={showAdminPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  className={hasPassword ? (isStrongPassword ? "input-success" : "input-error") : ""}
                  required
                />
                {hasPassword && (
                  <span className={`input-badge input-badge--password ${isStrongPassword ? "input-badge--success" : "input-badge--error"}`}>
                    {isStrongPassword ? <FiCheckCircle /> : <FiAlertCircle />}
                    {isStrongPassword ? "Strong" : "Weak"}
                  </span>
                )}
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowAdminPassword((prev) => !prev)}
                  aria-label={showAdminPassword ? "Hide password" : "Show password"}
                >
                  {showAdminPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
            </div>

            <div className="register-form__group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="register-password-field">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={hasConfirmPassword ? (passwordsMatch ? "input-success" : "input-error") : ""}
                  required
                />
                {hasConfirmPassword && (
                  <span className={`input-badge input-badge--password ${passwordsMatch ? "input-badge--success" : "input-badge--error"}`}>
                    {passwordsMatch ? <FiCheckCircle /> : <FiAlertCircle />}
                    {passwordsMatch ? "Match" : "No match"}
                  </span>
                )}
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <FiEye /> : <FiEyeOff />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="register-btn" disabled={!isFormValid}>
            Register Company
          </button>
        </form>
      </div>
    </main>
  );
}