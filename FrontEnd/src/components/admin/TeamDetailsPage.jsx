import "../../assets/styles/admin/team-details-page.css";

export default function TeamDetailsPage({ team }) {
  const title = team?.teamName || "Team";
  const description = team?.description || "No description available.";

  return (
    <section className="team-details-page">
      <div className="team-details-page__title-row">
        <h2>{title}</h2>
        <div className="team-details-page__title-line"></div>
      </div>

      <p className="team-details-page__description">
        {description}
      </p>
    </section>
  );
}