'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const POLL_INTERVAL = 15000; // 15 secondes
const STORAGE_KEY = 'notifeo_last_seen';
const ORIGINAL_TITLE = 'Notifeo — Signalez, notifiez, résolvez';

// Son encodé en base64 (petit "ding" de 0.5s) — fonctionne sans AudioContext
const NOTIF_SOUND = 'data:audio/wav;base64,UklGRl9vT19teleWQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQ==';

async function playNotifSound() {
  try {
    // Méthode 1 : AudioContext (plus fiable pour générer un son)
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.value = 0.4;
    osc1.start(ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc1.stop(ctx.currentTime + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 1320;
    osc2.type = 'sine';
    gain2.gain.value = 0.3;
    osc2.start(ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Méthode 2 fallback : HTML Audio
    try {
      const audio = new Audio(NOTIF_SOUND);
      audio.volume = 0.5;
      await audio.play();
    } catch {}
  }
}

export default function NotifBadge() {
  const pathname = usePathname();
  const originalFaviconRef = useRef<string>('/icon.png');
  const badgeFaviconRef = useRef<string | null>(null);
  const prevCountRef = useRef<number>(0);
  const hasInteractedRef = useRef<boolean>(false);

  // Détecter la première interaction (requis pour jouer du son)
  useEffect(() => {
    const mark = () => { hasInteractedRef.current = true; };
    // Écouter TOUS les types d'interactions
    const events = ['click', 'keydown', 'touchstart', 'mousedown', 'scroll'];
    events.forEach((e) => window.addEventListener(e, mark, { once: true, passive: true }));
    // Si la page est déjà focus, considérer comme interagi après 2s
    const timer = setTimeout(() => { hasInteractedRef.current = true; }, 2000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark));
      clearTimeout(timer);
    };
  }, []);

  // Marquer comme lu quand on visite la page Notifs (/)
  useEffect(() => {
    if (pathname === '/') {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      // Reset le titre et favicon
      document.title = ORIGINAL_TITLE;
      setFavicon(originalFaviconRef.current);
    }
  }, [pathname]);

  // Générer le favicon avec badge rouge via Canvas
  const generateBadgeFavicon = useCallback(async (): Promise<string> => {
    if (badgeFaviconRef.current) return badgeFaviconRef.current;

    const img = new Image();
    img.src = '/icon.png';

    return new Promise((resolve) => {
      img.onload = () => {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // Dessiner l'icône originale
        ctx.drawImage(img, 0, 0, size, size);

        // Dessiner le badge rouge
        const badgeRadius = 12;
        const x = size - badgeRadius - 2;
        const y = badgeRadius + 2;
        ctx.beginPath();
        ctx.arc(x, y, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const dataUrl = canvas.toDataURL('image/png');
        badgeFaviconRef.current = dataUrl;
        resolve(dataUrl);
      };
      img.onerror = () => resolve('/icon.png');
    });
  }, []);

  // Poll pour les nouvelles notifs
  useEffect(() => {
    let active = true;

    async function check() {
      if (!active) return;
      const since = localStorage.getItem(STORAGE_KEY);
      if (!since) {
        // Premier visit, marquer maintenant
        localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        return;
      }

      try {
        const resp = await fetch(`/api/usage?since=${encodeURIComponent(since)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const count = data.newNotifs ?? 0;

        if (count > 0 && pathname !== '/') {
          // Nouvelles notifs non lues → badge rouge + titre + son
          if (count > prevCountRef.current && hasInteractedRef.current) {
            playNotifSound();
          }
          prevCountRef.current = count;
          document.title = `(${count}) Notifeo`;
          const badgeUrl = await generateBadgeFavicon();
          setFavicon(badgeUrl);
        } else {
          prevCountRef.current = 0;
          // Pas de nouvelles notifs → normal
          document.title = ORIGINAL_TITLE;
          setFavicon(originalFaviconRef.current);
        }
      } catch {}
    }

    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pathname, generateBadgeFavicon]);

  return null;
}

function setFavicon(url: string) {
  // Supprimer tous les favicons existants (y compris ceux générés par Next.js)
  document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach((el) => el.remove());

  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = url;
  document.head.appendChild(link);
}
