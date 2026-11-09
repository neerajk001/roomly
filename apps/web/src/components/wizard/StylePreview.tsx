"use client";

import { stylePreviewTile, type StyleDefinition } from "@roomdesigner/shared";
import { useState } from "react";

export function StylePreview({ style, roomType }: { style: StyleDefinition; roomType: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const tile = stylePreviewTile(roomType);
  const label = `${style.label} ${roomType === "OTHER" ? "living room" : roomType.toLowerCase().replaceAll("_", " ")} reference`;
  return (
    <span className="relative block aspect-square w-full overflow-hidden bg-muted">
      {failedSource === style.thumbnail ? (
        <span className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
          Preview unavailable. See the materials and palette below.
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static nine-room atlas, cropped to the selected room
        <img
          src={style.thumbnail}
          alt={label}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(style.thumbnail)}
          className="absolute h-[300%] w-[300%] max-w-none"
          style={{ left: `${-tile.column * 100}%`, top: `${-tile.row * 100}%` }}
        />
      )}
    </span>
  );
}
