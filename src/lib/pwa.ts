// PWA & Service Worker Registration & Installation Helper

export interface PwaStatus {
  isSupported: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  isIOS: boolean;
}

let deferredPrompt: any = null;
const installListeners = new Set<() => void>();

export function initPwa() {
  if (typeof window === 'undefined') return;

  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative path to support both root and subpath deployments like GitHub Pages
      const swUrl = './sw.js';
      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully, scope:', reg.scope);

          // Check for updates
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] New content is available; please refresh.');
                  } else {
                    console.log('[PWA] Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Capture BeforeInstallPrompt Event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredPrompt = e;
    notifyInstallListeners();
  });

  // 3. Track App Installed Event
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] Application successfully installed on home screen');
    deferredPrompt = null;
    notifyInstallListeners();
  });
}

function notifyInstallListeners() {
  installListeners.forEach((listener) => listener());
}

export function subscribePwaInstall(callback: () => void): () => void {
  installListeners.add(callback);
  return () => {
    installListeners.delete(callback);
  };
}

export function canInstallPwa(): boolean {
  return Boolean(deferredPrompt);
}

export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] User response to install prompt: ${outcome}`);
  deferredPrompt = null;
  notifyInstallListeners();
  return outcome === 'accepted';
}

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIOS && isSafari && !isPwaInstalled();
}
