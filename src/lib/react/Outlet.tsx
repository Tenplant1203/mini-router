import { useContext, type ComponentType } from "react";
import { RouterContext } from "./context";

export function Outlet() {
  const ctx = useContext(RouterContext);

  if (!ctx) {
    throw new Error("Outlet must be used within NativeRouterProvider");
  }

  const match = ctx.state.matches[0];

  if (!match) {
    return (
      <div>
        <h2>404 Not Found</h2>
        <p>Current path: {ctx.state.location.pathname}</p>
      </div>
    );
  }

  const Page = match.route.component as ComponentType;

  return <Page />;
}
