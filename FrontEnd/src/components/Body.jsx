import adminImg from "../assets/images/admin.jpeg";
import teamLeaderImg from "../assets/images/teamLeader.jpeg";
import employeeImg from "../assets/images/employee.jpeg";
import normalImg from "../assets/images/normal.png";
import todoListImg from "../assets/images/TodoList.png";
import analyticsImg from "../assets/images/analytics.png";

export default function Body() {
    return (
        <main className="landing-body">
            <section className="hero">
                <div className="hero__content">
                    <h1>Boost Your Team’s Productivity</h1>
                    <p>
                        Manage tasks, track workload, and monitor your team’s progress
                        in one easy-to-use platform.
                    </p>

                    <div className="hero__buttons">
                        <button className="primary-btn">Get Started</button>
                    </div>
                </div>

                <div className="hero__visual">
                    <div className="mockup-card">
                        <div className="mockup-card__header">Taskora Dashboard</div>
                        <div className="mockup-grid">
                            <div className="mockup-box">To Do</div>
                            <div className="mockup-box">In Progress</div>
                            <div className="mockup-box">Completed</div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="features" className="section">
                <div className="section-title">
                    <h2>Key Features</h2>
                </div>
                <div className="cards three-cols">
                    <div className="card">
                        <h3>Task Management</h3>
                        <p>Organize and prioritize tasks clearly and efficiently.</p>
                    </div>

                    <div className="card">
                        <h3>Workload Tracking</h3>
                        <p>See who is available, moderate, or overloaded each week.</p>
                    </div>

                    <div className="card">
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
                        <p>Add, assign, and organize tasks for your team.</p>
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
                        <img src={adminImg} alt="Admin using Taskora" className="role-card__image" />
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

            <section className="cta">
                <h2>Start Streamlining Your Workflow Today</h2>
                <p>Boost your productivity and keep your team on track with Taskora.</p>
                <button className="primary-btn">Get Started</button>
            </section>
        </main>
    )
}