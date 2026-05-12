import type {
  Params,
  RouteData,
  RouteMatch,
  RouteObject,
  Router,
  RouterInit,
  RouterState,
  RouterSubscriber,
} from "./types";

export function createRouter(init: RouterInit): Router {
  let state: RouterState = {
    location: new URL(window.location.href),
    matches: matchRoutes(init.routes, window.location.pathname),
    data: {},
    error: null,
    status: "idle",
  };

  const subscribers = new Set<RouterSubscriber>();
  const routes = init.routes;
  const basename = init.basename ?? "/";

  function setState(nextState: RouterState) {
    state = nextState;

    for (const subscriber of subscribers) {
      subscriber(state);
    }
  }

  function subscribe(fn: RouterSubscriber) {
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }

  async function updateStateFromUrl(url: URL) {
    const matches = matchRoutes(routes, url.pathname);

    setState({
      location: url,
      matches,
      data: {},
      error: null,
      status: "loading",
    });

    const { data, error } = await runLoaders(matches, url);

    setState({
      location: url,
      matches,
      data: data,
      error,
      status: error ? "error" : "idle",
    });
  }

  async function handlePopState() {
    void updateStateFromUrl(new URL(window.location.href));
  }

  async function navigate(to: string): Promise<void> {
    const url = new URL(to, window.location.origin);
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    await updateStateFromUrl(url);
  }

  window.addEventListener("popstate", handlePopState);

  return {
    get basename() {
      return basename;
    },
    get state() {
      return state;
    },
    get routes() {
      return routes;
    },
    subscribe,
    navigate,
  };
}

export function splitPath(path: string) {
  return path.split("/").filter(Boolean);
}

export function matchPath(pattern: string, pathname: string): Params | null {
  const patternParts = splitPath(pattern);
  const pathnameParts = splitPath(pathname);

  if (patternParts.length !== pathnameParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathnamePart = pathnameParts[i];

    if (patternPart.startsWith(":")) {
      const paramName = patternPart.slice(1);
      params[paramName] = decodeURIComponent(pathnamePart);
      continue;
    }

    if (patternPart !== pathnamePart) {
      return null;
    }
  }

  return params;
}

export function matchRoutes(
  routes: RouteObject[],
  pathname: string,
): RouteMatch[] {
  for (const route of routes) {
    const params = matchPath(route.path, pathname);
    if (params !== null) {
      return [
        {
          params,
          pathname,
          pathnameBase: pathname,
          route,
        },
      ];
    }
  }

  return [];
}

async function runLoaders(
  matches: RouteMatch[],
  url: URL,
): Promise<{
  data: RouteData;
  error: RouteData | null;
}> {
  const data: RouteData = {};
  const error: RouteData = {};

  for (const match of matches) {
    const loader = match.route.loader;
    if (!loader) continue;

    try {
      data[match.route.id] = await loader({
        params: match.params,
        request: new Request(url),
        signal: new AbortController().signal, // TODO: abort issue
      });
    } catch (e) {
      error[match.route.id] = e;
    }
  }
  return {
    data,
    error: Object.keys(error).length > 0 ? error : null,
  };
}
