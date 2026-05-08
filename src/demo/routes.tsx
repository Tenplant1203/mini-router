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
  },
  {
    id: "search",
    path: "/search",
    component: SearchPage,
  },
];
