import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * useState that is saved with AsyncStorage (device storage on iOS/Android, localStorage on the
 * web). `ready` is false until the saved value has been read.
 */
export function useStoredState<T>(key: string, initial: () => T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!cancelled && raw) setValue(JSON.parse(raw) as T);
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value]);

  return [value, setValue, ready] as const;
}
