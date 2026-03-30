import { useAuth } from "../auth/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="container">
      <h1>Team Dashboard</h1>
      <p>Welcome, {user?.teamName}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
