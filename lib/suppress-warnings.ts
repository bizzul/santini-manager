// Suppress Bun async_hooks warnings
// This is a known limitation of Bun - async_hooks.createHook is not fully implemented
// but the functionality still works correctly

if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    // Suppress specific warnings in development
    const originalWarn = console.warn;
    console.warn = (...args) => {
        const message = args[0];
        if (
            typeof message === "string" &&
            message.includes("async_hooks.createHook")
        ) {
            // Suppress this specific warning
            return;
        }
        originalWarn.apply(console, args);
    };
}
