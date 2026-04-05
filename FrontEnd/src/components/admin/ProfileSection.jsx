import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiBriefcase,
  FiCamera,
  FiCheck,
  FiEdit2,
  FiMail,
  FiShield,
  FiUser,
  FiX,
} from "react-icons/fi";
import Cropper from "react-easy-crop";
import "./../../assets/styles/admin/profile-section.css";

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

export default function ProfileSection({ user }) {
  const fileInputRef = useRef(null);
  const profileInfoCardRef = useRef(null);

  const derivedFullName = useMemo(() => user?.fullName || "Not available", [user]);

  const derivedNameParts = useMemo(() => {
    return derivedFullName.trim().split(" ").filter(Boolean);
  }, [derivedFullName]);

  const derivedFirstName = derivedNameParts[0] || "Not available";
  const derivedLastName =
    derivedNameParts.length > 1
      ? derivedNameParts.slice(1).join(" ")
      : "Not available";

  const derivedJobTitle = useMemo(() => user?.jobTitle || "", [user]);
  const derivedCompanyName = useMemo(() => user?.companyName || "", [user]);

  const [profileData, setProfileData] = useState({
    firstName: derivedFirstName === "Not available" ? "" : derivedFirstName,
    lastName: derivedLastName === "Not available" ? "" : derivedLastName,
    jobTitle: derivedJobTitle,
    companyName: derivedCompanyName,
  });

  const [draftData, setDraftData] = useState(profileData);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    const nextData = {
      firstName: derivedFirstName === "Not available" ? "" : derivedFirstName,
      lastName: derivedLastName === "Not available" ? "" : derivedLastName,
      jobTitle: derivedJobTitle,
      companyName: derivedCompanyName,
    };

    setProfileData(nextData);
    setDraftData(nextData);
  }, [derivedFirstName, derivedLastName, derivedJobTitle, derivedCompanyName]);

  const cancelEditingProfile = useCallback(() => {
    setDraftData(profileData);
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

  const fullName =
    [profileData.firstName, profileData.lastName].filter(Boolean).join(" ").trim() ||
    "Not available";

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

  const [imagePreview, setImagePreview] = useState(() => {
    if (!user?.profileImageUrl || user.profileImageUrl.trim() === "") {
      return "";
    }
    return `http://localhost:5000${user.profileImageUrl}`;
  });

  useEffect(() => {
    if (!user?.profileImageUrl || user.profileImageUrl.trim() === "") {
      setImagePreview("");
      return;
    }

    setImagePreview(`http://localhost:5000${user.profileImageUrl}`);
  }, [user?.profileImageUrl]);

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
    setDraftData(profileData);
    setIsEditingProfile(true);
  };

  const handleInputChange = (field, value) => {
    setDraftData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!user?.userId || isSavingProfile) return;

    const cleanedData = {
      firstName: draftData.firstName.trim(),
      lastName: draftData.lastName.trim(),
      jobTitle: draftData.jobTitle.trim(),
      companyName: draftData.companyName.trim(),
    };

    if (
      !cleanedData.firstName ||
      !cleanedData.lastName ||
      !cleanedData.jobTitle ||
      !cleanedData.companyName
    ) {
      alert("Please enter first name, last name, job title, and company name.");
      return;
    }

    const nextFullName = [cleanedData.firstName, cleanedData.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    try {
      setIsSavingProfile(true);

      const response = await fetch("http://localhost:5000/api/auth/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          firstName: cleanedData.firstName,
          lastName: cleanedData.lastName,
          fullName: nextFullName,
          jobTitle: cleanedData.jobTitle,
          companyName: cleanedData.companyName,
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
        throw new Error(data.message || "Failed to update profile.");
      }

      setProfileData(cleanedData);
      setDraftData(cleanedData);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(error.message || "Saving profile failed. Check backend and try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveCroppedImage = async () => {
    if (isUploading) return;

    if (!selectedImage || !croppedAreaPixels || !user?.userId) {
      alert("Please wait a moment and try again.");
      return;
    }

    try {
      setIsUploading(true);

      const croppedFile = await getCroppedImage(selectedImage, croppedAreaPixels);

      const formData = new FormData();
      formData.append("file", croppedFile);
      formData.append("userId", String(user.userId));

      const response = await fetch(
        "http://localhost:5000/api/auth/upload-profile-image",
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

      const fullImageUrl = `http://localhost:5000${data.imageUrl}`;
      setImagePreview(fullImageUrl);

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
          {user?.role || "Not available"}
        </strong>
      ),
    },
    {
      key: "email",
      label: "Email Address",
      icon: <FiMail />,
      value: (
        <strong className="profile-info-item__value">
          {user?.email || "Not available"}
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
                onError={() => setImagePreview("")}
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
          <p>{profileData.jobTitle || user?.role || "Not available"}</p>
          <span>{user?.email || "Not available"}</span>
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
              disabled={isSavingProfile}
            >
              {isEditingProfile ? <FiCheck /> : <FiEdit2 />}
              {isSavingProfile ? "Saving..." : isEditingProfile ? "Save Changes" : "Edit"}
            </button>
          </div>
        </div>

        <div className="profile-info-card__divider"></div>

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