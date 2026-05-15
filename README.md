# Browser-Native React Router

ブラウザ標準APIでSPAルーティングを再設計する、実験的なReact Routerです。

このプロジェクトは、React Routerを置き換えるproduction-readyなライブラリではありません。  
React + Vite + TypeScriptを使って小さなRouterを自作し、Navigation APIやView Transition APIをSPA Routerにどう接続できるかを検証するための技術実験です。

## 動機

普段React RouterやNext.js Routerを使うと、LinkをクリックするだけでURLが変わり、画面が切り替わり、必要なdataも取得されます。

しかし、その内部では以下のような処理が行われています。

- URLとrouteの対応付け
- routeに対応するComponentの描画
- routeごとのdata loading
- loading / error stateの管理
- back / forwardへの対応
- 連続navigation時のabort
- 画面遷移のtransition

このプロジェクトでは、それらを小さく自作することで、Routerが何をしているのかを理解することを目的にしました。

## What is a Router?

このプロジェクトでは、Routerを単なる「URLに応じてComponentを表示する仕組み」としてだけではなく、以下をつなぐ層として扱っています。

- URL
- route
- Component
- loader data
- navigation state
- transition

つまり、RouterはURLを書き換えるだけのものではなく、navigation lifecycleを管理する仕組みです。

## Features

現在実装している主な機能は以下です。

- route matching
- dynamic route params
- Link component
- Outlet component
- NativeRouterProvider
- useRouter
- useNavigationState
- useLoaderData
- route loader
- loading / error state
- AbortControllerによるloader abort
- navigationIdによるstale result対策
- History API fallback
- Navigation API support
- View Transition API support
- basic 404 handling
- Navigation Inspector
- router.start() / router.dispose() によるglobal event listener管理

## Key Ideas

### Route Matching

URLのpathnameとroute定義を照合し、対応するComponentを描画します。

例えば, 以下のようなrouteを扱います。

```tsx
{
  id: "item",
  path: "/items/:id",
  component: ItemDetailPage,
  loader: itemLoader,
}
```

`/items/1` にアクセスすると、`/items/:id` にmatchし、`params.id` として `1` を取得できます。

### Loader

routeごとにloaderを定義し、Componentの描画に必要なdataを取得します。

```tsx
loader: async ({ params, signal }) => {
  return fetchItem(params.id, { signal });
};
```

loaderの結果は `data[route.id]` に保存され、Component側では `useLoaderData()` から取得します。

### Abort / Race Control

連続navigationが発生した場合、古いloaderの結果が新しい画面を上書きしてしまう可能性があります。

```txt
/items/1 loading中
  ↓
/items/2 へ移動
  ↓
/items/1 のloader結果が後から返る
```

この問題を避けるために、以下を使っています。

- AbortController
- navigationId
- stale result check

古いnavigationはabortし、最新のnavigationだけがRouterStateに反映されるようにしています。

### View Transition API

従来のCSS transition / animationは、同じDOM要素の変化を表現するのは得意です。

しかし、page遷移では、前のpageのComponentが画面から取り除かれ、次のpageのComponentが新しく表示されます。

そのため、前の画面から次の画面へ自然につなぐには、前のDOMを一時的に保持したり、位置やサイズを測定したり、animation用の状態を手動で管理する必要がありました。

View Transition APIでは、画面更新前後の見た目をブラウザがsnapshotとして保持し、その差分をanimationとして表現できます。

このプロジェクトでは、route変更時のComponent切り替えをView Transition APIで包むことで、画面遷移をより自然に表現しています。

```ts
const transitionResult = await runViewTransition(() => {
  setState(nextState);
});
```

また、View Transitionが重複した場合に `transition.ready` が `AbortError` でrejectされるケースがあったため、skipped transitionを想定内の状態として扱うようにしています。

### Navigation API

従来のSPA Routerでは、主に以下のような流れでnavigationを扱っていました。

```txt
Link click
  ↓
preventDefault()
  ↓
history.pushState()
  ↓
RouterState update
```

back / forward は `popstate` で別に監視する必要があります。

Navigation APIでは、ブラウザで発生したnavigationを `navigate` eventとして受け取り、必要に応じて `event.intercept()` で制御できます。

```ts
window.navigation.addEventListener("navigate", (event) => {
  if (!event.canIntercept) return;
  if (event.hashChange) return;
  if (event.downloadRequest !== null) return;

  event.intercept({
    async handler() {
      await updateStateFromUrl(new URL(event.destination.url));
    },
  });
});
```

このプロジェクトでは、Navigation APIが利用できる場合は `router.navigate()` から `window.navigation.navigate()` を使い、Navigation APIのlifecycleに処理を乗せています。

```ts
async function navigate(to: string): Promise<void> {
  const url = new URL(to, window.location.origin);
  const href = url.pathname + url.search + url.hash;

  if (useNavigationApi && window.navigation) {
    await window.navigation.navigate(href).finished;
    return;
  }

  window.history.pushState(null, "", href);
  await updateStateFromUrl(url);
}
```

Navigation API非対応環境では、History API fallbackとして `history.pushState()` を使います。

### Event Listener Lifecycle

Navigation APIの `navigate` event listenerを `createRouter()` の中で直接登録すると、Reactの再mountやVite HMRによってlistenerが重複登録されることがありました。

その結果、1回のnavigationで `handleNavigateEvent` が複数回実行され、loaderやView Transitionが二重に走る問題が発生しました。

この問題を避けるため、router objectに `start()` / `dispose()` を追加し、global event listenerの登録と解除を明示的に管理しています。

```ts
router.start();
router.dispose();
```

React側では、`NativeRouterProvider` のeffect内でstart / disposeします。

```tsx
useEffect(() => {
  router.start();

  const unsubscribe = router.subscribe(setState);

  return () => {
    unsubscribe();
    router.dispose();
  };
}, [router]);
```

## Architecture

```txt
Browser APIs
  - History API
  - Navigation API
  - View Transition API

Router Core
  - route matching
  - loader execution
  - abort handling
  - navigation state
  - transition state

React Binding
  - NativeRouterProvider
  - Link
  - Outlet
  - hooks

Demo
  - pages
  - loading / error UI
  - Navigation Inspector
```

## Navigation Lifecycle

このRouterでは、navigationを以下のような流れとして扱っています。

```txt
URL
 ↓
Route Matching
 ↓
Loader
 ↓
Abort stale navigation
 ↓
View Transition APIで画面更新を包む
 ↓
Component切り替え
```

より正確には、View Transition APIはComponentを直接描画するものではありません。
route変更によって前のComponentから次のComponentへ切り替わる処理を包み、その前後の見た目をブラウザがsnapshotしてanimationします。

## Demo

demoでは、以下の挙動を確認できます。

- Link clickでURLと画面が変わる
- native `<a>` でもNavigation API経由で遷移できる
- browser back / forward が動く
- `/items/:id` のloaderが動く
- loading stateが表示される
- 連続navigationで古いloaderがabortされる
- View TransitionでComponent切り替えが表現される
- Navigation InspectorでRouter内部状態を確認できる

Navigation Inspectorでは、以下のような情報を表示します。

- current URL
- matched route
- params
- navigation status
- transition status
- loader data
- error state

## Getting Started

```bash
pnpm install
pnpm dev
```

buildする場合:

```bash
pnpm build
```

## Project Structure

```txt
src/
  lib/
    router/
      createRouter.ts
      matchRoutes.ts
      transition.ts
      types.ts

    react/
      NativeRouterProvider.tsx
      Link.tsx
      Outlet.tsx
      hooks.ts
      context.ts

  demo/
    App.tsx
    routes.tsx
    pages/
    components/
```

実際のディレクトリ構造は実装の進行により変更される可能性があります。

## Difficult Parts

実装で難しかった点は、APIを呼ぶこと自体よりも、Routerとして何をどこまで責務にするかを整理することでした。

特に難しかった点は以下です。

- React Routerのrepositoryが大きく、要点を切り出すのが難しかった
- routingの概念が最初は曖昧だった
- loader / abort / error / transition がすべてnavigationに関係していた
- 古いloader結果が新しい画面を上書きしないようにする必要があった
- Reactのstate updateとView Transition APIのtimingを合わせるのが難しかった
- Navigation API supportを既存のRouter設計にどう追加するかを考える必要があった
- View Transitionが重複したときに、`transition.ready` が `AbortError` でrejectされるケースがあった
- global event listenerのcleanupをしないと、React再mountやVite HMRでlistenerが重複登録される問題があった

## What I Learned

このプロジェクトを通して、Routerを見る目が変わりました。

最初は、RouterはURLに応じてComponentを表示する仕組みだと考えていました。

しかし実際に作ってみると、RouterはURLだけでなく、data loading、loading state、error handling、abort、transitionまで扱う必要があることが分かりました。

つまりRouterは、URL・Data・UI・Transitionを一貫して扱うnavigation lifecycleの管理層に近いものだと理解しました。

また、普段使っているReact RouterやNext.js Routerが隠してくれている複雑さを、小さく自作することで実感できました。

## Limitations

このプロジェクトはproduction-readyなRouterではありません。

現時点では、以下は未対応または簡易実装です。

- nested routes
- advanced route ranking
- cache invalidation
- SSR
- route pathからの高度な型推論
- production-grade accessibility
- full cross-browser testing
- npm package化
- scroll restoration
- form submission handling
- advanced Navigation API integration

## Future Work

今後試したいことは以下です。

- Navigation Inspectorの改善
- error boundary support
- loader cache
- nested routes
- React Activityとの連携
- React Canary ViewTransitionの検証
- Speculation Rules APIとの連携
- cross-browser behaviorの検証
- scroll restoration
- route-level cache invalidation

## Summary

このプロジェクトでは、React + Vite + TypeScriptで小さなRouterを自作し、Navigation APIやView Transition APIを使ってSPA routingを再設計する実験を行いました。

Routerは単なるURL変更の仕組みではなく、URL・Data・UI・Transitionをつなぐnavigation lifecycleの管理層であることを学びました。
