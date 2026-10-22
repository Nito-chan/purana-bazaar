const cleanups = [];

export function onCleanup(callback) {
  if (typeof callback === 'function') cleanups.push(callback);
}

export function runCleanups() {
  while (cleanups.length) {
    const callback = cleanups.pop();
    try {
      callback();
    } catch {
      // Cleanup is best-effort. Navigation must continue.
    }
  }
}
