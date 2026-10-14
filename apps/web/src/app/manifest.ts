import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClashLeader",
    short_name: "ClashLeader",
    description: "Panel para líderes de clanes de Clash of Clans: estadísticas, expulsiones y ascensos.",
    start_url: "/panel",
    display: "standalone",
    background_color: "#0e1318",
    theme_color: "#0e1318",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
