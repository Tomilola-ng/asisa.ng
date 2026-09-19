import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setLevelImage } from "@/lib/api";
import { useLevelImages } from "@/lib/use-level-images";
import { LEVELS } from "@/lib/data";
import type { Level } from "@/lib/types";
import { PencilSquare, Plus } from "react-bootstrap-icons";

/**
 * One image per level, reused across every course at that level, instead of
 * uploading a separate thumbnail for each course.
 */
export function LevelImagesManager() {
  const queryClient = useQueryClient();
  const { byLevel } = useLevelImages();
  const [uploadingLevel, setUploadingLevel] = useState<Level | null>(null);
  const inputRefs = useRef<Partial<Record<Level, HTMLInputElement | null>>>({});

  const mutation = useMutation({
    mutationFn: ({ level, file }: { level: Level; file: File }) => setLevelImage(level, file),
    onMutate: ({ level }) => setUploadingLevel(level),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["level-images"] });
      toast.success("Level image updated");
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: () => setUploadingLevel(null),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Level images</CardTitle>
        <p className="text-sm text-muted-foreground">
          One picture per level, used automatically for every course at that level.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {LEVELS.map((level) => {
          const imageUrl = byLevel.get(level);
          return (
            <div key={level} className="space-y-2">
              <input
                ref={(el) => {
                  inputRefs.current[level] = el;
                }}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) mutation.mutate({ level, file });
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="group relative block w-full overflow-hidden rounded-xl border border-border bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => inputRefs.current[level]?.click()}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`${level} level`}
                    className="aspect-video w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Plus size={18} />
                    <span>Add image</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
                  {imageUrl ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 shadow transition-opacity group-hover:opacity-100">
                      <PencilSquare size={14} />
                    </span>
                  ) : null}
                </div>
                {uploadingLevel === level && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs">
                    Uploading…
                  </div>
                )}
              </button>
              <div className="text-center text-xs font-medium text-muted-foreground">
                {level} Level
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
