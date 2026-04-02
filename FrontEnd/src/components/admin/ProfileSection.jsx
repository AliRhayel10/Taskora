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

  const derivedFullName = useMemo(() => user?.fullName || "Not available", [user]);

  const derivedNameParts = useMemo(() => {
    return derivedFullName.trim().split(" ").filter(Boolean);
  }, [derivedFullName]);

  const derivedFirstName = derivedNameParts[0] || "Not available";
  const derivedLastName =
    derivedNameParts.length > 1
      ? derivedNameParts.slice(1).join(" ")
      : "Not available";

  const [profileName, setProfileName] = useState({
    firstName: derivedFirstName === "Not available" ? "" : derivedFirstName,
    lastName: derivedLastName === "Not available" ? "" : derivedLastName,
  });
  const [draftName, setDraftName] = useState(profileName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    const nextName = {
      firstName: derivedFirstName === "Not available" ? "" : derivedFirstName,
      lastName: derivedLastName === "Not available" ? "" : derivedLastName,
    };

    setProfileName(nextName);
    setDraftName(nextName);
  }, [derivedFirstName, derivedLastName]);

  const fullName =
    [profileName.firstName, profileName.lastName].filter(Boolean).join(" ").trim() ||
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

  const handleStartEditingName = () => {
    setDraftName(profileName);
    setIsEditingName(true);
  };

  const handleNameInputChange = (field, value) => {
    setDraftName((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveName = async () => {
    if (!user?.userId || isSavingName) return;

    const cleanedName = {
      firstName: draftName.firstName.trim(),
      lastName: draftName.lastName.trim(),
    };

    if (!cleanedName.firstName || !cleanedName.lastName) {
      alert("Please enter both first and last name.");
      return;
    }

    const nextFullName = [cleanedName.firstName, cleanedName.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    try {
      setIsSavingName(true);

      const response = await fetch("http://localhost:5000/api/auth/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
          firstName: cleanedName.firstName,
          lastName: cleanedName.lastName,
          fullName: nextFullName,
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

      setProfileName(cleanedName);
      setDraftName(cleanedName);
      setIsEditingName(false);
    } catch (error) {
      console.error("Error saving profile name:", error);
      alert(error.message || "Saving name failed. Check backend and try again.");
    } finally {
      setIsSavingName(false);
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
      value: isEditingName ? (
        <input
          type="text"
          className="profile-info-input"
          value={draftName.firstName}
          onChange={(e) => handleNameInputChange("firstName", e.target.value)}
          placeholder="Enter first name"
        />
      ) : (
        <strong className="profile-info-item__value">
          {profileName.firstName || "Not available"}
        </strong>
      ),
    },
    {
      key: "lastName",
      label: "Last Name",
      icon: <FiUser />,
      value: isEditingName ? (
        <input
          type="text"
          className="profile-info-input"
          value={draftName.lastName}
          onChange={(e) => handleNameInputChange("lastName", e.target.value)}
          placeholder="Enter last name"
        />
      ) : (
        <strong className="profile-info-item__value">
          {profileName.lastName || "Not available"}
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
      value: (
        <strong className="profile-info-item__value">
          {user?.companyName || "Not available"}
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
          <p>{user?.role || "Not available"}</p>
          <span>{user?.email || "Not available"}</span>
        </div>
      </div>

      <div className="profile-info-card">
        <div className="profile-info-card__header">
          <h3>Personal Information</h3>

          <button
            type="button"
            className={`profile-edit-btn ${isEditingName ? "profile-edit-btn--primary" : ""}`.trim()}
            onClick={isEditingName ? handleSaveName : handleStartEditingName}
            disabled={isSavingName}
          >
            {isEditingName ? <FiCheck /> : <FiEdit2 />}
            {isSavingName ? "Saving..." : isEditingName ? "Save" : "Edit"}
          </button>
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