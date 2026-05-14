import { runViewTransition } from "./transition";
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
    transitionStatus: "idle",
  };

  const subscribers = new Set<RouterSubscriber>();
  const routes = init.routes;
  const basename = init.basename ?? "/";

  let currentController: AbortController | null = null;
  let currentNavigationId = 0;

  const useNavigationApi =
    init.unstable_useNavigationApi === true && "navigation" in window;

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

  function handleNavigateEvent(event: NavigateEvent) {
    console.log("[navigation-api:navigate]", {
      url: event.destination.url,
      canIntercept: event.canIntercept,
      hashChange: event.hashChange,
      downloadRequest: event.downloadRequest,
      navigationType: event.navigationType,
    });

    if (!event.canIntercept) return;
    if (event.hashChange) return;
    if (event.downloadRequest !== null) return;

    const url = new URL(event.destination.url);

    if (url.origin !== window.location.origin) return;

    event.intercept({
      async handler() {
        await updateStateFromUrl(url);
      },
    });
  }

  async function updateStateFromUrl(url: URL) {
    const navigationId = ++currentNavigationId;

    currentController?.abort();

    const controller = new AbortController();
    currentController = controller;

    const matches = matchRoutes(routes, url.pathname);

    setState({
      location: url,
      matches,
      data: {},
      error: null,
      status: "loading",
      transitionStatus: "idle",
    });

    try {
      const { data, error } = await runLoaders(matches, url, controller.signal);

      if (navigationId !== currentNavigationId) return;
      if (controller.signal.aborted) return;

      const transitionResult = await runViewTransition(() => {
        if (navigationId !== currentNavigationId) return;
        if (controller.signal.aborted) return;

        setState({
          location: url,
          matches,
          data,
          error,
          status: error ? "error" : "idle",
          transitionStatus: "running",
        });
      });

      if (navigationId !== currentNavigationId) return;
      if (controller.signal.aborted) return;

      setState({
        location: url,
        matches,
        data,
        error,
        status: error ? "error" : "idle",
        transitionStatus: transitionResult,
      });
    } catch (e) {
      if (navigationId !== currentNavigationId) {
        return;
      }
      if (controller.signal.aborted) {
        setState({
          location: url,
          matches,
          data: {},
          error: null,
          status: "aborted",
          transitionStatus: "skipped",
        });
        return;
      }

      setState({
        location: url,
        matches,
        data: {},
        error: {
          global: e,
        },
        status: "error",
        transitionStatus: "skipped",
      });
    }
  }

  async function handlePopState() {
    void updateStateFromUrl(new URL(window.location.href));
  }

  async function navigate(to: string): Promise<void> {
    const url = new URL(to, window.location.origin);
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    await updateStateFromUrl(url);
  }

  if (useNavigationApi && window.navigation) {
    window.navigation.addEventListener("navigate", handleNavigateEvent);
  } else {
    window.addEventListener("popstate", handlePopState);
  }

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
  signal: AbortSignal,
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
        signal,
      });
    } catch (e) {
      if (signal.aborted) {
        throw e;
      }
      error[match.route.id] = e;
    }
  }
  return {
    data,
    error: Object.keys(error).length > 0 ? error : null,
  };
}
