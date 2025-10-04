import { Component, inject, OnInit } from "@angular/core";
import { NgIf } from "@angular/common";
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonButton, IonIcon, IonNote } from "@ionic/angular/standalone";
import { Router, ActivatedRoute } from "@angular/router";
import { DomSanitizer, SafeResourceUrl, SafeHtml } from "@angular/platform-browser";
import { isPlatform } from "@ionic/angular";
import { Browser } from "@capacitor/browser"; // Capacitor Browser (funziona anche sul web)
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
export class PlateformPage implements OnInit {
  isBrowser = false;
  private ref: any;

  private confData = inject(ConferenceService);
  speakers: Speaker[] = [];

  url = "";
  safeUrl: SafeResourceUrl | null = null;

  // NEW: gestione embed/iframe
  canIframe = false;
  embedHtml?: SafeHtml; // per oEmbed IG post

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer
  ) {}

  ionViewDidEnter() {
    this.confData.getSpeakers().subscribe(speakers => (this.speakers = speakers));
  }

  ngOnInit() {
    const encoded = this.route.snapshot.paramMap.get('id');
    this.url = decodeURIComponent(encoded || 'https://ludwigstrasse.plateform.app/');

    // Web?
    this.isBrowser = !('cordova' in (window as any));

    if (this.isBrowser) {
      if (this.isInstagramPost(this.url)) {
        // usa embed ufficiale IG per i post
        this.loadInstagramEmbed(this.url);
        this.canIframe = false;
      } else {
        // iframe solo se il dominio lo consente
        this.canIframe = this.canIframeUrl(this.url);
        if (this.canIframe) {
          this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
        }
      }
      return;
    }

    // Device (Cordova): ThemeableBrowser sempre in-app
    this.ref = cordova.ThemeableBrowser.open(this.url, "_blank", {
      toolbar: { height: 50, color: "#222222" },
      closeButton: { wwwImage: "assets/icon/close.png", align: "left", event: "closePressed" },
    });
    this.ref.addEventListener("closePressed", () => this.ref.close());
  }

  // === helper ===
  private hostOf(u: string) {
    try { return new URL(u).host.toLowerCase(); } catch { return ""; }
  }

  private isInstagram(u: string) {
    const h = this.hostOf(u);
    return h.endsWith("instagram.com");
  }

  private isInstagramPost(u: string) {
    if (!this.isInstagram(u)) return false;
    try {
      const p = new URL(u).pathname;
      return /^\/(p|reel|tv)\//.test(p);
    } catch { return false; }
  }

  private canIframeUrl(u: string) {
    // Blocca domini noti che inviano X-Frame-Options/CSP
    const blocked = new Set([
      "instagram.com","www.instagram.com",
      "facebook.com","www.facebook.com",
      "x.com","twitter.com","www.twitter.com"
    ]);
    const h = this.hostOf(u);
    return !!h && !blocked.has(h);
  }

  private loadInstagramEmbed(postUrl: string) {
    // Costruisce il markup che lo script IG trasforma in embed
    const html =
      `<blockquote class="instagram-media" data-instgrm-permalink="${postUrl}" data-instgrm-version="14"></blockquote>`;
    this.embedHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    // trigger processing
    setTimeout(() => (window as any).instgrm?.Embeds?.process?.(), 0);
  }

  async openExternal(url: string) {
    // In-app su device; su web apre nuova scheda (rimani comunque nella tua PWA)
    if (isPlatform('capacitor')) {
      await Browser.open({ url, presentationStyle: 'fullscreen' });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  goBack() {
    if (this.ref) this.ref.close();
    this.router.navigate(["/app/tabs/speakers"]);
  }
}
