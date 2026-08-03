import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SpecWise",
    short_name: "SpecWise",
    description:
      "Find the right laptop without learning every spec. Answer a few simple questions and get personalized recommendations.",
    start_url: "/",
    display: "standalone",
    // Light-mode tokens from src/app/globals.css :root.
    background_color: "#fafaf9",
    theme_color: "#a16207",
    // Only real icon asset on the site: the favicon served from src/app/favicon.ico.
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}
