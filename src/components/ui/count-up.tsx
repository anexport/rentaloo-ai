import { useState, useEffect, useRef, useCallback } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type CountUpProps = {
  /** The number to count up to */
  end: number;
  /** Duration of the animation in milliseconds */
  duration?: number;
  /** Optional suffix to append (e.g., "+", "%") */
  suffix?: string;
  /** Optional prefix to prepend (e.g., "$") */
  prefix?: string;
  /** Decimal places to show */
  decimals?: number;
  /** Custom className for the container */
  className?: string;
  /** Separator for thousands (default: ",") */
  separator?: string;
};

/**
 * Easing function: easeOutExpo
 * Starts fast, decelerates smoothly toward the end
 */
const easeOutExpo = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

/**
 * Formats a number with thousand separators
 */
const formatNumber = (
  value: number,
  decimals: number,
  separator: string
): string => {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return decPart ? `${formatted}.${decPart}` : formatted;
};

/**
 * CountUp - Animated counter that counts from 0 to a target number.
 * Triggers when the element enters the viewport.
 * Respects prefers-reduced-motion for accessibility.
 */
const CountUp = ({
  end,
  duration = 2000,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
  separator = ",",
}: CountUpProps) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const animate = useCallback(() => {
    const startTime = performance.now();

    const tick = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const currentValue = easedProgress * end;

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [end, duration]);

  useEffect(() => {
    // If reduced motion is preferred, show final value immediately
    if (prefersReducedMotion) {
      setCount(end);
      setHasAnimated(true);
      return;
    }

    const element = elementRef.current;
    if (!element || hasAnimated) return;

    // Guard against missing IntersectionObserver (older browsers, some webviews)
    if (typeof IntersectionObserver === "undefined") {
      setHasAnimated(true);
      animate();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animate();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [animate, hasAnimated, prefersReducedMotion, end]);

  const displayValue = formatNumber(count, decimals, separator);

  return (
    <span ref={elementRef} className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

export default CountUp;

