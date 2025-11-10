import { cn } from "../lib/utils";

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md ring-1 ring-zinc-100/10 bg-zinc-100/10",
        className
      )}
      {...props}
    />
  );
}

export default Skeleton;
