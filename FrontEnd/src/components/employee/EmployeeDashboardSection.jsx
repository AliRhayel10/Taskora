export default function EmployeeDashboardSection({ user, searchValue }) {
  return (
    <div className="employee-dashboard-section">
      <div className="employee-dashboard-section__grid">
        <div className="employee-dashboard-section__card">
          <h3>Welcome</h3>
          <p>
            Hello {user?.fullName || "Employee"}, this is your employee dashboard.
          </p>
        </div>

        <div className="employee-dashboard-section__card">
          <h3>Search</h3>
          <p>Current search: {searchValue || "No search value"}</p>
        </div>

        <div className="employee-dashboard-section__card">
          <h3>Quick Summary</h3>
          <p>Your assigned task stats and updates can go here next.</p>
        </div>
      </div>
    </div>
  );
}