import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { adminFetch } from "../../api/adminApi";

const TYPES = ["stock", "commodity", "crypto", "forex"];

function typeBadgeClass(type) {
  return `type-badge type-${type}`;
}

export default function AssetsTab({ onChanged }) {
  const { token } = useAuth();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "stock",
    startingPrice: "100",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    type: "stock",
    current_price: "",
  });

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/api/admin/assets", token);
      setAssets(data.assets || []);
    } catch (e) {
      setError(e.message || "Failed to load assets");
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
      await adminFetch("/api/admin/assets", token, {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          startingPrice: Number(form.startingPrice),
        }),
      });
      setShowAdd(false);
      setForm({ name: "", type: "stock", startingPrice: "100" });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || "Create failed");
    }
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      type: a.type,
      current_price: String(a.current_price),
    });
  };

  const saveEdit = async (id) => {
    setError("");
    try {
      await adminFetch(`/api/admin/assets/${id}`, token, {
        method: "PUT",
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          current_price: Number(editForm.current_price),
        }),
      });
      setEditingId(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || "Update failed");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this asset?")) return;
    setError("");
    try {
      await adminFetch(`/api/admin/assets/${id}`, token, { method: "DELETE" });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
  };

  return (
    <section className="admin-tab">
      <div className="tab-toolbar">
        <h3>Assets</h3>
        <button type="button" onClick={() => setShowAdd(true)}>
          Add asset
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading assets…</p> : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Price</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {assets.map((a) =>
              editingId === a.id ? (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, type: e.target.value }))
                      }
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.0001"
                      value={editForm.current_price}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, current_price: e.target.value }))
                      }
                    />
                  </td>
                  <td className="cell-actions">
                    <button type="button" onClick={() => saveEdit(a.id)}>
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={a.id}>
                  <td>{a.id}</td>
                  <td>{a.name}</td>
                  <td>
                    <span className={typeBadgeClass(a.type)}>{a.type}</span>
                  </td>
                  <td>{a.current_price}</td>
                  <td className="cell-actions">
                    <button type="button" onClick={() => startEdit(a)}>
                      Edit
                    </button>
                    <button type="button" className="btn-danger" onClick={() => remove(a.id)}>
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
            <h4>Add asset</h4>
            <form onSubmit={handleCreate} className="form">
              <label>
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Starting price
                <input
                  type="number"
                  step="0.0001"
                  value={form.startingPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startingPrice: e.target.value }))
                  }
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
    </section>
  );
}
