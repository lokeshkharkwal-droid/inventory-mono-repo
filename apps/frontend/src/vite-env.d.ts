/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_KALNOSTICS_API_BASE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * dotLottie animation files, imported as bundled asset URLs (enabled via
 * `assetsInclude` in vite.config.ts). Consumed by the shared <LottieLoader>.
 */
declare module '*.lottie' {
  const src: string;
  export default src;
}
