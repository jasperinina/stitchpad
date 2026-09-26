import type { PatternDocument } from '../model/pattern';
import type { StitchKind } from '../model/pattern';
import type { MarkingEngine } from '../progress/progress';
import { buildLegendGroups } from './legend';

export function Palette({
  pattern,
  selected,
  selectedKind,
  engine,
  onSelect,
}: {
  pattern: PatternDocument;
  selected?: number;
  selectedKind?: StitchKind;
  engine: MarkingEngine;
  onSelect(id: number, kind: StitchKind): void;
}) {
  const groups = buildLegendGroups(pattern, engine.completed);
  return (
    <aside className="palette-panel" aria-label="Ключ схемы">
      <div className="panel-title">
        <span>Ключ схемы</span>
        <small>
          {pattern.palette.length} цветов · {groups.length} типов
        </small>
      </div>
      <div className="thread-list">
        {groups.map((group) => (
          <section className="legend-group" key={group.kind}>
            <div className="legend-heading">
              <strong>{group.label}</strong>
              <span>{group.total}</span>
            </div>
            {group.entries.map(({ thread, total, completed, strands }) => (
              <button
                key={`${group.kind}:${thread.id}`}
                className={`thread ${selected === thread.id && selectedKind === group.kind ? 'selected' : ''}`}
                onClick={() => onSelect(thread.id, group.kind)}
                aria-label={`${group.label}, ${thread.number || `цвет ${thread.id + 1}`}`}
              >
                <span
                  className="swatch"
                  style={{
                    background: `rgb(${thread.color.red} ${thread.color.green} ${thread.color.blue})`,
                  }}
                >
                  {group.kind === 'knot' ? '●' : group.kind === 'backstitch' ? '━' : thread.symbol}
                </span>
                <span className="thread-copy">
                  <strong>{thread.number || `Цвет ${thread.id + 1}`}</strong>
                  <small>{thread.name || thread.brand || 'Без названия'}</small>
                  {strands && <small className="thread-strands">{strandLabel(strands)}</small>}
                </span>
                <span className="thread-count">
                  {completed === undefined ? (
                    total
                  ) : (
                    <>
                      {completed}
                      <i>/</i>
                      {total}
                    </>
                  )}
                </span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}

function strandLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  const noun =
    lastTwo >= 11 && lastTwo <= 14 ? 'нитей' : last === 1 ? 'нить' : last < 5 ? 'нити' : 'нитей';
  return `${count} ${noun}`;
}
