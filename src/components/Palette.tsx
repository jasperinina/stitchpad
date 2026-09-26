import type { PatternDocument } from '../model/pattern';
import type { MarkingEngine } from '../progress/progress';

export function Palette({
  pattern,
  selected,
  engine,
  onSelect,
}: {
  pattern: PatternDocument;
  selected?: number;
  engine: MarkingEngine;
  onSelect(id: number): void;
}) {
  return (
    <aside className="palette-panel" aria-label="Палитра нитей">
      <div className="panel-title">
        <span>Палитра</span>
        <small>{pattern.palette.length} цветов</small>
      </div>
      <div className="thread-list">
        {pattern.palette.map((thread) => {
          const { total: count, completed: finished } = engine.counters(thread.id);
          return (
            <button
              key={thread.id}
              className={`thread ${selected === thread.id ? 'selected' : ''}`}
              onClick={() => onSelect(thread.id)}
            >
              <span
                className="swatch"
                style={{
                  background: `rgb(${thread.color.red} ${thread.color.green} ${thread.color.blue})`,
                }}
              >
                {thread.symbol}
              </span>
              <span className="thread-copy">
                <strong>{thread.number || `Цвет ${thread.id + 1}`}</strong>
                <small>{thread.name || thread.brand || 'Без названия'}</small>
              </span>
              <span className="thread-count">
                {finished}
                <i>/</i>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
