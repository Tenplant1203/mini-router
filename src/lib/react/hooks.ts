import { useContext } from "react";
import { RouterContext } from "./context";

export function useRouter() {
  const ctx = useContext(RouterContext);

  if (!ctx) {
    throw new Error("useRouter must be used within Native Router Provider");
  }

  return ctx.router;
}

export function useNavigationState() {
  const ctx = useContext(RouterContext);

  if (!ctx) {
    throw new Error(
      "useNavigationState must be used within Native Router Provider",
    );
  }

  return ctx.state;
}
