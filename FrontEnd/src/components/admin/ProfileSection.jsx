import { useState } from "react";
import "./../../assets/styles/admin/profile-section.css";

export default function ProfileSection({ user }) {
  const fullName = user?.fullName || "Not available";
  const nameParts = fullName.trim().split(" ");
  const firstName = nameParts[0] || "Not available";
  const lastName =
    nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Not available";

  const initials =
    user?.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AU";

  const [imagePreview, setImagePreview] = useState(
    user?.profileImageUrl
      ? `http://localhost:5000${user.profileImageUrl}`
      : ""
  );

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.userId) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.userId);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/upload-profile-image",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error(data.message || "Image upload failed.");
        return;
      }

      const fullImageUrl = `http://localhost:5000${data.imageUrl}`;
      setImagePreview(fullImageUrl);

      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : {};

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...parsedUser,
          profileImageUrl: data.imageUrl,
        })
      );
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  return (
    <section className="profile-page">
      <div className="profile-page__title-row">
        <h2>My Profile</h2>
        <div className="profile-page__title-line"></div>
      </div>

      <div className="profile-hero-card">
        <div className="profile-hero-card__avatar-wrapper">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Profile"
              className="profile-hero-card__avatar-img"
            />
          ) : (
            <div className="profile-hero-card__avatar-fallback">
              {initials}
            </div>
          )}

          <label className="profile-upload-btn">
            📷
            <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </label>
        </div>

        <div className="profile-hero-card__content">
          <h3>{fullName}</h3>
          <p>{user?.role || "Not available"}</p>
          <span>{user?.email || "Not available"}</span>
        </div>
      </div>

      <div className="profile-info-card">
        <div className="profile-info-card__header">
          <h3>Personal Information</h3>
          <button type="button" className="profile-edit-btn">
            Edit
          </button>
        </div>

        <div className="profile-info-card__divider"></div>

        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="profile-info-item__label">First Name</span>
            <strong className="profile-info-item__value">{firstName}</strong>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">Last Name</span>
            <strong className="profile-info-item__value">{lastName}</strong>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">User Role</span>
            <strong className="profile-info-item__value">
              {user?.role || "Not available"}
            </strong>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">Email Address</span>
            <strong className="profile-info-item__value">
              {user?.email || "Not available"}
            </strong>
          </div>

          <div className="profile-info-item">
            <span className="profile-info-item__label">Company Name</span>
            <strong className="profile-info-item__value">
              {user?.companyName || "Not available"}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}