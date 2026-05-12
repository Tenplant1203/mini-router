export async function runViewTransition(
  update: () => void,
): Promise<"finished" | "skipped"> {
  if (!document.startViewTransition) {
    update();
    return "skipped";
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return "skipped";
  }

  const transition = document.startViewTransition(() => {
    update();
  });

  await transition.finished;

  return "finished";
}
