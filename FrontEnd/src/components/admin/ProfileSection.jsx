import { useCallback, useState, useRef } from "react";
import { FiCamera } from "react-icons/fi";
import Cropper from "react-easy-crop";
import "./../../assets/styles/admin/profile-section.css";

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
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

  const [imagePreview, setImagePreview] = useState(() => {
    if (!user?.profileImageUrl || user.profileImageUrl.trim() === "") {
      return "";
    }
    return `http://localhost:5000${user.profileImageUrl}`;
  });

  const [selectedImage, setSelectedImage] = useState("");
  const [showCropModal, setShowCropModal] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shake, setShake] = useState(false);

  const fileInputRef = useRef(null);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleAvatarClick = () => {
    if (imagePreview && imagePreview.trim() !== "") {
      setSelectedImage(imagePreview);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setShowCropModal(true);
    } else {
      fileInputRef.current?.click();
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
    if (selectedImage && selectedImage !== imagePreview) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage("");
    setShowCropModal(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleSaveCroppedImage = async () => {
    if (!selectedImage || !croppedAreaPixels || !user?.userId) return;

    try {
      setIsUploading(true);

      const croppedFile = await getCroppedImage(
        selectedImage,
        croppedAreaPixels
      );

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

      handleCloseCropModal();
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
          <div
            onClick={handleAvatarClick}
            style={{ cursor: "pointer", width: "100%", height: "100%" }}
          >
            {imagePreview && imagePreview.trim() !== "" ? (
              <img
                src={imagePreview}
                alt="Profile"
                className="profile-hero-card__avatar-img"
                onError={() => setImagePreview("")}
              />
            ) : (
              <div className="profile-hero-card__avatar-fallback">
                {initials}
              </div>
            )}
          </div>

          <label className="profile-upload-btn">
            <FiCamera />
            <input
              type="file"
              accept="image/*"
              hidden
              ref={fileInputRef}
              onChange={handleSelectImage}
            />
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

      {showCropModal && (
        <div className="profile-crop-modal" onClick={handleBackdropClick}>
          <div className={`profile-crop-modal__card simple-crop-card ${shake ? "shake-card" : ""}`}>
            <div className="profile-crop-modal__crop-area simple-crop-area">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
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