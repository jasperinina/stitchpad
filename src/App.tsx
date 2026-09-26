import { useEffect, useRef, useState } from 'react';
import type { PatternDocument } from './model/pattern';
import { PatternCanvas } from './components/PatternCanvas';
import { Palette } from './components/Palette';
import { StartScreen } from './components/StartScreen';
import { parseFileInWorker } from './workers/parser-client';
import {
  decodeProgress,
  encodeProgress,
  MarkingEngine,
  newProgress,
  progressCompatibility,
  sanitizeProgress,
  type MarkMode,
  type StitchProgress,
} from './progress/progress';
import { loadProgress, saveProgress } from './persistence/database';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function App() {
  const [pattern, setPattern] = useState<PatternDocument>(),
    [progress, setProgress] = useState<StitchProgress>(),
    [engine, setEngine] = useState<MarkingEngine>(),
    [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>(),
    [interaction, setInteraction] = useState<'view' | 'mark'>('view'),
    [markMode, setMarkMode] = useState<MarkMode>('mark'),
    [saved, setSaved] = useState<'saved' | 'saving' | 'error'>('saved'),
    [paletteOpen, setPaletteOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent>(),
    [updateReady, setUpdateReady] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const install = (event: Event) => {
        event.preventDefault();
        setInstallPrompt(event as InstallPromptEvent);
      },
      update = () => setUpdateReady(true);
    window.addEventListener('beforeinstallprompt', install);
    window.addEventListener('stitchpad:update-ready', update);
    return () => {
      window.removeEventListener('beforeinstallprompt', install);
      window.removeEventListener('stitchpad:update-ready', update);
    };
  }, []);
  const openFile = async (file: File) => {
    setBusy(true);
    setError(undefined);
    try {
      const parsed = await parseFileInWorker(file);
      let stored: StitchProgress | undefined;
      try {
        stored = await loadProgress(parsed.canonicalPatternHash);
      } catch {
        setError('Сохранённый локальный прогресс повреждён; схема открыта без него.');
      }
      const next = stored ? sanitizeProgress(stored, parsed).progress : newProgress(parsed);
      setPattern(parsed);
      setProgress(next);
      setEngine(new MarkingEngine(parsed, next.completedStitchIDs));
      setRevision(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось открыть схему');
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!progress || !engine || !progress.displaySettings.autosave) return;
    const timer = window.setTimeout(() => {
      setSaved('saving');
      void saveProgress({ ...progress, completedStitchIDs: [...engine.completed] })
        .then(() => setSaved('saved'))
        .catch(() => setSaved('error'));
    }, 500);
    return () => clearTimeout(timer);
  }, [progress, engine, revision]);
  useEffect(() => {
    if (!progress || !engine || !progress.displaySettings.autosave) return;
    const flush = () => {
      if (document.visibilityState === 'hidden')
        void saveProgress({ ...progress, completedStitchIDs: [...engine.completed] });
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  }, [progress, engine, revision]);
  const overall = engine?.overall;
  const counts = overall
    ? { total: overall.total, done: overall.completed + revision * 0 }
    : { total: 0, done: 0 };
  const activateUpdate = () =>
    void navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.waiting?.postMessage({ type: 'SKIP_WAITING' }));
  if (!pattern || !progress || !engine)
    return (
      <>
        <StartScreen onFile={openFile} busy={busy} error={error} />
        {(installPrompt || updateReady) && (
          <div className="pwa-toast">
            {installPrompt && (
              <button
                onClick={() => {
                  void installPrompt.prompt();
                  setInstallPrompt(undefined);
                }}
              >
                Установить StitchPad
              </button>
            )}
            {updateReady && <button onClick={activateUpdate}>Обновить StitchPad</button>}
          </div>
        )}
      </>
    );
  const updateProgress = (patch: Partial<StitchProgress>) =>
    setProgress((value) => value && { ...value, ...patch });
  const selected = progress.selectedThreadID;
  const exportProgress = () => {
    const blob = new Blob(
        [encodeProgress({ ...progress, completedStitchIDs: [...engine.completed] })],
        { type: 'application/json' },
      ),
      anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${pattern.metadata.name}.stitchprogress`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1_000);
  };
  const importProgress = async (file: File) => {
    try {
      const incoming = decodeProgress(await file.text()),
        compatibility = progressCompatibility(incoming, pattern);
      if (compatibility === 'mismatch') throw new Error('Этот прогресс относится к другой схеме');
      const clean = sanitizeProgress(incoming, pattern);
      setProgress(clean.progress);
      setEngine(new MarkingEngine(pattern, clean.progress.completedStitchIDs));
      setRevision((v) => v + 1);
      setError(clean.ignored ? `Пропущено неизвестных отметок: ${clean.ignored}` : undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось импортировать прогресс');
    }
  };
  return (
    <div className="workspace">
      <header className="topbar">
        <button
          className="wordmark"
          onClick={() => {
            setPattern(undefined);
            setProgress(undefined);
          }}
        >
          StitchPad
        </button>
        <div className="pattern-heading">
          <strong>{pattern.metadata.name}</strong>
          <span>
            {pattern.dimensions.width} × {pattern.dimensions.height} · {pattern.palette.length}{' '}
            цветов
          </span>
        </div>
        <div className="save-state" data-state={saved}>
          <i />
          {saved === 'saved'
            ? 'Сохранено'
            : saved === 'saving'
              ? 'Сохранение…'
              : 'Ошибка сохранения'}
        </div>
        <button
          className="icon-button mobile-only"
          onClick={() => setPaletteOpen((v) => !v)}
          aria-label="Палитра"
        >
          ☷
        </button>
      </header>
      <div className="main-area">
        <div className="canvas-stage">
          <PatternCanvas
            key={pattern.canonicalPatternHash}
            pattern={pattern}
            completed={engine.completed}
            selectedThread={selected}
            settings={progress.displaySettings}
            interaction={interaction}
            markMode={markMode}
            revision={revision}
            viewport={progress.viewport}
            onViewportChange={(viewport) => updateProgress({ viewport })}
            onStroke={(ids, mode) => {
              engine.apply(ids, mode);
              setRevision((v) => v + 1);
            }}
          />
          <div className="mode-switch" role="group" aria-label="Режим касания">
            <button
              className={interaction === 'view' ? 'active' : ''}
              onClick={() => setInteraction('view')}
            >
              Просмотр
            </button>
            <button
              className={interaction === 'mark' ? 'active' : ''}
              onClick={() => setInteraction('mark')}
            >
              Отметка
            </button>
          </div>
          <div className="floating-tools">
            <select
              aria-label="Действие отметки"
              value={markMode}
              onChange={(e) => setMarkMode(e.target.value as MarkMode)}
            >
              <option value="mark">Отмечать</option>
              <option value="unmark">Снимать</option>
              <option value="toggle">Переключать</option>
            </select>
            <button
              disabled={!engine.canUndo}
              onClick={() => {
                engine.undo();
                setRevision((v) => v + 1);
              }}
              aria-label="Отменить"
            >
              ↶
            </button>
            <button
              disabled={!engine.canRedo}
              onClick={() => {
                engine.redo();
                setRevision((v) => v + 1);
              }}
              aria-label="Повторить"
            >
              ↷
            </button>
          </div>
        </div>
        <div className={`side-column ${paletteOpen ? 'open' : ''}`}>
          <Palette
            pattern={pattern}
            selected={selected}
            engine={engine}
            onSelect={(id) => updateProgress({ selectedThreadID: id })}
          />
          <section className="settings-panel">
            <div className="panel-title">
              <span>Вид схемы</span>
            </div>
            <label>
              Отображение
              <select
                value={progress.displaySettings.mode}
                onChange={(e) =>
                  updateProgress({
                    displaySettings: {
                      ...progress.displaySettings,
                      mode: e.target.value as typeof progress.displaySettings.mode,
                    },
                  })
                }
              >
                <option value="symbolsAndColors">Символы и цвета</option>
                <option value="symbols">Символы</option>
                <option value="colors">Только цвета</option>
                <option value="selectedThreadFocus">Фокус на нити</option>
              </select>
            </label>
            <label>
              Готовые
              <select
                value={progress.displaySettings.completedAppearance}
                onChange={(e) =>
                  updateProgress({
                    displaySettings: {
                      ...progress.displaySettings,
                      completedAppearance: e.target
                        .value as typeof progress.displaySettings.completedAppearance,
                    },
                  })
                }
              >
                <option value="dim">Приглушать</option>
                <option value="overlay">Покрывать</option>
                <option value="hide">Скрывать</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={progress.displaySettings.showGrid}
                onChange={(e) =>
                  updateProgress({
                    displaySettings: { ...progress.displaySettings, showGrid: e.target.checked },
                  })
                }
              />
              Мелкая сетка
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={progress.displaySettings.allowFingerMarking}
                onChange={(e) =>
                  updateProgress({
                    displaySettings: {
                      ...progress.displaySettings,
                      allowFingerMarking: e.target.checked,
                    },
                  })
                }
              />
              Разрешить отметку пальцем
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={progress.displaySettings.onlyMarkSelectedThread}
                onChange={(e) =>
                  updateProgress({
                    displaySettings: {
                      ...progress.displaySettings,
                      onlyMarkSelectedThread: e.target.checked,
                    },
                  })
                }
              />
              Только выбранная нить
            </label>
            <div className="file-actions">
              <button onClick={exportProgress}>Экспорт прогресса</button>
              <button onClick={() => importInput.current?.click()}>Импорт</button>
              <input
                ref={importInput}
                hidden
                type="file"
                accept=".stitchprogress,application/json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importProgress(file);
                }}
              />
            </div>
            {installPrompt && (
              <div className="file-actions">
                <button
                  onClick={() => {
                    void installPrompt.prompt();
                    setInstallPrompt(undefined);
                  }}
                >
                  Установить приложение
                </button>
              </div>
            )}
            {updateReady && (
              <div className="file-actions">
                <button onClick={activateUpdate}>Обновить приложение</button>
              </div>
            )}
            <p className="install-hint">На iPad: Поделиться → На экран «Домой».</p>
            {error && <p className="error compact">{error}</p>}
          </section>
        </div>
      </div>
      <footer className="progress-bar">
        <div>
          <strong>{counts.done.toLocaleString('ru-RU')}</strong>
          <span>из {counts.total.toLocaleString('ru-RU')} стежков</span>
        </div>
        <div className="track">
          <i style={{ width: `${counts.total ? (counts.done / counts.total) * 100 : 0}%` }} />
        </div>
        <b>{Math.round(counts.total ? (counts.done / counts.total) * 100 : 0)}%</b>
      </footer>
    </div>
  );
}
