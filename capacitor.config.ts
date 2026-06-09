import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS/Android shell for Steward. The app is a server-rendered Next.js app
// (it needs its /api routes), so the native app loads the live site via server.url
// rather than a static bundle. Native plugins (splash, status bar) give it real
// native value to pass Apple review guideline 4.2. Mirror of the Homefront pattern.
const config: CapacitorConfig = {
  appId: "app.gatheredin.steward",
  appName: "Steward",
  // Placeholder bundled assets (offline fallback). The real app is served remotely.
  webDir: "public",
  server: {
    url: "https://steward.gatheredin.app",
    cleartext: false,
  },
  ios: {
    backgroundColor: "#FFFFFF",
  },
};

export default config;
