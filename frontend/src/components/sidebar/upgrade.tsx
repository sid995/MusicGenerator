"use client";

import { authClient } from "~/lib/auth-client";
import { Button } from "../ui/button";

export default function Upgrade() {
  const upgrade = async () => {
    await authClient.checkout({
      products: [
        "7b38a95e-1df5-4f9d-ad48-4a7b83a6c72f",
        "8f66e764-90b3-4c84-981e-40ca072f071b",
        "52b0c17c-2c43-41b8-a178-fc2dae0253da",
      ],
    });
  };
  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-2 cursor-pointer text-orange-400"
      onClick={upgrade}
    >
      Upgrade
    </Button>
  );
}
