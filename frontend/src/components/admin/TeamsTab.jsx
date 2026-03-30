import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { adminFetch } from "../../api/adminApi";

export default function TeamsTab({ onChanged }) {
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    teamName: "",
    password: "",
    startingCash: "100000",
  });
  const [bulkJson, setBulkJson] = useState(
    '[\n  { "teamName": "Team A", "password": "pass", "startingCash": 100000 }\n]'
  );
  const [editForm, setEditForm] = useState({
    team_name: "",
    password: "",
    cash_balance: "",
  });

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/api/admin/teams", token);
      setTeams(data.teams || []);
    } catch (e) {
      setError(e.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await adminFetch("/api/admin/teams", token, {
        method: "POST",
        body: JSON.stringify({
          teamName: form.teamName,
          password: form.password,
          startingCash: Number(form.startingCash),
        }),
      });
      setShowAdd(false);
      setForm({ teamName: "", password: "", startingCash: "100000" });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || "Create failed");
    }
  };

  const handleBulk = async () => {
    setError("");
    let parsed;
    try {
      parsed = JSON.parse(bulkJson);
    } catch {
      setError("Bulk JSON is invalid");
      return;
    }
    if (!Array.isArray(parsed)) {
      setError("Bulk payload must be a JSON array");
      return;
    }
    try {
      await adminFetch("/api/admin/teams/bulk", token, {
        method: "POST",
        body: JSON.stringify({ teams: parsed }),
      });
      setShowBulk(false);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || "Bulk create failed");
    }
  };

  const startEdit = (team) => {
    setEditingId(team.id);
    setEditForm({
      team_name: team.team_name,
      password: "",
      cash_balance: String(team.cash_balance),
    });
  };

  const saveEdit = async (id) => {
    setError("");
    const body = { team_name: editForm.team_name, cash_balance: Number(editForm.cash_balance) };
    if (editForm.password) {
      body.password = editForm.password;
    }
    try {
      await adminFetch(`/api/admin/teams/${id}`, token, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setEditingId(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || "Update failed");
    }
  };

  const removeTeam = async (id) => {
    if (!window.confirm("Delete this team?")) return;
    setError("");
    try {
      await adminFetch(`/api/admin/teams/${id}`, token, { method: "DELETE" });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <section className="admin-tab">
      <div className="tab-toolbar">
        <h3>Teams</h3>
        <div className="toolbar-actions">
          <button type="button" onClick={() => setShowAdd(true)}>
            Add team
          </button>
          <button type="button" onClick={() => setShowBulk(true)}>
            Bulk create
          </button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading teams…</p> : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Cash</th>
              <th>Role</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {teams.map((t) =>
              editingId === t.id ? (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>
                    <input
                      value={editForm.team_name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, team_name: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editForm.cash_balance}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, cash_balance: e.target.value }))
                      }
                    />
                  </td>
                  <td>{t.role}</td>
                  <td className="cell-actions">
                    <input
                      type="password"
                      placeholder="New password (optional)"
                      value={editForm.password}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, password: e.target.value }))
                      }
                    />
                    <button type="button" onClick={() => saveEdit(t.id)}>
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{t.team_name}</td>
                  <td>{t.cash_balance}</td>
                  <td>{t.role}</td>
                  <td className="cell-actions">
                    <button type="button" onClick={() => startEdit(t)}>
                      Edit
                    </button>
                    <button type="button" className="btn-danger" onClick={() => removeTeam(t.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {showAdd ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal">
            <h4>Add team</h4>
            <form onSubmit={handleCreate} className="form">
              <label>
                Team name
                <input
                  value={form.teamName}
                  onChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
              </label>
              <label>
                Starting cash
                <input
                  type="number"
                  value={form.startingCash}
                  onChange={(e) => setForm((f) => ({ ...f, startingCash: e.target.value }))}
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="submit">Create</button>
                <button type="button" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showBulk ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal modal-wide">
            <h4>Bulk create (JSON array)</h4>
            <p className="muted">
              JSON array of objects: teamName, password, startingCash (positive number).
            </p>
            <textarea
              className="bulk-textarea"
              rows={12}
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
            />
            <div className="modal-actions">
              <button type="button" onClick={handleBulk}>
                Create all
              </button>
              <button type="button" onClick={() => setShowBulk(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
