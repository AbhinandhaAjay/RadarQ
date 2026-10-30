"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Radar from "./Radar";
import type { Signal } from "./SignalGlobe";

const SignalGlobe = dynamic(() => import("./SignalGlobe"), { ssr: false });

function canUseWebGL(): boolean {
  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** 3D globe where WebGL is available; the flat SVG radar everywhere else. */
export default function Globe({ signals, scanning = false, label }: { signals: Signal[]; scanning?: boolean; label: string }) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(canUseWebGL()), []);

  return (
    <div className="globe" role="img" aria-label={label}>
      {webgl === null ? null : webgl ? (
        <SignalGlobe signals={signals} scanning={scanning} />
      ) : (
        <Radar blips={signals} fast={scanning} label={label} />
      )}
    </div>
  );
}
