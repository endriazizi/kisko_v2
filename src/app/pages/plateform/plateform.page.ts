import { Component, inject, OnInit, AfterViewInit, Renderer2 } from '@angular/core';
import { NgIf } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonButton, IonIcon, IonNote
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { isPlatform, ToastController } from '@ionic/angular';
import { Browser } from '@capacitor/browser';

@Component({
  selector: 'app-plateform',
  templateUrl: './plateform.page.html',
  styleUrls: ['./plateform.page.scss'],
  standalone: true,
  imports: [IonNote, NgIf, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon],
})
export class PlateformPage implements OnInit, AfterViewInit {
  // UI/state
  isBrowser = false;
  canIframeFeed = false;
  canIframe = false;
  blockedUrl = false;

  url = '';
  safeUrl: SafeResourceUrl | null = null;

  // services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private renderer = inject(Renderer2);
  private toastCtrl = inject(ToastController);

  private DEBUG = true;

  /** Block Elfsight marketing page */
  private readonly BLOCK_RX =
    /https?:\/\/(www\.)?elfsight\.com\/instagram-feed-instashow\/?(?:\?.*)?$/i;

  /** 1) alias → URL (update freely) */
  private readonly URL_MAP: Record<string, string> = {
    'ludwig': 'https://ludwigstrasse.plateform.app/',
    'gelateria-carnevali': 'https://www.gelateriacarnevali.com/',
    // add more aliases if you need
  };

  /** 2) hostnames allowed inside an <iframe> */
  private readonly IFRAME_ALLOW_HOSTS: RegExp[] = [
    /\.?plateform\.app$/i,                   // *.plateform.app
    /^(\w+\.)?gelateriacarnevali\.com$/i,    // www.gelateriacarnevali.com / gelateriacarnevali.com
  ];

  ngOnInit(): void {
    const encoded = this.route.snapshot.paramMap.get('id') ?? '';
    this.isBrowser = !('cordova' in (window as any));
    this.log('[init] id:', encoded, 'isBrowser:', this.isBrowser);

    // A) Elfsight feed
    if (encoded === 'feed') {
      this.canIframeFeed = true;
      this.ensureElfsightPlatformLoaded().then(() => {
        this.log('[elfsight] platform.js loaded');
        setTimeout(() => (window as any).eapps?.initialize?.(), 0);
      });
      return;
    }

    // B) Alias → URL, else use the value as URL (decoded)
    const lower = encoded.toLowerCase();
    if (this.URL_MAP[lower]) {
      this.url = this.URL_MAP[lower];
      this.log('[url] from alias:', lower, '→', this.url);
    } else {
      const decoded = decodeURIComponent(encoded);
      this.url = /^https?:\/\//i.test(decoded) ? decoded : 'https://ludwigstrasse.plateform.app/';
      this.log('[url] from route or fallback:', this.url);
    }

    // C) Policy block for Elfsight marketing page
    if (this.BLOCK_RX.test(this.url)) {
      this.blockedUrl = true;
      this.log('[block] matched BLOCK_RX:', this.url);
      this.toast('Navigation blocked by kiosk policy.');
      return;
    }

    // D) Decide if the URL can live in an iframe
    this.canIframe = this.isIframeAllowed(this.url);
    this.log('[iframe] allowed?', this.canIframe, 'for', this.url);

    if (this.canIframe) {
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
    }

    // E) Intercept clicks to avoid navigating to the Elfsight marketing page (web)
    if (this.isBrowser) {
      this.renderer.listen(document, 'click', (ev: Event) => {
        const el = ev.target as HTMLElement;
        const a = el?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!a) return;
        const href = a.href;
        if (this.BLOCK_RX.test(href)) {
          ev.preventDefault();
          ev.stopPropagation();
          this.log('[block] click →', href);
          this.toast('Navigation blocked by kiosk policy.');
        }
      });
    }
  }

  ngAfterViewInit(): void {
    if (this.canIframeFeed) {
      setTimeout(() => (window as any).eapps?.initialize?.(), 0);
    }
  }

  // -------- helpers --------
  private isIframeAllowed(url: string): boolean {
    try {
      const host = new URL(url).hostname;
      return this.IFRAME_ALLOW_HOSTS.some(rx => rx.test(host));
    } catch {
      return false;
    }
  }

  private ensureElfsightPlatformLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const already = document.querySelector('script[data-elfsight-platform]');
      if (already) { resolve(); return; }
      const s = this.renderer.createElement('script');
      s.src = 'https://elfsightcdn.com/platform.js';
      s.async = true;
      s.defer = true;
      s.setAttribute('data-elfsight-platform', '1');
      s.onload = () => resolve();
      s.onerror = () => { this.log('[elfsight] failed to load platform.js'); resolve(); };
      this.renderer.appendChild(document.body, s);
    });
  }

  async openExternal(url: string) {
    if (this.BLOCK_RX.test(url)) {
      this.log('[block] openExternal:', url);
      await this.toast('Navigation blocked by kiosk policy.');
      return;
    }
    if (isPlatform('capacitor')) {
      await Browser.open({ url, presentationStyle: 'fullscreen' });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  goBack() { this.router.navigate(['/app/tabs/speakers']); }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 1500, color: 'medium' });
    await t.present();
  }
  private log(...a: any[]) { if (this.DEBUG) console.debug('[Plateform]', ...a); }
}
