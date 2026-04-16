import type { DesktopApi } from '../shared/api.js';

declare global {
  interface Window {
    myloggy: DesktopApi;
  }
}

export {};
