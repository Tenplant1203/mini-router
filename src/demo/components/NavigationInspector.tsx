import { useNavigationState } from "../../lib/react/hooks";

export function NavigationInspector() {
  const state = useNavigationState();
  const match = state.matches[0];

  return (
    <aside
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        width: 320,
        maxHeight: "70vh",
        overflow: "auto",
        padding: 16,
        border: "1px solid #ccc",
        borderRadius: 8,
        background: "white",
        fontSize: 12,
        fontFamily: "monospace",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 14 }}>NavigationInspector</h2>

      <section>
        <strong>URL</strong>
        <pre>{state.location.pathname}</pre>
      </section>

      <section>
        <strong>Status</strong>
        <pre>{state.status}</pre>
      </section>

      <section>
        <strong>Matched Route</strong>
        <pre>{match?.route.id ?? "none"}</pre>
      </section>

      <section>
        <strong>Params</strong>
        <pre>{JSON.stringify(match?.params ?? {}, null, 2)}</pre>
      </section>

      <section>
        <strong>Data</strong>
        <pre>{JSON.stringify(state.data ?? {}, null, 2)}</pre>
      </section>

      <section>
        <strong>Error</strong>
        <pre>{JSON.stringify(state.error ?? {}, null, 2)}</pre>
      </section>
    </aside>
  );
}
