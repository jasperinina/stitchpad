import { describe, expect, it } from 'vitest';
import { matchesSelection } from '../src/renderer/canvas-renderer';

describe('renderer selection', () => {
  it('focuses only the selected color and stitch category', () => {
    expect(matchesSelection(4, 'backstitch', 4, 'backstitch')).toBe(true);
    expect(matchesSelection(4, 'fullCross', 4, 'backstitch')).toBe(false);
    expect(matchesSelection(5, 'backstitch', 4, 'backstitch')).toBe(false);
  });

  it('keeps legacy thread-only selections compatible', () => {
    expect(matchesSelection(4, 'fullCross', 4)).toBe(true);
    expect(matchesSelection(4, 'backstitch', 4)).toBe(true);
  });
});
