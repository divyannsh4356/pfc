import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { adminFetch } from "../../api/adminApi";

const TARGET_TEAMS = 25;

export default function SetupChecklist({ version = 0 }) {
  const { token } = useAuth();
  const [state, setState] = useState({
    loading: true,
    teamCount: 0,
    assetCount: 0,
    roundsWithNews: 0,
    error: "",
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));

    (async () => {
      try {
        const [teamsRes, assetsRes, roundsRes] = await Promise.all([
          adminFetch("/api/admin/teams", token),
          adminFetch("/api/admin/assets", token),
          adminFetch("/api/admin/rounds", token),
        ]);
        if (cancelled) return;
        const roundsWithNews = (roundsRes.rounds || []).filter((r) => r.news).length;
        setState({
          loading: false,
          teamCount: (teamsRes.teams || []).length,
          assetCount: (assetsRes.assets || []).length,
          roundsWithNews,
          error: "",
        });
      } catch (e) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e.message || "Failed to load checklist",
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, version]);

  const teamsOk = state.teamCount >= TARGET_TEAMS;
  const roundsOk = state.roundsWithNews >= 6;
  const assetsOk = state.assetCount >= 1;
  const ready = teamsOk && roundsOk && assetsOk && !state.loading && !state.error;

  return (
    <section className="setup-checklist">
      <div className="setup-checklist-header">
        <h2>Pre-competition setup</h2>
        {ready ? (
          <span className="badge badge-ready">Ready to Start</span>
        ) : (
          <span className="badge badge-pending">Not ready</span>
        )}
      </div>
      {state.error ? <p className="error">{state.error}</p> : null}
      {state.loading ? <p>Checking setup…</p> : null}
      <ul className="checklist">
        <li className={teamsOk ? "ok" : "bad"}>
          {teamsOk ? "✓" : "✗"} {TARGET_TEAMS} teams created ({state.teamCount}/{TARGET_TEAMS})
        </li>
        <li className={roundsOk ? "ok" : "bad"}>
          {roundsOk ? "✓" : "✗"} All 6 rounds have news ({state.roundsWithNews}/6)
        </li>
        <li className={assetsOk ? "ok" : "bad"}>
          {assetsOk ? "✓" : "✗"} At least 1 asset ({state.assetCount})
        </li>
      </ul>
    </section>
  );
}
