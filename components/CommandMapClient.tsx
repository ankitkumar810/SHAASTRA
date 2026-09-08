"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { ShelterMap as ShelterMapType } from "./ShelterMap";

type ShelterMapProps = ComponentProps<typeof ShelterMapType>;

const ShelterMapClient = dynamic(
  () => import("@/components/ShelterMap").then((m) => m.ShelterMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "520px",
          background: "#E7F4F2",
          borderRadius: "12px",
          display: "grid",
          placeItems: "center",
          color: "#087D7A",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        Loading Command Map…
      </div>
    ),
  }
);

export function CommandMapClient(props: ShelterMapProps) {
  return <ShelterMapClient {...props} />;
}
