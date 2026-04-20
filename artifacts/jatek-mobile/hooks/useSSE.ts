/**
 * useSSE — lightweight SSE hook for React Native.
 *
 * React Native's fetch() supports ReadableStream on the new architecture
 * (expo SDK ≥ 51, newArchEnabled: true).  We use it to parse text/event-stream.
 *
 * Falls back gracefully (no error) on platforms without streaming support.
 */
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

type EventHandler = (data: unknown) => void;

interface SSEOptions {
  url: string;
  events: Record<string, EventHandler>;
  enabled?: boolean;
}

export function useSSE({ url, events, enabled = true }: SSEOptions) {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS === "web") return; // web uses native EventSource

    let active = true;
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });

        if (!res.body) return; // streaming not supported

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "message";

        while (active) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              const rawData = line.slice(5).trim();
              try {
                const parsed = JSON.parse(rawData);
                if (events[currentEvent]) {
                  events[currentEvent](parsed);
                }
              } catch {}
              currentEvent = "message"; // reset
            }
          }
        }
      } catch {
        // AbortError or network error — silent
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, enabled]);
}
