import { routes } from "./routes";
import { NativeRouterProvider } from "../lib/react/NativeRouterProvider";
import { Outlet } from "../lib/react/Outlet";

export function App() {
  return (
    <NativeRouterProvider routes={routes}>
      <h1>Browser Native Router Demo</h1>
      <Outlet />
    </NativeRouterProvider>
  );
}
