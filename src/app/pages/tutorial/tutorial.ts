import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonFooter,
  IonModal,
  MenuController,
  ToastController,
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
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonModal,
  ],
})
export class TutorialPage implements OnInit, AfterViewInit, OnDestroy {
  // ============== Services
  private menu = inject(MenuController);
  private router = inject(Router);
  private storage = inject(Storage);
  private http = inject(HttpClient);
  private toastCtrl = inject(ToastController);

  // ============== Header / UI state
  showSkip = true;

  // ============== Clock / Weather
  currentTime!: string;
  currentDate = '';
  weather: any;
  private weatherApiKey = '41266f28a33c8ef363049edf9b38275e';
  private weatherCity = 'Castelraimondo';
  private clockInterval?: any;

  // ============== View refs
  @ViewChild('pageContent', { static: true }) pageContent!: IonContentBase;
  @ViewChild('firstSlide', { static: true }) firstSlide!: ElementRef<HTMLElement>;

  // ============== Slide 1: Carosello A3
  @ViewChild('adsTrack', { static: false }) adsTrack!: ElementRef<HTMLDivElement>;
  adsImages: string[] = [
    // Sostituisci con i tuoi file reali
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

  // Modal immagine per il carosello
  isImageModalOpen = false;
  modalImageSrc = '';
  private modalAutoCloseTimer?: any;

  // ============== Slide 3: Video
  @ViewChild('slideVideo', { static: true }) slideVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('videoSection', { static: true }) videoSection!: ElementRef<HTMLElement>;

  private readonly VIDEO_SRC = 'assets/video/polveredistelle.mp4';
  muted = true;
  showUnmuteBtn = false;
  isPlaying = false;
  isVideoActive = false;
  private videoSrcSet = false;
  private io?: IntersectionObserver; // observer slide video

  // Gesto iniziale per sbloccare audio (solo slide video attiva)
  private firstGestureHandler = async () => {
    if (!this.isVideoActive) return;
    await this.forceUnlockAudio();
    if (!this.muted) {
      window.removeEventListener('pointerdown', this.firstGestureHandler, true);
      window.removeEventListener('keydown', this.firstGestureHandler, true);
    }
  };

  // ============== Toast assistenza (prima slide) con QR WhatsApp
  private ioFirst?: IntersectionObserver; // observer slide 1
  isFirstSlideActive = false;
  supportModalOpen = false;
  supportWhatsappLink = '';
  supportQrSrc = '';
  private supportDelayTimer?: any;
  private supportInterval?: any;
  private lastSupportToast = 0;
  // private readonly SUPPORT_TOAST_DELAY_MS = 10_000; // prima comparsa 10s
  // private readonly SUPPORT_TOAST_COOLDOWN_MS = 5 * 60_000; // poi ogni 5 min

private readonly SUPPORT_TOAST_DELAY_MS = 5_000;     // 3s prima comparsa
private readonly SUPPORT_TOAST_COOLDOWN_MS = 20_000; // ogni 10s

  constructor() {
    addIcons({ arrowForward, close, menuOutline });
  }

  // ============== Lifecycle
  ngOnInit() {
    this.updateTimeAndDate();
    this.clockInterval = setInterval(
      () => this.updateTimeAndDate(),
      1000
    );
    this.fetchWeather();
  }

  async ngAfterViewInit() {
    // Evita errori di hydration su ion-content
    try {
      await this.pageContent.getScrollElement();
    } catch {}

    // Carosello: posiziona e avvia autoplay
    setTimeout(() => this.goToAd(this.adsIndex, 'auto'), 0);
    this.startAdsCarousel();

    // Video: attiva observer per visibilità slide 3
    this.setupIntersectionObserverForVideo();

    // Prima slide: gestisci i toast di assistenza
    this.setupFirstSlideObserver();

    // Gesti globali per sblocco audio
    window.addEventListener('pointerdown', this.firstGestureHandler, true);
    window.addEventListener('keydown', this.firstGestureHandler, true);

    // Se torna visibile e la slide video è attiva, riprova a play
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isVideoActive) {
        this.startVideo();
      }
    });
  }

  ngOnDestroy() {
    if (this.clockInterval) clearInterval(this.clockInterval);

    this.stopAdsCarousel();
    if (this.io) this.io.disconnect();
    if (this.ioFirst) this.ioFirst.disconnect();

    window.removeEventListener('pointerdown', this.firstGestureHandler, true);
    window.removeEventListener('keydown', this.firstGestureHandler, true);

    this.pauseVideo(true);
    this.menu.enable(true);

    this.clearSupportTimers();
  }

  // ============== Clock / Weather
  updateTimeAndDate() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.currentDate = now.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  fetchWeather() {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${this.weatherCity}&appid=${this.weatherApiKey}&units=metric&lang=it`;
    this.http.get(url).subscribe({
      next: (data) => (this.weather = data),
      error: (err) => console.error('Errore meteo:', err),
    });
  }

  // ============== Carosello (slide 1)
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
    if (this.adsTimer) {
      clearInterval(this.adsTimer);
      this.adsTimer = undefined;
    }
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

    // debounce + pausa autoplay durante lo swipe manuale
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
    if (!this.adsImages.length) {
      this.stopAdsCarousel();
      return;
    }
    this.adsIndex = Math.min(this.adsIndex, this.adsImages.length - 1);
    setTimeout(() => this.goToAd(this.adsIndex, 'auto'), 0);
  }

  // Modal immagine (PUBLIC per template)
  openImageFull(src: string): void {
    this.modalImageSrc = src;
    this.isImageModalOpen = true;

    if (this.modalAutoCloseTimer) clearTimeout(this.modalAutoCloseTimer);
    this.modalAutoCloseTimer = setTimeout(() => this.closeImageFull(), 10_000);
  }

  closeImageFull(): void {
    this.isImageModalOpen = false;
    if (this.modalAutoCloseTimer) {
      clearTimeout(this.modalAutoCloseTimer);
      this.modalAutoCloseTimer = undefined;
    }
  }

  // ============== Video (slide 3)
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
      v.src = this.VIDEO_SRC; // set una volta
      this.videoSrcSet = true;
    }

    v.loop = true;
    v.muted = this.muted; // autoplay sicuro
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('webkit-playsinline', 'true');

    v.play()
      .then(() => {
        this.isPlaying = true;
        this.tryUnmute();
      })
      .catch(() => {
        this.showUnmuteBtn = true;
      });
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
    } catch {
      // ignore
    }

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

  unmuteAndPlay() {
    this.forceUnlockAudio();
  }

  onVideoError(_ev: Event) {
    this.toastCtrl
      .create({
        message:
          'Il video non è disponibile. Se il problema persiste, contattaci su WhatsApp: +39 389 986 8381',
        duration: 7000,
        position: 'bottom',
        buttons: [{ text: 'QR WhatsApp', handler: () => this.openWhatsAppSafe() }],
      })
      .then((t) => t.present());
  }

  // ============== Toast assistenza (prima slide)
  private setupFirstSlideObserver() {
    this.ioFirst = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting && entry.intersectionRatio > 0.6;
        this.isFirstSlideActive = active;
        if (active) this.startSupportTimers();
        else this.clearSupportTimers();
      },
      { threshold: [0, 0.6, 1] }
    );
    this.ioFirst.observe(this.firstSlide.nativeElement);
  }

  private startSupportTimers() {
    this.clearSupportTimers();

    // prima comparsa dopo 10s
    this.supportDelayTimer = setTimeout(() => {
      if (!this.isFirstSlideActive) return;
      const now = Date.now();
      if (now - this.lastSupportToast >= this.SUPPORT_TOAST_COOLDOWN_MS) {
        this.showSupportToast();
        this.lastSupportToast = now;
      }
      // poi ripeti ogni cooldown mentre la slide resta attiva
      this.supportInterval = setInterval(() => {
        if (!this.isFirstSlideActive) return;
        this.showSupportToast();
        this.lastSupportToast = Date.now();
      }, this.SUPPORT_TOAST_COOLDOWN_MS);
    }, this.SUPPORT_TOAST_DELAY_MS);
  }

  private clearSupportTimers() {
    if (this.supportDelayTimer) {
      clearTimeout(this.supportDelayTimer);
      this.supportDelayTimer = undefined;
    }
    if (this.supportInterval) {
      clearInterval(this.supportInterval);
      this.supportInterval = undefined;
    }
  }

  private async showSupportToast() {
    const toast = await this.toastCtrl.create({
      message:
        'Se noti malfunzionamenti o errori nel totem, contattaci su WhatsApp: +39 389 986 8381',
      position: 'bottom',
      duration: 20000,
      cssClass: 'toast-green',         // <— classe personalizzata
      buttons: [
        { text: 'QR WhatsApp', handler: () => this.openWhatsAppSafe() },
        { text: 'Chiudi', role: 'cancel' },
      ],
    });
    await toast.present();
  }

  // ============== WhatsApp: modal con QR (no uscita dal totem)
  openWhatsAppSafe() {
    const msg = 'Ciao, nel totem ho notato un problema. Potete verificare?';
    const link = `https://wa.me/393899868381?text=${encodeURIComponent(msg)}`;
    this.supportWhatsappLink = link;

    // Puoi sostituire con un PNG in assets per evitare chiamate esterne:
    // this.supportQrSrc = 'assets/img/wa_qr.png';
    this.supportQrSrc =
      'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' +
      encodeURIComponent(link);

    this.supportModalOpen = true;
  }

  async copyWhatsAppLink() {
    try {
      await navigator.clipboard.writeText(this.supportWhatsappLink);
      const t = await this.toastCtrl.create({
        message: 'Link WhatsApp copiato negli appunti.',
        duration: 2000,
        position: 'bottom',
      });
      await t.present();
    } catch {
      const t = await this.toastCtrl.create({
        message: 'Impossibile copiare. Numero: +39 389 986 8381',
        duration: 3000,
        position: 'bottom',
      });
      await t.present();
    }
  }

  // ============== Menu & Nav
  async toggleMenu() {
    try {
      await this.menu.toggle();
    } catch {}
  }

  startApp() {
    this.router
      .navigateByUrl('/app/tabs/schedule', { replaceUrl: true })
      .catch((err) => console.error('Errore durante startApp:', err));
  }
}
