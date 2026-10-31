import "./styles.css";
import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { setAppUrl } from "./lib/util";
import { accountApi } from "./lib/api";
import { applyTheme, getThemeMode } from "./app/theme";
import { AppProvider } from "./app/state";
import { Shell } from "./app/Shell";
import { SignIn } from "./screens/SignIn";
import { Logo, Spinner, Toaster } from "./ui";

type Boot = { phase: "loading" } | { phase: "signed-out" } | { phase: "signed-in"; user: SessionUser };

function Root() {
  const [boot, setBoot] = useState<Boot>({ phase: "loading" });
  const [info, setInfo] = useState({ appUrl: "", version: "" });

  useEffect(() => {
    void (async () => {
      const i = await window.codexa.info();
      setAppUrl(i.appUrl);
      setInfo({ appUrl: i.appUrl, version: i.version });
      await applyTheme();
      const user = await window.codexa.me();
      setBoot(user ? { phase: "signed-in", user } : { phase: "signed-out" });
    })();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => getThemeMode() === "system" && void applyTheme("system");
    media.addEventListener("change", onChange);
    const onSignedOut = () => setBoot({ phase: "signed-out" });
    window.addEventListener("codexa:signed-out", onSignedOut);
    return () => {
      media.removeEventListener("change", onChange);
      window.removeEventListener("codexa:signed-out", onSignedOut);
    };
  }, []);

  const signedIn = useCallback((user: SessionUser) => {
    // First sign-in from the app: finish the web's onboarding quietly (timezone from this PC).
    if (!user.onboardedAt) void accountApi.onboarding({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, completed: true }).catch(() => {});
    setBoot({ phase: "signed-in", user });
  }, []);
  const signedOut = useCallback(() => setBoot({ phase: "signed-out" }), []);

  return (
    <>
      {boot.phase === "loading" ? (
        <div className="drag relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden text-fg">
          <span className="logo-breathe relative text-fg">
            <Logo size={34} />
          </span>
          <Spinner className="relative" />
        </div>
      ) : boot.phase === "signed-out" ? (
        <SignIn onSignedIn={signedIn} />
      ) : (
        <AppProvider user={boot.user} appUrl={info.appUrl} version={info.version} onSignedOut={signedOut}>
          <Shell />
        </AppProvider>
      )}
      <Toaster />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
