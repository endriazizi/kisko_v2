import {
  Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

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
import { arrowForward, close, menuOutline } from 'ionicons/icons';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'page-tutorial',
  templateUrl: 'tutorial.html',
  styleUrls: ['./tutorial.scss'],
  imports: [IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonIcon, CommonModule, RouterLink],
})
export class TutorialPage implements OnInit, AfterViewInit, OnDestroy {
  // Servizi
  menu = inject(MenuController);
  router = inject(Router);
  storage = inject(Storage);
  http = inject(HttpClient);

  // Stato UI/meteo/orologio
  showSkip = true;
  currentTime!: string;
  currentDate: string = '';
  weather: any;

  private weatherApiKey = '41266f28a33c8ef363049edf9b38275e';
  private weatherCity = 'Castelraimondo';

  // Video nella slide 2
  @ViewChild('slideVideo', { static: true }) slideVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoSection', { static: true }) videoSection!: ElementRef<HTMLElement>;

  private readonly VIDEO_SRC = 'assets/video/polveredistelle.mp4';
  muted = true;               // Autoplay sicuro
  showUnmuteBtn = false;      // Mostrato solo se necessario
  isPlaying = false;
  isVideoActive = false;      // True quando la slide 2 è ≥60% visibile

  private io?: IntersectionObserver;
  private clockInterval?: any;
  private videoSrcSet = false;

  // Primo gesto utente per sblocco audio globale (rimane finché non sblocchiamo davvero)
  private firstGestureHandler = async () => {
    if (!this.isVideoActive) return;     // audio SOLO nella seconda sezione
    await this.forceUnlockAudio();
    if (!this.muted) {
      window.removeEventListener('pointerdown', this.firstGestureHandler, true);
      window.removeEventListener('keydown', this.firstGestureHandler, true);
    }
  };

  constructor() {
    addIcons({ arrowForward, close, menuOutline });
  }

  // ---------------- Lifecycle ----------------
  ngOnInit() {
    this.updateTimeAndDate();
    this.clockInterval = setInterval(() => this.updateTimeAndDate(), 1000);
    this.fetchWeather();
  }

  ngAfterViewInit() {
    // Attiva il video SOLO quando la slide 2 è in vista
    this.io = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting && entry.intersectionRatio > 0.6;
        this.isVideoActive = active;

        // Abilita il side menu solo nella slide video
        this.menu.enable(active);

        if (active) this.startVideo();
        else this.pauseVideo();
      },
      { threshold: [0, 0.6, 1] }
    );
    this.io.observe(this.videoSection.nativeElement);

    // Primo gesto utente (tap/tasto) per sblocco audio
    window.addEventListener('pointerdown', this.firstGestureHandler, true);
    window.addEventListener('keydown', this.firstGestureHandler, true);

    // Se la pagina torna visibile, riprova a far partire il video quando la slide 2 è attiva
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isVideoActive) {
        this.startVideo();
      }
    });
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.io) this.io.disconnect();
    window.removeEventListener('pointerdown', this.firstGestureHandler, true);
    window.removeEventListener('keydown', this.firstGestureHandler, true);
    this.pauseVideo(true);
    // Riabilita il menu quando lasci la pagina
    this.menu.enable(true);
  }

  // ---------------- Orologio / Data / Meteo ----------------
  updateTimeAndDate() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.currentDate = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  fetchWeather() {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${this.weatherCity}&appid=${this.weatherApiKey}&units=metric&lang=it`;
    this.http.get(url).subscribe({
      next: (data) => this.weather = data,
      error: (err) => console.error('Errore meteo:', err)
    });
  }

  // ---------------- Video helpers ----------------
  private startVideo() {
    const v = this.slideVideo.nativeElement;
    if (!this.videoSrcSet) {
      v.src = this.VIDEO_SRC;       // set una volta sola
      this.videoSrcSet = true;
    }
    v.loop = true;
    v.muted = this.muted;           // parte muted
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('webkit-playsinline', 'true');

    v.play()
      .then(() => { this.isPlaying = true; this.tryUnmute(); })
      .catch(() => { this.showUnmuteBtn = true; });
  }

  private pauseVideo(clear = false) {
    const v = this.slideVideo?.nativeElement;
    if (!v) return;
    v.pause();
    this.isPlaying = false;
    if (clear) {
      v.removeAttribute('src');
      v.load();
      this.videoSrcSet = false;
    }
  }

  /** Tenta subito di togliere il mute (su desktop spesso va). */
  private async tryUnmute() {
    // audio SOLO nella seconda sezione
    if (!this.isVideoActive) return;
    const v = this.slideVideo.nativeElement;
    try {
      v.muted = false;
      await v.play();
      this.muted = false;
      this.showUnmuteBtn = false;
      this.isPlaying = true;
    } catch {
      v.muted = true;
      this.muted = true;
      this.showUnmuteBtn = true;
    }
  }

  /** Forza sblocco audio: WebAudio “unlock” + unmute video + play */
  private async forceUnlockAudio() {
    if (!this.isVideoActive) return; // rispetto richiesta: audio solo slide 2

    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') { await ctx.resume(); }
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate); // 1 frame silenzioso
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch { /* ignore */ }

    const v = this.slideVideo?.nativeElement;
    if (!v) return;
    try {
      v.muted = false;
      await v.play();
      this.muted = false;
      this.showUnmuteBtn = false;
      this.isPlaying = true;
    } catch {
      v.muted = true;
      this.muted = true;
      this.showUnmuteBtn = true;
    }
  }

  async unmuteAndPlay() { await this.forceUnlockAudio(); }

  // ---------------- Menu & Navigazione ----------------
  async toggleMenu() {
    try { await this.menu.toggle(); } catch {}
  }

  startApp() {
    this.router
      .navigateByUrl('/app/tabs/schedule', { replaceUrl: true })
      .catch(err => console.error('Errore durante startApp:', err));
  }

  
}
