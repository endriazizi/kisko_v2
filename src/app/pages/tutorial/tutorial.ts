import {
  Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, inject
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
  IonContent, IonFooter, IonModal, MenuController
} from '@ionic/angular/standalone';
import { IonContent as IonContentBase } from '@ionic/angular';
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
  imports: [
    CommonModule,
    RouterLink,
    // Ionic standalone
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon,
    IonContent, IonFooter, IonModal
  ],
})
export class TutorialPage implements OnInit, AfterViewInit, OnDestroy {
  // Services
  menu = inject(MenuController);
  router = inject(Router);
  storage = inject(Storage);
  http = inject(HttpClient);

  // Header / UI state
  showSkip = true;

  // Clock / weather
  currentTime!: string;
  currentDate = '';
  weather: any;
  private weatherApiKey = '41266f28a33c8ef363049edf9b38275e';
  private weatherCity = 'Castelraimondo';

  // View refs
  @ViewChild('pageContent', { static: true }) pageContent!: IonContentBase;

  // ===== Slide 1: Carosello =====
  @ViewChild('adsTrack', { static: false }) adsTrack!: ElementRef<HTMLDivElement>;
  adsImages: string[] = [
    // sostituisci con i tuoi path reali
    'assets/poster/a3_01.jpg',
    'assets/poster/a3_02.jpg',
    'assets/poster/a3_03.jpg',
    'assets/poster/a3_04.jpg',
  ];
  adsIndex = 0;
  private readonly ADS_DURATION_MS = 10_000;
  private adsTimer?: any;
  private adsUserPause = false;
  private adsScrollDebounce?: any;

  // Modal immagine
  isImageModalOpen = false;
  modalImageSrc = '';
  private modalAutoCloseTimer?: any;

  // ===== Slide 3: Video =====
  @ViewChild('slideVideo', { static: true }) slideVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoSection', { static: true }) videoSection!: ElementRef<HTMLElement>;
  private readonly VIDEO_SRC = 'assets/video/polveredistelle.mp4';
  muted = true;
  showUnmuteBtn = false;
  isPlaying = false;
  isVideoActive = false;
  private videoSrcSet = false;
  private io?: IntersectionObserver;

  // timers
  private clockInterval?: any;

  // first gesture to unlock audio (only when slide 3 is active)
  private firstGestureHandler = async () => {
    if (!this.isVideoActive) return;
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

  async ngAfterViewInit() {
    // ✅ FIX: aspetta che ion-content idrati lo scroll host (evita offsetHeight null)
    try { await this.pageContent.getScrollElement(); } catch {}

    // Carosello: allinea all’indice corrente e avvia autoplay
    setTimeout(() => this.goToAd(this.adsIndex, 'auto'), 0);
    this.startAdsCarousel();

    // Video: osserva la visibilità della slide 3
    this.setupIntersectionObserverForVideo();

    // Gesture globali per sblocco audio
    window.addEventListener('pointerdown', this.firstGestureHandler, true);
    window.addEventListener('keydown', this.firstGestureHandler, true);

    // Se la pagina torna visibile, riprova a far partire il video se la slide è attiva
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isVideoActive) this.startVideo();
    });
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);
    this.stopAdsCarousel();
    if (this.io) this.io.disconnect();

    window.removeEventListener('pointerdown', this.firstGestureHandler, true);
    window.removeEventListener('keydown', this.firstGestureHandler, true);

    this.pauseVideo(true);
    this.menu.enable(true);
  }

  // ---------------- Clock / Weather ----------------
  updateTimeAndDate() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.currentDate = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  fetchWeather() {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${this.weatherCity}&appid=${this.weatherApiKey}&units=metric&lang=it`;
    this.http.get(url).subscribe({
      next: (data) => this.weather = data,
      error: (err) => console.error('Errore meteo:', err),
    });
  }

  // ---------------- Carosello (slide 1) ----------------
  startAdsCarousel() {
    if (!this.adsImages.length) return;
    this.stopAdsCarousel();
    this.adsTimer = setInterval(() => {
      if (this.adsUserPause) return;
      const next = (this.adsIndex + 1) % this.adsImages.length;
      this.goToAd(next);
    }, this.ADS_DURATION_MS);
  }
  stopAdsCarousel() {
    if (this.adsTimer) { clearInterval(this.adsTimer); this.adsTimer = undefined; }
  }
  goToAd(i: number, behavior: ScrollBehavior = 'smooth') {
    this.adsIndex = Math.max(0, Math.min(i, this.adsImages.length - 1));
    const track = this.adsTrack?.nativeElement;
    if (!track) return;
    const x = this.adsIndex * track.clientWidth;
    track.scrollTo({ left: x, behavior });
  }
  onAdsScroll() {
    const track = this.adsTrack?.nativeElement;
    if (!track) return;
    const w = track.clientWidth || 1;
    const idx = Math.round(track.scrollLeft / w);
    if (idx !== this.adsIndex) this.adsIndex = idx;

    this.pauseAdsCarousel();
    clearTimeout(this.adsScrollDebounce);
    this.adsScrollDebounce = setTimeout(() => this.resumeAdsCarousel(), 2500);
  }
  pauseAdsCarousel(user = false) {
    if (user) this.adsUserPause = true;
    this.stopAdsCarousel();
  }
  resumeAdsCarousel() {
    this.adsUserPause = false;
    this.startAdsCarousel();
  }
  removeBrokenAd(i: number) {
    this.adsImages.splice(i, 1);
    if (!this.adsImages.length) { this.stopAdsCarousel(); return; }
    this.adsIndex = Math.min(this.adsIndex, this.adsImages.length - 1);
    setTimeout(() => this.goToAd(this.adsIndex, 'auto'), 0);
  }

  // Modal immagine
  openImageFull(src: string) {
    this.modalImageSrc = src;
    this.isImageModalOpen = true;
    if (this.modalAutoCloseTimer) clearTimeout(this.modalAutoCloseTimer);
    this.modalAutoCloseTimer = setTimeout(() => this.closeImageFull(), 10_000);
  }
  closeImageFull() {
    this.isImageModalOpen = false;
    if (this.modalAutoCloseTimer) { clearTimeout(this.modalAutoCloseTimer); this.modalAutoCloseTimer = undefined; }
  }

  // ---------------- Video (slide 3) ----------------
  private setupIntersectionObserverForVideo() {
    this.io = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting && entry.intersectionRatio > 0.6;
        this.isVideoActive = active;
        this.menu.enable(active);
        if (active) this.startVideo();
        else this.pauseVideo();
      },
      { threshold: [0, 0.6, 1] }
    );
    this.io.observe(this.videoSection.nativeElement);
  }

  private startVideo() {
    const v = this.slideVideo.nativeElement;
    if (!this.videoSrcSet) {
      v.src = this.VIDEO_SRC;        // set una volta sola
      this.videoSrcSet = true;
    }
    v.loop = true;
    v.muted = this.muted;
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

  private async tryUnmute() {
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

  private async forceUnlockAudio() {
    if (!this.isVideoActive) return;
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        if (ctx.state === 'suspended') await ctx.resume();
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

  unmuteAndPlay() { this.forceUnlockAudio(); }

  // ---------------- Menu & Nav ----------------
  async toggleMenu() { try { await this.menu.toggle(); } catch {} }

  startApp() {
    this.router.navigateByUrl('/app/tabs/schedule', { replaceUrl: true })
      .catch(err => console.error('Errore durante startApp:', err));
  }
}
