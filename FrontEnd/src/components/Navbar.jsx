import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__logo">
        <BrandLogo />
      </div>

      <nav className="navbar__links">
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#roles">Roles</a>
        <a href="#contact">Contact</a>
      </nav>

      <div className="navbar__actions">
        <Link to="/login" className="switch-btn">
          Login
        </Link>
        <Link to="/register" className="switch-btn switch-btn--active">
          Get Started
        </Link>
      </div>
    </header>
  );
}