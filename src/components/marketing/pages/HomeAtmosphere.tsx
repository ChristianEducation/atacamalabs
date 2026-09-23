import { Atmosphere } from "./Atmosphere";
import { homeVideoSrc } from "@/lib/marketing/public-config";

/**
 * Visual del hero del Home (V3.3 §8). Punto único de decisión entre el
 * video atmosférico final (MP4/WebM + poster, autoplay muted loop, sin
 * controles ni audio) y el fallback en SVG/CSS (`Atmosphere`) mientras no
 * exista el archivo. No diseñar nada alrededor del SVG como solución
 * definitiva: en cuanto `homeVideoSrc()` devuelva rutas reales, este es el
 * único componente que cambia.
 */
export function HomeAtmosphere() {
  const video = homeVideoSrc();
  if (video) {
    return (
      <video
        className="mk-home-video"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={video.poster}
        aria-hidden="true"
      >
        <source src={video.webm} type="video/webm" />
        <source src={video.mp4} type="video/mp4" />
      </video>
    );
  }
  return <Atmosphere />;
}
