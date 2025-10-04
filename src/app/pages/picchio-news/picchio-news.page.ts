import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import {
  IonContent, IonHeader, IonToolbar, IonTitle,
  IonButtons, IonButton, IonIcon,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

declare var cordova: any;

@Component({
  selector: 'app-picchio-news',
  standalone: true,
  templateUrl: './picchio-news.page.html',
  styleUrls: ['./picchio-news.page.scss'],
  imports: [
    NgIf, IonContent, IonHeader, IonToolbar, IonTitle,
    IonButtons, IonButton, IonIcon,
  ],
})
export class PicchioNewsPage implements OnInit {
  readonly url = 'https://picchionews.it/';
  isBrowser = false;
  safeUrl: SafeResourceUrl | null = null;
  private ref: any;

  constructor(private router: Router, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    // Browser/PWA → iframe
    if (!(window as any).cordova) {
      this.isBrowser = true;
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
      return;
    }

    // Device → ThemeableBrowser
    try {
      this.ref = cordova?.ThemeableBrowser?.open(this.url, '_blank', {
        toolbar: { height: 50, color: '#222222' },
        closeButton: {
          wwwImage: 'assets/icon/close.png',
          align: 'left',
          event: 'closePressed',
        },
      });
      this.ref?.addEventListener?.('closePressed', () => this.ref?.close?.());
    } catch {
      // Fallback: browser di sistema
      window.open(this.url, '_system');
    }
  }

  goBack() {
    try { this.ref?.close?.(); } catch {}
    this.router.navigate(['/app/tabs/speakers']); // cambia destinazione se preferisci
  }
}
