import { useRef } from 'react';
export function StartScreen({
  onFile,
  busy,
  error,
}: {
  onFile(file: File): void;
  busy: boolean;
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <main className="start-screen">
      <section className="intro">
        <div className="brand-mark" aria-hidden="true">
          <span>✕</span>
          <span>✕</span>
          <span>✕</span>
          <span>✕</span>
        </div>
        <p className="eyebrow">Локальная мастерская</p>
        <h1>
          Схема остаётся
          <br />
          между вами и нитью.
        </h1>
        <p className="lede">
          Откройте SAGA или DIZE. StitchPad разберёт файл прямо на iPad, без загрузки на сервер и
          без учётной записи.
        </p>
        <button className="primary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Разбираю схему…' : 'Открыть схему'}
        </button>
        <input
          ref={input}
          hidden
          type="file"
          accept=".saga,.dize"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="privacy-note">
          <span>Только на устройстве</span>
          <span>Работает офлайн</span>
          <span>Схема и прогресс в IndexedDB</span>
        </div>
      </section>
      <section className="sample-card" aria-hidden="true">
        <div className="sample-toolbar">
          <span>101 × 101</span>
          <span>43 цвета</span>
        </div>
        <div className="sample-grid">
          {Array.from({ length: 64 }, (_, i) => (
            <i
              key={i}
              style={
                {
                  '--tone': `${[38, 82, 116, 142, 58][(i * 7 + Math.floor(i / 8)) % 5]}`,
                } as React.CSSProperties
              }
            >
              {i % 5 === 0 ? '✕' : i % 7 === 0 ? '●' : ''}
            </i>
          ))}
        </div>
        <p>
          Каждый знак — на своём месте.
          <br />
          Каждая отметка — сохранена.
        </p>
      </section>
    </main>
  );
}
