"use client";

import { Globe2, Lock, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

type BrowserChromeProps = {
  addressBar: string;
  liveViewUrl: string | null;
  frameDataUrl: string | null;
  frameStream: boolean;
  statusLabel: string;
  className?: string;
};

export function BrowserChrome({
  addressBar,
  liveViewUrl,
  frameDataUrl,
  frameStream,
  statusLabel,
  className,
}: BrowserChromeProps) {
  const showLive = Boolean(liveViewUrl) && !frameStream;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#c9d7e3] bg-[#0f1720] shadow-[0_20px_50px_rgba(15,35,55,0.18)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#1a2430] px-3 py-2">
        <div className="flex items-center gap-1.5 pr-1">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-[#0b1220] px-3 py-1.5 text-[12px] text-[#d7e3eb]">
          <Lock className="size-3.5 shrink-0 text-[#7dd3fc]" />
          <span className="truncate font-medium tracking-tight">
            {addressBar || "about:blank"}
          </span>
        </div>
        <RotateCw className="size-3.5 shrink-0 text-white/35" />
      </div>

      <div className="relative min-h-0 flex-1 bg-[#0b1220]">
        {showLive ? (
          <iframe
            title="Live browser"
            src={liveViewUrl!}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        ) : frameDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frameDataUrl}
            alt="Browser view"
            className="absolute inset-0 h-full w-full object-contain object-top bg-white"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-[#9fb3c4]">
            <Globe2 className="size-10 opacity-50" />
            <p className="max-w-sm text-sm leading-relaxed">{statusLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
