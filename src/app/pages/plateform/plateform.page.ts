import { Component, inject, OnInit } from "@angular/core";
import { NgIf } from "@angular/common";
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";
import { Router } from "@angular/router";
import { Speaker } from "../../interfaces/conference.interfaces";
import { ConferenceService } from "../../providers/conference.service";

import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";

declare var cordova: any;

@Component({
  selector: "app-plateform",
  templateUrl: "./plateform.page.html",
  styleUrls: ["./plateform.page.scss"],
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

  constructor(private router: Router, private route: ActivatedRoute,    private sanitizer: DomSanitizer              ) {}
  private confData = inject(ConferenceService);

  speakers: Speaker[] = [];

   speakerId: string | null = null;

     url = "";                         // URL decodificato
  safeUrl: SafeResourceUrl | null = null; // 👈 URL “sanitized” per l’ifram


  ionViewDidEnter() {
    this.confData.getSpeakers().subscribe(speakers => {
      this.speakers = speakers;
    });
  }
  ngOnInit() {
    // 1) prendo il parametro e lo decodifico (es. "https:%2F%2Fludwig..." -> "https://ludwig...")
    const encoded = this.route.snapshot.paramMap.get('id');
    this.url = decodeURIComponent(encoded || 'https://ludwigstrasse.plateform.app/');

    // 2) se sono nel browser -> uso iframe + URL “sanitized”
    if (!(window as any).cordova) {
      this.isBrowser = true;
      this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.url); // 👈
      return;
    }

    // 3) su device -> apro ThemeableBrowser
    this.ref = cordova.ThemeableBrowser.open(
      this.url,
      "_blank",
      {
        toolbar: { height: 50, color: "#222222" },
        closeButton: { wwwImage: "assets/icon/close.png", align: "left", event: "closePressed" },
      }
    );

    this.ref.addEventListener("closePressed", () => {
      this.ref.close();
    });
  }

  goBack() {
    if (this.ref) this.ref.close();
    this.router.navigate(["/app/tabs/speakers"]);
  }
}