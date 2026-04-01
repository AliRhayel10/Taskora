import { FiCheck } from "react-icons/fi";
import "./../assets/styles/brand-logo.css";

export default function BrandLogo({ subtitle = "", dark = false }) {
  return (
    <div className={`brand-logo ${dark ? "brand-logo--dark" : ""}`}>
      <div className="brand-logo__icon">
        <FiCheck />
      </div>

      <div className="brand-logo__text">
        <h2>Taskora</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}