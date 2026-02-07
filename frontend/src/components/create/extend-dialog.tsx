"use client";

import type { Track } from "./track-list";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

const EXTEND_OPTIONS = [30, 60, 90] as const;

export function ExtendDialog({
  track,
  onClose,
  onExtend,
}: {
  track: Track;
  onClose: () => void;
  onExtend: (parentSongId: string, additionalSeconds: number) => Promise<void>;
}) {
  const handleExtend = async (additionalSeconds: number) => {
    await onExtend(track.id, additionalSeconds);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Extend song</DialogTitle>
          <DialogDescription>
            Generate a continuation of &quot;{track.title}&quot;. Choose how
            many extra seconds to add. This will create a new song and use
            credits.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 py-4">
          {EXTEND_OPTIONS.map((seconds) => (
            <Button
              key={seconds}
              variant="outline"
              className="cursor-pointer"
              onClick={() => handleExtend(seconds)}
            >
              +{seconds} sec
            </Button>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button" className="cursor-pointer">
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
