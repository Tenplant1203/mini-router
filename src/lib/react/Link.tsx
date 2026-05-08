import type {
  AnchorHTMLAttributes,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { useRouter } from "./hooks";

interface LinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> {
  to: string;
  children: ReactNode;
}

export function Link({ to, children, onClick, ...props }: LinkProps) {
  const router = useRouter();

  async function handleClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented) return;

    const anchor = event.currentTarget;

    const isModifiedEvent =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey;

    const shouldUseBrowserDefault =
      event.button !== 0 ||
      isModifiedEvent ||
      anchor.target === "_blank" ||
      anchor.hasAttribute("download");

    if (shouldUseBrowserDefault) {
      return;
    }

    event.preventDefault();
    await router.navigate(to);
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
