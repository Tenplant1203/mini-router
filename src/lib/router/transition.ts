let activeTransition: ViewTransition | null = null;

export async function runViewTransition(
  update: () => void | Promise<void>,
): Promise<"finished" | "skipped"> {
  if (!document.startViewTransition) {
    await update();
    return "skipped";
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    await update();
    return "skipped";
  }

  activeTransition?.skipTransition();

  const transition = document.startViewTransition(async () => {
    await update();
  });

  activeTransition = transition;

  const readyResult = transition.ready.then(
    () => "ready" as const,
    () => "skipped" as const,
  );

  try {
    await transition.finished;
    const result = await readyResult;
    return result === "ready" ? "finished" : "skipped";
  } catch {
    return "skipped";
  } finally {
    if (activeTransition === transition) {
      activeTransition = null;
    }
  }
}
