// expo-clipboard has native code — same story as expo-screen-orientation:
// requireNativeModule() throws synchronously at import time on a dev client
// built before the package was added. Dynamic import + a requireOptional
// check first, so an old build degrades to "no puedo copiar" instead of
// crashing the screen.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const { requireOptionalNativeModule } = await import("expo-modules-core");
    if (!requireOptionalNativeModule("ExpoClipboard")) return false;
    const Clipboard = await import("expo-clipboard");
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
