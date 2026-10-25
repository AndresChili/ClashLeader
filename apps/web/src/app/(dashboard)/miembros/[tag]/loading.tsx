import { Skeleton } from "@/components/ui/Skeleton";

export default function FichaLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-20" />

      <div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-4 w-52" />
      </div>

      <Skeleton className="h-28" />

      <div>
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
