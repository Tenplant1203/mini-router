import { useEffect, useMemo, useState } from "react";
import { createRouter } from "../router/router";
import type { RouteObject, RouterState } from "../router/types";
import { RouterContext } from "./context";

interface NativeRouterProviderProps {
  routes: RouteObject[];
  children: React.ReactNode;
}

export function NativeRouterProvider({
  routes,
  children,
}: NativeRouterProviderProps) {
  const router = useMemo(() => {
    return createRouter({
      routes,
      history: {} as never, // TODO: historyの実装
      unstable_useNavigationApi: true,
    });
  }, [routes]);

  const [state, setState] = useState<RouterState>(router.state);

  useEffect(() => {
    return router.subscribe(setState);
  }, [router]);

  return (
    <RouterContext.Provider value={{ router, state }}>
      {children}
    </RouterContext.Provider>
  );
}
