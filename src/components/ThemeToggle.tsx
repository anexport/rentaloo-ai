import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/useTheme";

interface ThemeToggleProps {
  showLabel?: boolean;
  variant?: "icon" | "button" | "menu-item";
}

const ThemeToggle = ({
  showLabel = false,
  variant = "icon",
}: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  const handleToggle = () => {
    toggleTheme();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  // Menu item variant (for use in dropdowns)
  if (variant === "menu-item") {
    return (
      <div
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="flex items-center space-x-3 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? (
          <Moon className="h-4 w-4 text-gray-500" />
        ) : (
          <Sun className="h-4 w-4 text-gray-500" />
        )}
        <span>{theme === "light" ? "Dark Mode" : "Light Mode"}</span>
      </div>
    );
  }

  // Button variant
  if (variant === "button") {
    return (
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        tabIndex={0}
      >
        {theme === "light" ? (
          <Moon className="h-5 w-5" />
        ) : (
          <Sun className="h-5 w-5" />
        )}
        {showLabel && (
          <span className="text-sm font-medium">
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </span>
        )}
      </button>
    );
  }

  // Icon variant (default)
  return (
    <button
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className="p-2 rounded-lg hover:bg-accent transition-colors"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      tabIndex={0}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      ) : (
        <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
      )}
    </button>
  );
};

export default ThemeToggle;
