import { Component, inject, OnInit, AfterViewInit, Renderer2 } from "@angular/core";
import { NgIf } from "@angular/common";
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonButton, IonIcon, IonNote
} from "@ionic/angular/standalone";
import { Router, ActivatedRoute } from "@angular/router";
import { DomSanitizer, SafeResourceUrl, SafeHtml } from "@angular/platform-browser";
import { isPlatform, ToastController } from "@ionic/angular";
import { Browser } from "@capacitor/browser";
import { Speaker } from "../../interfaces/conference.interfaces";
import { ConferenceService } from "../../providers/conference.service";

declare var cordova: any;

@Component({
  selector: "app-plateform",
  templateUrl: "./plateform.page.html",
  styleUrls: ["./plateform.page.scss"],
  standalone: true,
  imports: [IonNote, NgIf, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon],
})
export class PlateformPage implements OnInit, AfterViewInit {
  isBrowser = false;
  private ref: any;

  private confData = inject(ConferenceService);
  private toastCtrl = inject(ToastController);                 // ← NEW
  speakers: Speaker[] = [];

  url = "";
  safeUrl: SafeResourceUrl | null = null;

  canIframe = false;
  embedHtml?: SafeHtml;
  canIframeFeed = false;

  // ⛔ EXACT URL (with or without querystring)
  private readonly BLOCK_RX = /https?:\/\/(www\.)?elfsight\.com\/instagram-feed-instashow\/?(?:\?.*)?$/i; // ← NEW
  blockedUrl = false;                                          // ← NEW

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private renderer: Renderer2
  ) {}

  ionViewDidEnter() {
    this.confData.getSpeakers().subscribe(speakers => (this.speakers = speakers));
  }

  ngOnInit() {
    const encoded = this.route.snapshot.paramMap.get('id');
    console.debug('[Plateform] route param id =', encoded);

    if (encoded === 'feed') {
      this.canIframeFeed = true;
      this.ensureElfsightPlatformLoaded().then(() => {
        console.debug('[Plateform] platform.js loaded');
        setTimeout(() => (window as any).eapps?.initialize?.(), 0);
      });
    } else {
      this.url = decodeURIComponent(encoded || 'https://ludwigstrasse.plateform.app/');
      console.debug('[Plateform] url =', this.url);

      // 🔒 BLOCK here if someone tries to route directly to the marketing page
      if (this.BLOCK_RX.test(this.url)) {                      // ← NEW
        this.blockedUrl = true;
        console.warn('[Plateform] blocked by policy:', this.url);
        this.toast('Navigation blocked by kiosk policy.');
        this.url = ''; // ensure nothing loads
      }
    }

    this.isBrowser = !('cordova' in (window as any));
    console.debug('[Plateform] isBrowser =', this.isBrowser);

    // 🔒 Intercept clicks on <a> in this page before they navigate (web/PWA)  ← NEW
    if (this.isBrowser) {
      this.renderer.listen(document, 'click', (ev: Event) => {
        const el = ev.target as HTMLElement;
        const a = el?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!a) return;
        const href = a.href;
        if (this.BLOCK_RX.test(href)) {
          ev.preventDefault();
          ev.stopPropagation();
          console.warn('[Plateform] blocked click:', href);
          this.toast('Navigation blocked by kiosk policy.');
        }
      });
    }
  }

  ngAfterViewInit() {
    if (this.canIframeFeed) {
      setTimeout(() => (window as any).eapps?.initialize?.(), 0);
    }
  }

  /** Load Elfsight platform.js once */
  private ensureElfsightPlatformLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const already = document.querySelector('script[data-elfsight-platform]');
      if (already) {
        console.debug('[Plateform] platform.js already present');
        resolve();
        return;
      }
      const s = this.renderer.createElement('script');
      s.src = 'https://elfsightcdn.com/platform.js';
      s.async = true;
      s.defer = true;
      s.setAttribute('data-elfsight-platform', '1');
      s.onload = () => resolve();
      s.onerror = () => { console.error('[Plateform] failed to load platform.js'); resolve(); };
      this.renderer.appendChild(document.body, s);
    });
  }

  // 🔒 Guarded opener (use this instead of window.open/Browser.open)       ← NEW
  async openExternal(url: string) {
    if (this.BLOCK_RX.test(url)) {
      console.warn('[Plateform] blocked openExternal:', url);
      await this.toast('Navigation blocked by kiosk policy.');
      return;
    }
    if (isPlatform('capacitor')) await Browser.open({ url, presentationStyle: 'fullscreen' });
    else window.open(url, '_blank', 'noopener');
  }

  private async toast(message: string) {                         // ← NEW
    const t = await this.toastCtrl.create({ message, duration: 1500, color: 'danger' });
    await t.present();
  }

  goBack() { if (this.ref) this.ref.close(); this.router.navigate(["/app/tabs/speakers"]); }
}
