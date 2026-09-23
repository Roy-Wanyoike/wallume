"use client";

import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  liked: boolean;
  likes: number;
  pending?: boolean;
  onToggle: () => void;
  variant?: "chip" | "full";
  className?: string;
};

export function LikeButton({ liked, likes, pending, onToggle, variant = "chip", className }: Props) {
  if (variant === "full") {
    return (
      <Button
        variant={liked ? "default" : "outline"}
        onClick={onToggle}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? "Unlike this wallpaper" : "Like this wallpaper"}
        className={cn(
          "h-11 w-full gap-2",
          liked && "bg-rose-500 hover:bg-rose-600 text-white",
          className,
        )}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart key={liked ? "on" : "off"} className={cn("h-4 w-4", liked && "heart-pop fill-current")} />
        )}
        {liked ? "Liked" : "Like"} · {likes.toLocaleString()}
      </Button>
    );
  }
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={pending}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this wallpaper" : "Like this wallpaper"}
      className={cn(
        "inline-flex h-8 min-w-14 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/55 disabled:opacity-60",
        liked && "border-rose-400/40 bg-rose-500/25 text-rose-200",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Heart key={liked ? "on" : "off"} className={cn("h-3.5 w-3.5", liked && "heart-pop fill-rose-400 text-rose-400")} />
      )}
      {likes.toLocaleString()}
    </button>
  );
}
