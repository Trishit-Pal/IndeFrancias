import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Rasterises static/icon.svg into the PWA icon set (any + maskable + apple-touch).
export default defineConfig({
	preset: minimal2023Preset,
	images: ['static/icon.svg']
});
