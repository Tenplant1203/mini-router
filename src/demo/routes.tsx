import type { RouteObject } from "../lib/router/types";
import { Homepage } from "./pages/Homepage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { SearchPage } from "./pages/SearchPage";

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
    loader: async ({ params }) => {
      const id = params.id;
      if (!id) {
        throw new Error("Missing item id");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        id: params.id,
        title: `Item ${params.id}`,
        description: `This is item ${params.id}`,
      };
    },
  },
  {
    id: "search",
    path: "/search",
    component: SearchPage,
  },
] satisfies RouteObject[];
