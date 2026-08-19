import React from "react";
import { CheckCircle2, Clock, Activity, Database, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status = "indexed", children, className }) {
  const s = (status || "").toLowerCase();

  if (s === "indexed" || s === "ready" || s === "complete") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5",
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <CheckCircle2 className="h-3 w-3" />
        <span>{children || "Indexed"}</span>
      </span>
    );
  }

  if (s === "processing" || s === "indexing") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400",
          className
        )}
      >
        <Activity className="h-3 w-3 animate-spin" />
        <span>{children || "Indexing..."}</span>
      </span>
    );
  }

  if (s === "pending" || s === "queued") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400",
          className
        )}
      >
        <Clock className="h-3 w-3" />
        <span>{children || "Queued"}</span>
      </span>
    );
  }

  if (s === "active") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-blue-600/30 bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300",
          className
        )}
      >
        <Database className="h-3 w-3" />
        <span>{children || "Active"}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        className
      )}
    >
      <AlertCircle className="h-3 w-3" />
      <span>{children || status}</span>
    </span>
  );
}
