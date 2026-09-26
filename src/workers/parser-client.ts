import type { PatternDocument } from '../model/pattern';

export function parseFileInWorker(file: File): Promise<PatternDocument> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({
      data,
    }: MessageEvent<{ ok: boolean; pattern?: PatternDocument; error?: string }>) => {
      worker.terminate();
      if (data.ok && data.pattern) resolve(data.pattern);
      else reject(new Error(data.error ?? 'Не удалось открыть схему'));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('Ошибка фонового парсера'));
    };
    file
      .arrayBuffer()
      .then((buffer) => worker.postMessage({ buffer, name: file.name }, [buffer]))
      .catch((error) => {
        worker.terminate();
        reject(error);
      });
  });
}
