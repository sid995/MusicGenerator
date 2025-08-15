"use client";

import { Loader2 } from "lucide-react";

export default function CustomerPortalRedirect() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-muted-foreground">
          Loading customer portal...
        </span>
      </div>
    </div>
  );
}
