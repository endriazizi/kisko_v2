import { Component, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';

declare var cordova: any;

@Component({
  selector: 'app-plateform',
  templateUrl: './plateform.page.html',
  styleUrls: ['./plateform.page.scss'],
  standalone: true,
  imports: [
    NgIf,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class PlateformPage implements OnInit {
  isBrowser = false;
  private ref: any;

  constructor(private router: Router) {}

  ngOnInit() {
    // Se siamo in browser → mostra iframe
    if (!(window as any).cordova) {
      this.isBrowser = true;
      return;
    }

    // Se siamo in app mobile → apri ThemeableBrowser
    this.ref = cordova.ThemeableBrowser.open(
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

    this.ref.addEventListener('closePressed', () => {
      this.ref.close();
    });
  }

  // 🔹 Pulsante per tornare indietro nell’app
  goBack() {
    if (this.ref) {
      this.ref.close(); // chiudi ThemeableBrowser se aperto
    }
    this.router.navigate(['/app/tabs/speakers']); // torna alla lista speaker (o dove vuoi tu)
  }
}
