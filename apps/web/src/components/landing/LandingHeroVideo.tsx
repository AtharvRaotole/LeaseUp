import { useEffect, useRef, useState } from 'react';
import { LandingReportPreview } from './LandingReportPreview';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

/**
 * Lazy-loaded demo video with fixture poster fallback. Never calls the API.
 */
export function LandingHeroVideo() {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px', threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (!shouldLoadVideo || reducedMotion) return;
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => undefined);
  }, [shouldLoadVideo, reducedMotion]);

  const showPreview = reducedMotion || !shouldLoadVideo || !videoReady;

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl bg-bg">
      {showPreview && (
        <div className={videoReady ? 'absolute inset-0 opacity-0' : 'relative'} aria-hidden={videoReady}>
          <LandingReportPreview />
        </div>
      )}
      {!reducedMotion && shouldLoadVideo && (
        <video
          ref={videoRef}
          className={`block w-full bg-bg ${showPreview ? 'pointer-events-none absolute inset-0 h-full w-full opacity-0' : 'relative'}`}
          width={1440}
          height={900}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/demo/poster.jpg"
          onCanPlay={() => setVideoReady(true)}
        >
          <source src="/demo/demo.webm" type="video/webm" />
          <source src="/demo/demo.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}
