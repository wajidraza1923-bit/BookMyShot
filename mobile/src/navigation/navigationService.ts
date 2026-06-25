/**
 * Navigation Service — Shared navigation ref
 * Breaks the require cycle: App.tsx <-> RootNavigator.tsx
 */

let navigationRef: any = null;

export function setNavigationRef(ref: any) {
  navigationRef = ref;
}

export function getNavigationRef() {
  return navigationRef;
}

export function navigate(screen: string, params?: any) {
  if (navigationRef) {
    try {
      navigationRef.navigate(screen, params);
    } catch (e) {
      console.log('[Nav] Navigate failed:', e);
    }
  }
}
