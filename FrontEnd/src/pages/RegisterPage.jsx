import { useState } from "react";
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

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const allFieldsFilled = Object.values(formData).every(
    (value) => value.trim() !== ""
  );

  const passwordsMatch =
    formData.adminPassword === formData.confirmPassword;

  const isFormValid = allFieldsFilled && passwordsMatch;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isFormValid) return;

    alert("Company registered successfully");
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
              <input
                id="emailDomain"
                type="text"
                placeholder="example.com"
                value={formData.emailDomain}
                onChange={handleChange}
                required
              />
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
              <input
                id="adminEmail"
                type="email"
                placeholder="Enter admin email"
                value={formData.adminEmail}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="register-form__row">
            <div className="register-form__group">
              <label htmlFor="adminPassword">Admin Password</label>
              <input
                id="adminPassword"
                type="password"
                placeholder="Enter password"
                value={formData.adminPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-form__group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {!passwordsMatch && formData.confirmPassword && (
            <p className="register-error">Passwords do not match.</p>
          )}

          <button type="submit" className="register-btn" disabled={!isFormValid}>
            Register Company
          </button>
        </form>
      </div>
    </main>
  );
}