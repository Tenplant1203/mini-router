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

  let started = false;

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

  function isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === "AbortError";
  }

  async function navigate(to: string): Promise<void> {
    const url = new URL(to, window.location.origin);
    const href = url.pathname + url.search + url.hash;

    try {
      if (useNavigationApi && window.navigation) {
        await window.navigation.navigate(href).finished;
      } else {
        window.history.pushState(null, "", href);
        await updateStateFromUrl(url);
      }
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
  }

  function start() {
    if (started) return;
    started = true;
    if (useNavigationApi && window.navigation) {
      window.navigation.addEventListener("navigate", handleNavigateEvent);
    } else {
      window.addEventListener("popstate", handlePopState);
    }
  }

  function dispose() {
    if (!started) return;
    started = false;

    if (useNavigationApi && window.navigation) {
      window.navigation.removeEventListener("navigate", handleNavigateEvent);
    } else {
      window.removeEventListener("popstate", handlePopState);
    }

    currentController?.abort();
    currentController = null;
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
    start,
    dispose,
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
