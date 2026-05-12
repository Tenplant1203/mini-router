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

export function useLoaderData<T = unknown>(routeId: string): T | undefined {
  const ctx = useContext(RouterContext);

  if (!ctx) {
    throw new Error("useLoaderData must be used within Native Router Provider");
  }

  return ctx.state.data[routeId] as T | undefined;
}
