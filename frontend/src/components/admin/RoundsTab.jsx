import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { adminFetch } from "../../api/adminApi";

function statusBadge(status) {
  return `status-badge status-${status}`;
}

export default function RoundsTab({ onChanged }) {
  const { token } = useAuth();
  const [rounds, setRounds] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openRound, setOpenRound] = useState(null);
  const [timerForms, setTimerForms] = useState({});
  const [newsForms, setNewsForms] = useState({});

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const [rData, aData] = await Promise.all([
        adminFetch("/api/admin/rounds", token),
        adminFetch("/api/admin/assets", token),
      ]);
      setRounds(rData.rounds || []);
      setAssets(aData.assets || []);
    } catch (e) {
      setError(e.message || "Failed to load rounds");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const initNewsForm = (round) => {
    const impacts = (round.news?.impacts || []).map((i) => ({
      assetId: String(i.assetId),
      impactPercentage: String(i.impactPercentage),
    }));
    setNewsForms((f) => ({
      ...f,
      [round.roundNumber]: {
        headline: round.news?.headline || "",
        body: round.news?.body || "",
        impacts: impacts.length ? impacts : [{ assetId: "", impactPercentage: "0" }],
      },
    }));
  };

  const toggleRound = (round) => {
    if (openRound === round.roundNumber) {
      setOpenRound(null);
      return;
    }
    setOpenRound(round.roundNumber);
    setTimerForms((f) => ({
      ...f,
      [round.roundNumber]: String(round.timerDurationSeconds),
    }));
    initNewsForm(round);
  };

  const saveTimer = async (roundNumber) => {
    setError("");
    const seconds = Number(timerForms[roundNumber]);
    try {
      await adminFetch(`/api/admin/rounds/${roundNumber}/timer`, token, {
        method: "PUT",
        body: JSON.stringify({ timerDurationSeconds: seconds }),
      });
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message || "Timer update failed");
    }
  };

  const updateNewsForm = (roundNumber, patch) => {
    setNewsForms((f) => ({
      ...f,
      [roundNumber]: { ...f[roundNumber], ...patch },
    }));
  };

  const addImpactRow = (roundNumber) => {
    const form = newsForms[roundNumber];
    if (!form) return;
    updateNewsForm(roundNumber, {
      impacts: [...form.impacts, { assetId: "", impactPercentage: "0" }],
    });
  };

  const updateImpact = (roundNumber, index, key, value) => {
    const form = newsForms[roundNumber];
    if (!form) return;
    const next = form.impacts.map((row, i) =>
      i === index ? { ...row, [key]: value } : row
    );
    updateNewsForm(roundNumber, { impacts: next });
  };

  const removeImpactRow = (roundNumber, index) => {
    const form = newsForms[roundNumber];
    if (!form) return;
    const next = form.impacts.filter((_, i) => i !== index);
    updateNewsForm(roundNumber, {
      impacts: next.length ? next : [{ assetId: "", impactPercentage: "0" }],
    });
  };

  const saveNews = async (roundNumber) => {
    setError("");
    const form = newsForms[roundNumber];
    if (!form) {
      setError("Form not ready");
      return;
    }
    const impacts = form.impacts
      .filter((row) => row.assetId !== "")
      .map((row) => ({
        assetId: Number(row.assetId),
        impactPercentage: Number(row.impactPercentage),
      }));
    try {
      await adminFetch(`/api/admin/rounds/${roundNumber}/news`, token, {
        method: "POST",
        body: JSON.stringify({
          headline: form.headline,
          body: form.body,
          impacts,
        }),
      });
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message || "Save news failed");
    }
  };

  return (
    <section className="admin-tab">
      <div className="tab-toolbar">
        <h3>Rounds</h3>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <p>Loading rounds…</p> : null}

      <div className="accordion">
        {rounds.map((round) => (
          <div key={round.roundNumber} className="accordion-item">
            <button
              type="button"
              className="accordion-header"
              onClick={() => toggleRound(round)}
            >
              <span>
                Round {round.roundNumber}
                {round.news?.headline ? ` — ${round.news.headline}` : " — (no news yet)"}
              </span>
              <span className={statusBadge(round.status)}>{round.status}</span>
            </button>
            {openRound === round.roundNumber ? (
              <div className="accordion-body">
                <div className="round-section">
                  <h4>Timer</h4>
                  <p className="muted">Only editable while round is pending.</p>
                  <div className="inline-row">
                    <input
                      type="number"
                      value={timerForms[round.roundNumber] ?? ""}
                      onChange={(e) =>
                        setTimerForms((f) => ({
                          ...f,
                          [round.roundNumber]: e.target.value,
                        }))
                      }
                    />
                    <span>seconds</span>
                    <button type="button" onClick={() => saveTimer(round.roundNumber)}>
                      Save timer
                    </button>
                  </div>
                </div>

                <div className="round-section">
                  <h4>News & impacts</h4>
                  <p className="muted">
                    Impacts are decimals (e.g. 0.05 = +5%, -0.1 = -10%). Assets omitted have 0%
                    news impact.
                  </p>
                  {round.status !== "pending" ? (
                    <p className="error">This round is locked; news cannot be edited.</p>
                  ) : null}
                  <label className="block-label">
                    Headline
                    <input
                      value={newsForms[round.roundNumber]?.headline ?? ""}
                      onChange={(e) =>
                        updateNewsForm(round.roundNumber, { headline: e.target.value })
                      }
                    />
                  </label>
                  <label className="block-label">
                    Body
                    <textarea
                      rows={4}
                      value={newsForms[round.roundNumber]?.body ?? ""}
                      onChange={(e) =>
                        updateNewsForm(round.roundNumber, { body: e.target.value })
                      }
                    />
                  </label>

                  <div className="impacts-header">
                    <strong>Impact map</strong>
                    <button type="button" onClick={() => addImpactRow(round.roundNumber)}>
                      Add row
                    </button>
                  </div>
                  {(newsForms[round.roundNumber]?.impacts || []).map((row, idx) => (
                    <div key={idx} className="impact-row">
                      <select
                        value={row.assetId}
                        onChange={(e) =>
                          updateImpact(round.roundNumber, idx, "assetId", e.target.value)
                        }
                      >
                        <option value="">— optional —</option>
                        {assets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} (#{a.id})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="impact"
                        value={row.impactPercentage}
                        onChange={(e) =>
                          updateImpact(
                            round.roundNumber,
                            idx,
                            "impactPercentage",
                            e.target.value
                          )
                        }
                      />
                      <button
                        type="button"
                        onClick={() => removeImpactRow(round.roundNumber, idx)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {round.status === "pending" ? (
                    <button type="button" onClick={() => saveNews(round.roundNumber)}>
                      Save news
                    </button>
                  ) : null}
                </div>

                {round.news?.impacts?.length ? (
                  <div className="round-section">
                    <h4>Current impacts (read-only)</h4>
                    <ul className="impact-list">
                      {round.news.impacts.map((i) => (
                        <li key={i.assetId}>
                          {i.assetName} (#{i.assetId}): {i.impactPercentage}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
