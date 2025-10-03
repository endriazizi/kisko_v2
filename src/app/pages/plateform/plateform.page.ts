import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common'; // 👈 serve per usare *ngIf
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
} from '@ionic/angular/standalone';

declare var cordova: any;

@Component({
  selector: 'app-plateform',
  templateUrl: './plateform.page.html',
  styleUrls: ['./plateform.page.scss'],
  standalone: true,
  imports: [NgIf, IonContent, IonHeader, IonToolbar, IonTitle], // 👈 aggiunto NgIf
})
export class PlateformPage implements OnInit {
  isBrowser = false;

  ngOnInit() {
    // 🔹 Se non sei in un’app Cordova/Capacitor (es: ionic serve), usa iframe
    if (!(window as any).cordova) {
      this.isBrowser = true;
      return;
    }

    // 🔹 Se sei in app mobile, apri ThemeableBrowser
    const ref = cordova.ThemeableBrowser.open(
      'https://ludwigstrasse.plateform.app/',
      '_blank',
      {
        toolbar: {
          height: 50,
          color: '#222222',
        },
        closeButton: {
          wwwImage: 'assets/icon/close.png',
          align: 'left',
          event: 'closePressed',
        },
      }
    );

    ref.addEventListener('closePressed', () => {
      ref.close();
    });
  }
}
