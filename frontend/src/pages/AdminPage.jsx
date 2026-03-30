import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import SetupChecklist from "../components/admin/SetupChecklist";
import TeamsTab from "../components/admin/TeamsTab";
import AssetsTab from "../components/admin/AssetsTab";
import RoundsTab from "../components/admin/RoundsTab";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("teams");
  const [dataVersion, setDataVersion] = useState(0);

  const bump = () => setDataVersion((v) => v + 1);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <h2>Admin</h2>
          <p className="admin-user">{user?.teamName}</p>
        </div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={tab === "teams" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("teams")}
          >
            Teams
          </button>
          <button
            type="button"
            className={tab === "assets" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("assets")}
          >
            Assets
          </button>
          <button
            type="button"
            className={tab === "rounds" ? "nav-item active" : "nav-item"}
            onClick={() => setTab("rounds")}
          >
            Rounds
          </button>
        </nav>
        <button type="button" className="logout-btn" onClick={logout}>
          Logout
        </button>
      </aside>
      <main className="admin-main">
        <SetupChecklist version={dataVersion} />
        {tab === "teams" ? <TeamsTab onChanged={bump} /> : null}
        {tab === "assets" ? <AssetsTab onChanged={bump} /> : null}
        {tab === "rounds" ? <RoundsTab onChanged={bump} /> : null}
      </main>
    </div>
  );
}
