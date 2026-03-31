import { Link } from 'react-router-dom'
import adminImg from "../assets/images/admin.jpeg";
import teamLeaderImg from "../assets/images/teamLeader.jpeg";
import employeeImg from "../assets/images/employee.jpeg";
import normalImg from "../assets/images/normal.png";
import todoListImg from "../assets/images/TodoList.png";
import analyticsImg from "../assets/images/analytics.png";
import bodyImg from "../assets/images/body.png";
import cloudImg from "../assets/images/cloud.png";

export default function Body() {
  return (
    <main className="landing-body">
      <section
        className="hero"
        style={{
          backgroundImage: `url(${bodyImg})`,
        }}
      >
        <div className="hero__content">
          <h1>Boost Your Team’s Productivity</h1>
          <p>
            Manage tasks, track workload, and monitor your team’s progress in
            one easy-to-use platform.
          </p>

          <div className="hero__buttons">
            <Link to="/register" className="primary-btn">Get Started</Link>
          </div>
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
            <p>Calculate effort and weight for fair task distribution.</p>
            <img
              src={todoListImg}
              alt="Manage workload in Taskora"
              className="how-card__image"
            />
          </div>

          <div className="step-card how-card">
            <div className="step-number">3</div>
            <h3>Track Progress</h3>
            <p>Monitor updates, workload, and approvals in real time.</p>
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
        <Link to="/register" className="primary-btn">Get Started</Link>
      </section>
    </main>
  );
}