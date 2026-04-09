export function scrollPageToTop() {
  if (typeof window === 'undefined') {
    return;
  }

  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';

  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior });
  });
}