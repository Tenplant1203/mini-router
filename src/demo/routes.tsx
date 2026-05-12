import type { RouteObject } from "../lib/router/types";
import { Homepage } from "./pages/Homepage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { SearchPage } from "./pages/SearchPage";

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);

    signal.addEventListener(
      "abort",
      () => {
        console.log("[delay:abort]");
        window.clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export const routes = [
  {
    id: "home",
    path: "/",
    component: Homepage,
  },
  {
    id: "item",
    path: "/items/:id",
    component: ItemDetailPage,
    loader: async ({ params, signal }) => {
      const id = params.id;

      if (!id) {
        throw new Error("Missing item id");
      }

      console.log(`[loader:start] item ${id}`);

      try {
        const ms = id === "1" ? 5000 : 1000;
        await delay(ms, signal);
        console.log(`[loader:success] item ${id}`);

        return {
          id: params.id,
          title: `Item ${params.id}`,
          description: `This is item ${params.id}`,
        };
      } catch (error) {
        console.log(`[loader:aborted/error] item ${id}`, error);
        throw error;
      }
    },
  },
  {
    id: "search",
    path: "/search",
    component: SearchPage,
  },
] satisfies RouteObject[];
