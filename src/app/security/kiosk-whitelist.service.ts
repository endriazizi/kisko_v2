import { Injectable } from '@angular/core';

export type WhitelistRule =
  | string                   // "https://example.com/path" o "example.com"
  | RegExp;                  // /https?:\/\/(www\.)?example\.com(\/|$)/

@Injectable({ providedIn: 'root' })
export class KioskWhitelistService {
  // 🔒 Modifica qui la tua whitelist (host o pattern completi)
  // Suggerimento: tienila in environment.*.ts se vuoi separare per build.
  private readonly rules: WhitelistRule[] = [
    // domini (match su host e sottodomini)
    'castelraimondoturismo.it',
    'viverecamerino.it',
    'cronachemaceratesi.it',
    'picchionews.it',
    'comune.castelraimondo.mc.it',
    // esempi API o percorsi specifici:
    // /https?:\/\/api\.miosito\.it\/v[12]\/.*/,
  ];

  private readonly allowedSchemes = new Set(['http:', 'https:', 'tel:', 'mailto:']);

  /** Normalizza in URL e verifica se è consentito. */
  isAllowed(rawUrl: string): boolean {
    let url: URL;
    try {
      url = new URL(rawUrl, window.location.href); // supporta href relativi
    } catch {
      return false;
    }

    if (!this.allowedSchemes.has(url.protocol)) return false;

    const host = url.hostname.toLowerCase();

    for (const rule of this.rules) {
      if (typeof rule === 'string') {
        // consenti dominio nudo e sottodomini: *.rule
        const ruleHost = rule.toLowerCase();
        if (host === ruleHost || host.endsWith('.' + ruleHost)) return true;
      } else {
        if (rule.test(url.href)) return true;
      }
    }
    // consenti sempre stesso origin dell'app
    try {
      const appOrigin = new URL(window.location.href).origin;
      if (url.origin === appOrigin) return true;
    } catch {}
    return false;
  }
}
