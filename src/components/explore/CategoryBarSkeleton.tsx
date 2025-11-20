import { Skeleton } from "@/components/ui/skeleton";

// Deterministic widths to avoid React hydration warnings
const SKELETON_WIDTHS = [95, 120, 85, 110, 100, 130, 90, 115];

const CategoryBarSkeleton = () => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 py-1 overflow-hidden">
        {SKELETON_WIDTHS.map((width, i) => (
          <Skeleton
            key={i}
            className="h-9 rounded-full"
            style={{
              width: `${width}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoryBarSkeleton;
