import { useEffect, useState } from "react";
import { FiCheckSquare } from "react-icons/fi";
import "../../assets/styles/admin/tasks-section.css";

const API_BASE_URL = "http://localhost:5000";

function normalizeTasksResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tasks)) return data.tasks;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export default function TasksSection({ searchValue }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const companyId = storedUser?.companyId || storedUser?.CompanyId;

  useEffect(() => {
    if (!companyId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const fetchTasks = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/api/tasks/company/${companyId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error("Failed to fetch tasks");
        }

        setTasks(normalizeTasksResponse(data));
      } catch (error) {
        console.error("Error loading tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [companyId]);

  return (
    <section className="tasks-section">
      <div className="tasks-section__title-row">
        <h2>Tasks</h2>
        <div className="tasks-section__title-line"></div>
      </div>

      {loading ? (
        <div className="tasks-section__state-card">
          <div className="tasks-section__state-icon">
  <FiCheckSquare />
</div>
          <h3>Loading tasks...</h3>
          <p>Please wait while we fetch tasks.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="tasks-section__state-card">
          <div className="tasks-section__state-icon">
  <FiCheckSquare />
</div>
          <h3>No tasks yet</h3>
          <p>Create tasks to start tracking team workload.</p>
        </div>
      ) : (
        <div className="tasks-section__grid">
          {tasks.map((task, index) => (
            <div
              key={task?.taskId || task?.id || index}
              className="tasks-section__card"
            >
              <div className="tasks-section__card-header">
                <h4>{task?.title || "Untitled Task"}</h4>
                <span className="tasks-section__status">
                  {task?.status || "Unknown"}
                </span>
              </div>

              <p className="tasks-section__desc">
                {task?.description || "No description"}
              </p>

              <div className="tasks-section__meta">
                <span>Priority: {task?.priority || "-"}</span>
                <span>
                  Effort: {task?.estimatedEffort || task?.effortHours || 0}h
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}