import { useState, useEffect } from "react";

/**
 * React hook to detect user's "prefers-reduced-motion" OS setting.
 * Returns true if reduced motion is preferred, else false.
 */
export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);
      const handler = (event: MediaQueryListEvent) =>
        setPrefersReducedMotion(event.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  return prefersReducedMotion;
};





