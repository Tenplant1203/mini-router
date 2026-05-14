import { routes } from "./routes";
import { NativeRouterProvider } from "../lib/react/NativeRouterProvider";
import { Outlet } from "../lib/react/Outlet";
import { Link } from "../lib/react/Link";
import { NavigationInspector } from "./components/NavigationInspector";

export function App() {
  return (
    <NativeRouterProvider routes={routes}>
      <h1>Browser Native Router Demo</h1>
      <nav style={{ display: "flex", gap: 12 }}>
        <Link to="/">Home</Link>
        <Link to="/items/1">Item 1</Link>
        <Link to="/items/2">Item 2</Link>
        <Link to="/items/3">Item 3</Link>
        <Link to="/search">Search</Link>
        <a href="/items/1">a tag navigate</a>
      </nav>

      <hr />

      <Outlet />

      <NavigationInspector />
    </NativeRouterProvider>
  );
}
