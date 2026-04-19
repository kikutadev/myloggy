import type { OllamaStatus } from '../../../shared/types.js';

export async function checkOllama(): Promise<OllamaStatus> {
  return window.myloggy.checkOllama();
}