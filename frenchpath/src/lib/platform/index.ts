// The single seam between web and the Capacitor native shell.
//
// Detection reads the global `window.Capacitor` that the native bridge injects,
// rather than importing `@capacitor/core` — this keeps the module SSR/prerender
// safe (it never touches the bridge at import time) and adds nothing to the web
// bundle. Feature modules call these helpers; they must never import Capacitor
// plugins at the top level (dynamic-import them inside native-only branches so
// the web build and SSR stay clean). See docs/product/mobile-architecture.md.

interface CapacitorGlobal {
	isNativePlatform?: () => boolean;
	getPlatform?: () => string;
}

function cap(): CapacitorGlobal | undefined {
	if (typeof window === 'undefined') return undefined;
	return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True only inside the Capacitor native shell (Android/iOS WebView). */
export function isNativePlatform(): boolean {
	return cap()?.isNativePlatform?.() ?? false;
}

/** Current runtime platform. */
export function getPlatform(): 'web' | 'android' | 'ios' {
	const p = cap()?.getPlatform?.() ?? 'web';
	return p === 'android' || p === 'ios' ? p : 'web';
}
