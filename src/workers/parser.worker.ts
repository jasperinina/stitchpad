import { parsePattern } from '../parsers';

self.onmessage = async (event: MessageEvent<{ buffer: ArrayBuffer; name: string }>) => {
  try {
    const pattern = await parsePattern(new Uint8Array(event.data.buffer), event.data.name);
    self.postMessage({ ok: true, pattern });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'Не удалось открыть схему',
    });
  }
};
