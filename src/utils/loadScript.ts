/**
 * Dynamically load a third-party script exactly once.
 * Subsequent calls with the same src resolve immediately.
 */
const cache = new Map<string, Promise<void>>();

export function loadScript(src: string, attrs: Record<string, string> = {}): Promise<void> {
  if (cache.has(src)) return cache.get(src)!;

  const p = new Promise<void>((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(el);
  });

  cache.set(src, p);
  return p;
}

const YMAPS_KEY = '6996458c-4508-4816-b92d-585a001ed42a';

export const loadYandexMaps = () =>
  loadScript(`https://api-maps.yandex.ru/2.1/?apikey=${YMAPS_KEY}&lang=ru_RU`);

export const loadCloudPayments = () =>
  loadScript('https://widget.cloudpayments.ru/bundles/cloudpayments');
