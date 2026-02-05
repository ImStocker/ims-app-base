export function checkYandexBrowser(): boolean {
  return /YaBrowser/.test(window.navigator.userAgent);
}
export function checkAndroidBrowser(): boolean {
  return /android/i.test(window.navigator.userAgent);
}
export function checkIOSBrowser(): boolean {
  return (
    /iPad|iPhone|iPod/.test(window.navigator.userAgent) &&
    !(window as any).MSStream
  );
}
