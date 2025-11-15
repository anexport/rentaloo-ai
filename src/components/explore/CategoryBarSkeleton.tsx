import { Skeleton } from "@/components/ui/skeleton";

const CategoryBarSkeleton = () => {
  return (
    <div className="w-full py-2">
      <div className="flex items-stretch gap-3 pb-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 px-6 py-4 rounded-2xl border border-border bg-card min-w-[120px]"
          >
            {/* Icon skeleton */}
            <Skeleton className="h-[52px] w-[52px] rounded-xl" />

            {/* Text skeleton */}
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-16 mx-auto" />
              <Skeleton className="h-3 w-12 mx-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryBarSkeleton;
