import { createContext } from "react";
import type { Router, RouterState } from "../router/types";

export interface RouterContextValue {
  router: Router;
  state: RouterState;
}

export const RouterContext = createContext<RouterContextValue | null>(null);
