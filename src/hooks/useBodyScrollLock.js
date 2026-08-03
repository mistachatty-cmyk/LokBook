import { useEffect } from "react";

// Bottom-sheet / dialog modals live in a `fixed inset-0` overlay stacked on
// top of the page. Without this, a touch/wheel scroll that starts on the
// modal (or spills past its own scroll container) falls through to the page
// underneath instead of scrolling the modal's content.
export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const { style } = document.body;
    const prevOverflow = style.overflow;
    const prevPosition = style.position;
    const prevTop = style.top;
    const prevWidth = style.width;
    const scrollY = window.scrollY;
    style.overflow = "hidden";
    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";
    return () => {
      style.overflow = prevOverflow;
      style.position = prevPosition;
      style.top = prevTop;
      style.width = prevWidth;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
