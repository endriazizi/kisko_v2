import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {

  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar,
  MenuController,
} from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage-angular';
import { addIcons } from 'ionicons';
import { arrowForward, close } from 'ionicons/icons';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'page-tutorial',
  templateUrl: 'tutorial.html',
  styleUrls: ['./tutorial.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonIcon, CommonModule],
})
export class TutorialPage implements OnInit {
  menu = inject(MenuController);
  router = inject(Router);
  storage = inject(Storage);
  http = inject(HttpClient);

  showSkip = true;
  currentTime: string;
  weather: any;

  private weatherApiKey = '41266f28a33c8ef363049edf9b38275e';
  private weatherCity = 'Castelraimondo';

  constructor() {
    addIcons({
      arrowForward,
      close,
    });
  }


currentDate: string = '';


ngOnInit() {
  this.updateTimeAndDate();
  setInterval(() => this.updateTimeAndDate(), 1000);
  this.fetchWeather();
}

updateTimeAndDate() {
  const now = new Date();
  this.currentTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  this.currentDate = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
}

  updateTime() {
    this.currentTime = new Date().toLocaleTimeString();
  }

  fetchWeather() {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${this.weatherCity}&appid=${this.weatherApiKey}&units=metric&lang=it`;
    this.http.get(url).subscribe({
      next: (data) => this.weather = data,
      error: (err) => console.error('Errore meteo:', err)
    });
  }

  startApp() {
    this.router
      .navigateByUrl('/app/tabs/schedule', { replaceUrl: true })
      .then(() => {
        console.log('Tutorial completato e storage aggiornato');
      })
      .catch((err) => {
        console.error('Errore durante startApp:', err);
      });
  }

  ionViewWillEnter() {
    this.storage.get('ion_did_tutorial').then((res) => {
      // if (res === true) {
      //   this.router.navigateByUrl('/app/tabs/schedule', { replaceUrl: true });
      // }
    });
    this.menu.enable(false);
  }

  ionViewWillLeave() {
    this.menu.enable(true);
  }
}
