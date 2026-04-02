import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import adminImg from "../assets/images/admin.jpeg";
import teamLeaderImg from "../assets/images/teamLeader.jpeg";
import employeeImg from "../assets/images/employee.jpeg";
import normalImg from "../assets/images/normal.png";
import todoListImg from "../assets/images/TodoList.png";
import analyticsImg from "../assets/images/analytics.png";
import bodyImg from "../assets/images/body.png";
import body2Img from "../assets/images/body2.png";
import cloudImg from "../assets/images/cloud.png";

export default function Body() {
  const heroSlides = [
    {
      image: bodyImg,
      title: "Boost Your Team’s Productivity",
      text: "Manage tasks, track workload, and monitor your team’s progress in one easy-to-use platform.",
    },
    {
      image: body2Img,
      title: "Turn Planning Into Clear Team Execution",
      text: "Coordinate priorities, follow progress in real time, and keep every task aligned with your team goals.",
    },
  ];

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  return (
    <main className="landing-body">
      <section className="hero">
        <div className="hero__slider">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`hero__slide ${index === activeSlide ? "hero__slide--active" : ""}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>

        <div className="hero__overlay" />

        <div className="hero__content-wrap">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`hero__content ${index === activeSlide ? "hero__content--active" : ""}`}
            >
              <h1>{slide.title}</h1>
              <p>{slide.text}</p>

              <div className="hero__buttons">
                <Link to="/register" className="primary-btn">
                  Get Started
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="hero__dots">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`hero__dot ${index === activeSlide ? "hero__dot--active" : ""}`}
              onClick={() => setActiveSlide(index)}
              aria-label={`Go to hero slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      <section id="features" className="section">
        <div className="section-title">
          <h2>Key Features</h2>
        </div>

        <div className="cards three-cols">
          <div className="card feature-card">
            <div className="feature-icon-box">
              <span className="feature-icon">≡</span>
            </div>
            <h3>Task Management</h3>
            <p>Organize and prioritize tasks clearly and efficiently.</p>
          </div>

          <div className="card feature-card">
            <div className="feature-icon-box">
              <span className="feature-icon">↗</span>
            </div>
            <h3>Workload Tracking</h3>
            <p>See who is available, moderate, or overloaded each week.</p>
          </div>

          <div className="card feature-card">
            <div className="feature-icon-box">
              <span className="feature-icon">✓</span>
            </div>
            <h3>Approvals & Acknowledgements</h3>
            <p>Track changes, approvals, and confirmations with ease.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="section-title">
          <h2>How Taskora Works</h2>
        </div>

        <div className="cards three-cols">
          <div className="step-card how-card">
            <div className="step-number">1</div>
            <h3>Create Tasks</h3>
            <p>Create, assign, and manage tasks efficiently across your entire team.</p>
            <img
              src={normalImg}
              alt="Create tasks in Taskora"
              className="how-card__image"
            />
          </div>

          <div className="step-card how-card">
            <div className="step-number">2</div>
            <h3>Manage Workload</h3>
            <p>Calculate effort and task weight for fair and balanced distribution.</p>
            <img
              src={todoListImg}
              alt="Manage workload in Taskora"
              className="how-card__image"
            />
          </div>

          <div className="step-card how-card">
            <div className="step-number">3</div>
            <h3>Track Progress</h3>
            <p>Monitor updates, workload, and approvals in real time with clear visibility.</p>
            <img
              src={analyticsImg}
              alt="Track progress in Taskora"
              className="how-card__image"
            />
          </div>
        </div>
      </section>

      <section id="roles" className="section">
        <div className="section-title">
          <h2>Taskora Fits Every Role</h2>
        </div>

        <div className="cards three-cols">
          <div className="card role-card">
            <img
              src={adminImg}
              alt="Admin using Taskora"
              className="role-card__image"
            />
            <h3>Admin</h3>
            <p>Manage users, teams, and system settings.</p>
          </div>

          <div className="card role-card">
            <img
              src={teamLeaderImg}
              alt="Team leader using Taskora"
              className="role-card__image"
            />
            <h3>Team Leader</h3>
            <p>Assign tasks, monitor workload, and approve changes.</p>
          </div>

          <div className="card role-card">
            <img
              src={employeeImg}
              alt="Member using Taskora"
              className="role-card__image"
            />
            <h3>Member</h3>
            <p>View tasks, acknowledge assignments, and update status.</p>
          </div>
        </div>
      </section>

      <section
        className="cta"
        style={{
          backgroundImage: `url(${cloudImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <h2>Start Streamlining Your Workflow Today</h2>
        <p>Boost your productivity and keep your team on track with Taskora.</p>
        <Link to="/register" className="primary-btn">
          Get Started
        </Link>
      </section>
    </main>
  );
}
