export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__logo">
        <div className="navbar__logo-icon">✓</div>
        <span>Taskora</span>
      </div>

      <nav className="navbar__links">
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#roles">Roles</a>
        <a href="#contact">Contact</a>
      </nav>

      <button className="primary-btn">Get Started</button>
    </header>
  )
}