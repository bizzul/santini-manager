"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    createSpeechProvider,
    type SpeechProvider,
    type SpeechProviderType,
    type SpeechOptions,
    type SpeechResult,
    type SpeechStatus,
    type SpeechProviderConfig,
} from "@/lib/speech";

export interface UseSpeechToTextOptions extends SpeechOptions {
    /** Provider type (default: "web-speech") */
    provider?: SpeechProviderType;
    /** API key for cloud providers */
    apiKey?: string;
    /** Callback when transcript updates */
    onTranscript?: (transcript: string, isFinal: boolean) => void;
    /** Callback when recording completes */
    onComplete?: (fullTranscript: string) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
}

export interface UseSpeechToTextReturn {
    /** Current transcript text */
    transcript: string;
    /** Full accumulated transcript */
    fullTranscript: string;
    /** Current status of the speech provider */
    status: SpeechStatus;
    /** Whether currently recording */
    isRecording: boolean;
    /** Whether processing (e.g., sending to Whisper API) */
    isProcessing: boolean;
    /** Whether the provider is supported */
    isSupported: boolean;
    /** Error if any */
    error: Error | null;
    /** Start recording */
    start: () => void;
    /** Stop recording */
    stop: () => void;
    /** Clear the transcript */
    clear: () => void;
}

/**
 * Hook for speech-to-text with provider abstraction
 *
 * @example
 * ```tsx
 * // With Web Speech API (free, browser-native)
 * const { transcript, isRecording, start, stop } = useSpeechToText();
 *
 * // With Whisper (requires API key)
 * const { transcript, isRecording, start, stop } = useSpeechToText({
 *   provider: "whisper",
 *   apiKey: "sk-..."
 * });
 * ```
 */
export function useSpeechToText(
    options: UseSpeechToTextOptions = {}
): UseSpeechToTextReturn {
    const {
        provider: providerType = "web-speech",
        apiKey,
        language = "it-IT",
        continuous = true,
        interimResults = true,
        onTranscript,
        onComplete,
        onError,
    } = options;

    const [transcript, setTranscript] = useState("");
    const [fullTranscript, setFullTranscript] = useState("");
    const [status, setStatus] = useState<SpeechStatus>("idle");
    const [error, setError] = useState<Error | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    const providerRef = useRef<SpeechProvider | null>(null);
    const fullTranscriptRef = useRef("");

    // Initialize provider
    useEffect(() => {
        const config: SpeechProviderConfig = apiKey ? { apiKey } : {};

        try {
            const speechProvider = createSpeechProvider(providerType, config);
            providerRef.current = speechProvider;
            setIsSupported(speechProvider.isSupported());

            // Set up callbacks
            speechProvider.onResult((result: SpeechResult) => {
                setTranscript(result.transcript);

                if (result.isFinal) {
                    // Append to full transcript
                    fullTranscriptRef.current +=
                        (fullTranscriptRef.current ? " " : "") + result.transcript;
                    setFullTranscript(fullTranscriptRef.current);
                }

                onTranscript?.(result.transcript, result.isFinal);
            });

            speechProvider.onError((err: Error) => {
                setError(err);
                onError?.(err);
            });

            speechProvider.onStatusChange((newStatus: SpeechStatus) => {
                setStatus(newStatus);

                // Call onComplete when stopping
                if (newStatus === "idle" && fullTranscriptRef.current) {
                    onComplete?.(fullTranscriptRef.current);
                }
            });
        } catch (err) {
            const initError =
                err instanceof Error
                    ? err
                    : new Error("Failed to initialize speech provider");
            setError(initError);
            setIsSupported(false);
        }

        return () => {
            providerRef.current?.destroy();
            providerRef.current = null;
        };
    }, [providerType, apiKey, onTranscript, onComplete, onError]);

    const start = useCallback(async () => {
        if (!providerRef.current) {
            setError(new Error("Speech provider not initialized"));
            return;
        }

        if (!providerRef.current.isSupported()) {
            setError(
                new Error(
                    `Speech provider "${providerType}" is not supported in this browser`
                )
            );
            return;
        }

        setError(null);
        setTranscript("");

        try {
            // start() may be async (e.g., to request microphone permissions)
            await providerRef.current.start({
                language,
                continuous,
                interimResults,
            });
        } catch (err) {
            const startError =
                err instanceof Error
                    ? err
                    : new Error("Failed to start speech recognition");
            setError(startError);
            onError?.(startError);
        }
    }, [providerType, language, continuous, interimResults, onError]);

    const stop = useCallback(() => {
        providerRef.current?.stop();
    }, []);

    const clear = useCallback(() => {
        setTranscript("");
        setFullTranscript("");
        fullTranscriptRef.current = "";
        setError(null);
    }, []);

    return {
        transcript,
        fullTranscript,
        status,
        isRecording: status === "recording",
        isProcessing: status === "processing",
        isSupported,
        error,
        start,
        stop,
        clear,
    };
}
