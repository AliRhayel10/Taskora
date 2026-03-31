export default function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    return <h1>No user logged in</h1>;
  }

  return (
    <main style={{ padding: "40px" }}>
      <h1>Welcome {user.fullName}</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </main>
  );
}