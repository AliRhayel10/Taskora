import { FiArrowLeft } from "react-icons/fi";
import "../../assets/styles/admin/team-details-page.css";

export default function TeamDetailsPage({ team, onBack }) {
  const title = team?.teamName || "Team";
  const description = team?.description || "No description available.";

  return (
    <section className="team-details-page">
      <div className="team-details-page__title-row">
        
        <button
          className="team-details-back-btn"
          onClick={onBack}
        >
          <FiArrowLeft />
        </button>

        <h2>{title}</h2>
        <div className="team-details-page__title-line"></div>
      </div>

      <p className="team-details-page__description">
        {description}
      </p>
    </section>
  );
}