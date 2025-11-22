import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  heroHeight?: number;
};

const StickySearchBar = ({ children, heroHeight = 400 }: Props) => {
  const [isSticky, setIsSticky] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Become sticky after scrolling past hero
      setIsSticky(scrollY > heroHeight);

      // Compress further after scrolling more
      setIsCompact(scrollY > heroHeight + 100);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, [heroHeight]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "transition-all duration-300 z-20",
        isSticky
          ? "fixed top-16 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border shadow-sm"
          : "relative"
      )}
    >
      <div
        className={cn(
          "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-300",
          isCompact ? "py-2" : "py-4"
        )}
      >
        <div
          className={cn(
            "transition-transform duration-300",
            isCompact ? "scale-95" : "scale-100"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default StickySearchBar;
