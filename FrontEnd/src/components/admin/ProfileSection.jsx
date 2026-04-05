import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiBriefcase,
  FiCamera,
  FiCheck,
  FiEdit2,
  FiLock,
  FiMail,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import Cropper from "react-easy-crop";
import "./../../assets/styles/admin/profile-section.css";

const API_BASE_URL = "http://localhost:5000";

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

async function getCroppedImage(src, cropPixels) {
  const image = await createImage(src);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to crop image."));
          return;
        }

        const file = new File([blob], "profile-image.jpg", {
          type: "image/jpeg",
        });

        resolve(file);
      },
      "image/jpeg",
      0.95
    );
  });
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ProfileSection({ user }) {
  const fileInputRef = useRef(null);
  const profileInfoCardRef = useRef(null);

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    companyName: "",
    email: "",
    fullName: "",
    role: "",
    profileImageUrl: "",
  });

  const [draftData, setDraftData] = useState({
    firstName: "",
    lastName: "",
    jobTitle: "",
    companyName: "",
    email: "",
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [formMessage, setFormMessage] = useState({ type: "", text: "" });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const userId = user?.userId || 0;

  const syncProfileStateFromBackend = useCallback((profile) => {
    const fullName = profile?.fullName || "Not available";
    const nameParts = fullName.trim().split(" ").filter(Boolean);

    const nextProfileData = {
      firstName: nameParts[0] || "",
      lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
      jobTitle: profile?.jobTitle || "",
      companyName: profile?.companyName || "",
      email: profile?.email || "",
      fullName,
      role: profile?.role || "Not available",
      profileImageUrl: profile?.profileImageUrl || "",
    };

    setProfileData(nextProfileData);
    setDraftData({
      firstName: nextProfileData.firstName,
      lastName: nextProfileData.lastName,
      jobTitle: nextProfileData.jobTitle,
      companyName: nextProfileData.companyName,
      email: nextProfileData.email,
    });
  }, []);

  const fetchProfileFromBackend = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoadingProfile(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/profile/${userId}`);
      const rawText = await response.text();

      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(rawText || "Server did not return valid JSON.");
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load profile.");
      }

      syncProfileStateFromBackend(data);
    } catch (error) {
      console.error("Failed to fetch profile from backend:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [syncProfileStateFromBackend, userId]);

  useEffect(() => {
    if (!userId) return;
    fetchProfileFromBackend();
  }, [userId, fetchProfileFromBackend]);

  useEffect(() => {
    if (!userId || profileData.fullName) return;

    if (user?.fullName) {
      const fullName = user.fullName || "Not available";
      const nameParts = fullName.trim().split(" ").filter(Boolean);

      const fallbackProfile = {
        firstName: nameParts[0] || "",
        lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : "",
        jobTitle: user?.jobTitle || "",
        companyName: user?.companyName || "",
        email: user?.email || "",
        fullName,
        role: user?.role || "Not available",
        profileImageUrl: user?.profileImageUrl || "",
      };

      setProfileData(fallbackProfile);
      setDraftData({
        firstName: fallbackProfile.firstName,
        lastName: fallbackProfile.lastName,
        jobTitle: fallbackProfile.jobTitle,
        companyName: fallbackProfile.companyName,
        email: fallbackProfile.email,
      });
    }
  }, [user, userId, profileData.fullName]);

  const cancelEditingProfile = useCallback(() => {
    setDraftData({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      jobTitle: profileData.jobTitle,
      companyName: profileData.companyName,
      email: profileData.email,
    });
    setCurrentPassword("");
    setEmailErrorMessage("");
    setPasswordErrorMessage("");
    setFormMessage({ type: "", text: "" });
    setIsEditingProfile(false);
  }, [profileData]);

  useEffect(() => {
    if (!isEditingProfile) {
      return;
    }

    const handlePointerDownOutside = (event) => {
      if (
        profileInfoCardRef.current &&
        !profileInfoCardRef.current.contains(event.target)
      ) {
        cancelEditingProfile();
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("touchstart", handlePointerDownOutside);

    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("touchstart", handlePointerDownOutside);
    };
  }, [isEditingProfile, cancelEditingProfile]);

  const fullName = profileData.fullName || "Not available";

  const initials =
    fullName !== "Not available"
      ? fullName
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "AU";

  const emailChanged =
    draftData.email.trim().toLowerCase() !== profileData.email.trim().toLowerCase();

  const imagePreview = useMemo(() => {
    if (!profileData.profileImageUrl || profileData.profileImageUrl.trim() === "") {
      return "";
    }

    if (profileData.profileImageUrl.startsWith("http")) {
      return profileData.profileImageUrl;
    }

    return `${API_BASE_URL}${profileData.profileImageUrl}`;
  }, [profileData.profileImageUrl]);

  const [selectedImage, setSelectedImage] = useState("");
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openCropModalFromAvatar = async () => {
    if (!imagePreview || imagePreview.trim() === "") return;

    try {
      const response = await fetch(imagePreview, { mode: "cors" });

      if (!response.ok) {
        throw new Error("Could not load image.");
      }

      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);

      setSelectedImage(localUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropModal(true);
    } catch (error) {
      console.error("Failed to load image for editing:", error);
      alert("Could not open current image for editing.");
    }
  };

  const handleSelectImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setSelectedImage(localUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowCropModal(true);
    e.target.value = "";
  };

  const handleCloseCropModal = () => {
    if (selectedImage && selectedImage.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage);
    }

    setSelectedImage("");
    setShowCropModal(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleStartEditingProfile = () => {
    setDraftData({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      jobTitle: profileData.jobTitle,
      companyName: profileData.companyName,
      email: profileData.email,
    });
    setCurrentPassword("");
    setEmailErrorMessage("");
    setPasswordErrorMessage("");
    setFormMessage({ type: "", text: "" });
    setIsEditingProfile(true);
  };

  const handleInputChange = (field, value) => {
    setDraftData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (field === "email") {
      setEmailErrorMessage("");
      setPasswordErrorMessage("");
      setFormMessage({ type: "", text: "" });

      if (value.trim().toLowerCase() === profileData.email.trim().toLowerCase()) {
        setCurrentPassword("");
      }
    }
  };

  const handlePasswordChange = (value) => {
    setCurrentPassword(value);
    setPasswordErrorMessage("");
    setFormMessage({ type: "", text: "" });
  };

  const handleSaveProfile = async () => {
    if (!userId || isSavingProfile) return;

    const cleanedData = {
      firstName: draftData.firstName.trim(),
      lastName: draftData.lastName.trim(),
      jobTitle: draftData.jobTitle.trim(),
      companyName: draftData.companyName.trim(),
      email: draftData.email.trim(),
    };

    setEmailErrorMessage("");
    setPasswordErrorMessage("");
    setFormMessage({ type: "", text: "" });

    if (
      !cleanedData.firstName ||
      !cleanedData.lastName ||
      !cleanedData.jobTitle ||
      !cleanedData.companyName ||
      !cleanedData.email
    ) {
      setFormMessage({ type: "error", text: "Invalid email or password." });
      return;
    }

    if (!validateEmail(cleanedData.email)) {
      setEmailErrorMessage("Invalid email or password.");
      setFormMessage({ type: "error", text: "Invalid email or password." });
      return;
    }

    if (emailChanged && !currentPassword.trim()) {
      setPasswordErrorMessage("Invalid email or password.");
      setFormMessage({ type: "error", text: "Invalid email or password." });
      return;
    }

    const nextFullName = [cleanedData.firstName, cleanedData.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    try {
      setIsSavingProfile(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          firstName: cleanedData.firstName,
          lastName: cleanedData.lastName,
          fullName: nextFullName,
          jobTitle: cleanedData.jobTitle,
          companyName: cleanedData.companyName,
          email: cleanedData.email,
          currentPassword: emailChanged ? currentPassword.trim() : "",
        }),
      });

      const rawText = await response.text();
      let data = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(rawText || "Server did not return valid JSON.");
      }

      if (!response.ok || data.success === false) {
        setEmailErrorMessage("Invalid email or password.");
        setPasswordErrorMessage("Invalid email or password.");
        setFormMessage({ type: "error", text: "Invalid email or password." });
        return;
      }

      await fetchProfileFromBackend();

      setCurrentPassword("");
      setEmailErrorMessage("");
      setPasswordErrorMessage("");
      setFormMessage(
        emailChanged
          ? { type: "success", text: "Email updated successfully." }
          : { type: "success", text: "Profile updated successfully." }
      );
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      setFormMessage({ type: "error", text: "Invalid email or password." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveCroppedImage = async () => {
    if (isUploading) return;

    if (!selectedImage || !croppedAreaPixels || !userId) {
      alert("Please wait a moment and try again.");
      return;
    }

    try {
      setIsUploading(true);

      const croppedFile = await getCroppedImage(selectedImage, croppedAreaPixels);

      const formData = new FormData();
      formData.append("file", croppedFile);
      formData.append("userId", String(userId));

      const response = await fetch(
        `${API_BASE_URL}/api/auth/upload-profile-image`,
        {
          method: "POST",
          body: formData,
        }
      );

      const rawText = await response.text();
      let data;

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(rawText || "Server did not return valid JSON.");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Image upload failed.");
      }

      await fetchProfileFromBackend();
      handleCloseCropModal();
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error.message || "Saving image failed. Check backend and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const infoItems = [
    {
      key: "firstName",
      label: "First Name",
      icon: <FiUser />,
      value: isEditingProfile ? (
        <input
          type="text"
          className="profile-info-input"
          value={draftData.firstName}
          onChange={(e) => handleInputChange("firstName", e.target.value)}
          placeholder="Enter first name"
        />
      ) : (
        <strong className="profile-info-item__value">
          {profileData.firstName || "Not available"}
        </strong>
      ),
    },
    {
      key: "lastName",
      label: "Last Name",
      icon: <FiUser />,
      value: isEditingProfile ? (
        <input
          type="text"
          className="profile-info-input"
          value={draftData.lastName}
          onChange={(e) => handleInputChange("lastName", e.target.value)}
          placeholder="Enter last name"
        />
      ) : (
        <strong className="profile-info-item__value">
          {profileData.lastName || "Not available"}
        </strong>
      ),
    },
    {
      key: "jobTitle",
      label: "Job Title",
      icon: <FiBriefcase />,
      value: isEditingProfile ? (
        <input
          type="text"
          className="profile-info-input"
          value={draftData.jobTitle}
          onChange={(e) => handleInputChange("jobTitle", e.target.value)}
          placeholder="Enter job title"
        />
      ) : (
        <strong className="profile-info-item__value">
          {profileData.jobTitle || "Not available"}
        </strong>
      ),
    },
    {
      key: "role",
      label: "User Role",
      icon: <FiShield />,
      value: (
        <strong className="profile-info-item__value">
          {profileData.role || "Not available"}
        </strong>
      ),
    },
    {
      key: "email",
      label: "Email Address",
      icon: <FiMail />,
      value: isEditingProfile ? (
        <input
          type="email"
          className="profile-info-input"
          value={draftData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          placeholder="Enter email address"
        />
      ) : (
        <strong className="profile-info-item__value">
          {profileData.email || "Not available"}
        </strong>
      ),
    },
    {
      key: "companyName",
      label: "Company Name",
      icon: <FiBriefcase />,
      value: isEditingProfile ? (
        <input
          type="text"
          className="profile-info-input"
          value={draftData.companyName}
          onChange={(e) => handleInputChange("companyName", e.target.value)}
          placeholder="Enter company name"
        />
      ) : (
        <strong className="profile-info-item__value">
          {profileData.companyName || "Not available"}
        </strong>
      ),
    },
    ...(isEditingProfile && emailChanged
      ? [
          {
            key: "currentPassword",
            label: "Current Password",
            icon: <FiLock />,
            value: (
              <input
                type="password"
                className="profile-info-input"
                value={currentPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="Enter current password"
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <section className="profile-page">
      <div className="profile-page__title-row">
        <h2>My Profile</h2>
        <div className="profile-page__title-line"></div>
      </div>

      <div className="profile-hero-card">
        <div className="profile-hero-card__avatar-wrapper">
          <button
            type="button"
            className="profile-hero-card__avatar-button"
            onClick={openCropModalFromAvatar}
          >
            {imagePreview && imagePreview.trim() !== "" ? (
              <img
                src={imagePreview}
                alt="Profile"
                className="profile-hero-card__avatar-img"
                onError={() => setSelectedImage("")}
              />
            ) : (
              <div className="profile-hero-card__avatar-fallback">{initials}</div>
            )}
          </button>

          <button
            type="button"
            className="profile-upload-btn"
            onClick={openFilePicker}
            aria-label="Upload profile image"
          >
            <FiCamera />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleSelectImage}
          />
        </div>

        <div className="profile-hero-card__content">
          <h3>{fullName}</h3>
          <p>{profileData.jobTitle || profileData.role || "Not available"}</p>
          <span>{profileData.email || "Not available"}</span>
        </div>
      </div>

      <div className="profile-info-card" ref={profileInfoCardRef}>
        <div className="profile-info-card__header">
          <h3>Personal Information</h3>

          <div className="profile-info-card__actions">
            {isEditingProfile && (
              <button
                type="button"
                className="profile-edit-btn"
                onClick={cancelEditingProfile}
                disabled={isSavingProfile}
              >
                <FiX />
                Cancel
              </button>
            )}

            <button
              type="button"
              className={`profile-edit-btn ${isEditingProfile ? "profile-edit-btn--primary" : ""}`.trim()}
              onClick={isEditingProfile ? handleSaveProfile : handleStartEditingProfile}
              disabled={isSavingProfile || isLoadingProfile}
            >
              {isEditingProfile ? <FiCheck /> : <FiEdit2 />}
              {isSavingProfile ? "Saving..." : isEditingProfile ? "Save Changes" : "Edit"}
            </button>
          </div>
        </div>

        <div className="profile-info-card__divider"></div>

        {formMessage.text ? (
          <div
            className={`profile-form-message profile-form-message--${formMessage.type}`.trim()}
          >
            {formMessage.text}
          </div>
        ) : null}

        <div className="profile-info-grid">
          {infoItems.map((item) => (
            <div className="profile-info-item" key={item.key}>
              <span className="profile-info-item__label">
                <span className="profile-info-item__label-icon">{item.icon}</span>
                {item.label}
              </span>
              {item.value}
            </div>
          ))}
        </div>
      </div>

      {showCropModal && (
        <div className="profile-crop-modal">
          <div className="profile-crop-modal__card simple-crop-card">
            <button
              type="button"
              className="simple-close-btn"
              onClick={handleCloseCropModal}
              disabled={isUploading}
              aria-label="Close"
            >
              <FiX />
            </button>

            <h3 className="simple-crop-title">Edit Image</h3>

            <div className="profile-crop-modal__crop-area simple-crop-area">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                zoomWithScroll={true}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="simple-crop-actions">
              <button
                type="button"
                className="simple-cancel-btn"
                onClick={handleCloseCropModal}
                disabled={isUploading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="simple-save-btn"
                onClick={handleSaveCroppedImage}
                disabled={isUploading}
              >
                {isUploading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}