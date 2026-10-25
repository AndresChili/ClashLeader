import { Skeleton } from "@/components/ui/Skeleton";

export default function AscensosLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-7 w-32" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
