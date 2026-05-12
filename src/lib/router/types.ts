export interface Router {
  get basename(): string;
  get state(): RouterState;
  get routes(): RouteObject[];

  subscribe(fn: RouterSubscriber): () => void;
  navigate(to: string): Promise<void>;
}

export interface RouterInit {
  routes: RouteObject[];
  history: History;
  basename?: string;
}

export interface RouterState {
  location: URL;
  matches: RouteMatch[];
  data: RouteData;
  error: RouteData | null;
  status: NavigationStatus;
}

export interface RouteData {
  [routeId: string]: unknown;
}

export interface RouteObject {
  id: string;
  path: string;
  component?: unknown;
  loader?: LoaderFunction;
}

export interface LoaderFunction {
  (ctx: {
    params: Params;
    request: Request;
    signal: AbortSignal;
  }): Promise<unknown>;
}

export type Params<Key extends string = string> = {
  readonly [key in Key]: string | undefined;
};

export interface RouterSubscriber {
  (state: RouterState): void;
}

export interface RouteMatch<
  ParamKey extends string = string,
  RouteObjectType extends RouteObject = RouteObject,
> {
  params: Params<ParamKey>;
  pathname: string;
  pathnameBase: string;
  route: RouteObjectType;
}

export type NavigationStatus = "idle" | "loading" | "error";
