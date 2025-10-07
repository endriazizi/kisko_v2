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
  selector: 'app-infiorata',
  standalone: true,
  templateUrl: './infiorata.page.html',
  styleUrls: ['./infiorata.page.scss'],
  imports: [NgIf, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon],
})
export class InfiorataPage implements OnInit {
  readonly url = 'https://infioratadicastelraimondo.it';
  readonly whitelist = [
    'https://infioratadicastelraimondo.it',
    'https://www.infioratadicastelraimondo.it',
    'http://localhost:8100'
  ];

  isBrowser = false;
  safeUrl: SafeResourceUrl | null = null;
  private ref: any;

  constructor(private router: Router, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    if (!(window as any).cordova) {
      this.isBrowser = true;
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url);
      return;
    }

    try {
      this.ref = cordova?.ThemeableBrowser?.open(this.url, '_blank', {
        toolbar: { height: 50, color: '#222222' },
        closeButton: {
          wwwImage: 'assets/icon/close.png',
          align: 'left',
          event: 'closePressed',
        },
      });

      // chiudi con bottone
      this.ref?.addEventListener?.('closePressed', () => this.ref?.close?.());

      // blocca link esterni
      this.ref?.addEventListener?.('loadstart', (event: any) => {
        const url = event.url;
        const allowed = this.whitelist.some(domain => url.startsWith(domain));
        if (!allowed) {
          console.warn('Blocked external URL:', url);
          this.ref.stop();
          this.ref.executeScript({ code: "alert('Navigazione non consentita');" });
        }
      });
    } catch (e) {
      window.open(this.url, '_system');
    }
  }

  goBack() {
    this.ref?.close?.();
    this.router.navigate(['/app/tabs/speakers']);
  }
}
