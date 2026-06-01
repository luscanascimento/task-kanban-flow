import { groupBy, moveItem, partition, uniqueBy } from './array';

describe('array utilities', () => {
  describe('groupBy', () => {
    it('groups items by derived key preserving order', () => {
      const result = groupBy([{ n: 1 }, { n: 2 }, { n: 1 }], (x) => String(x.n));
      expect(result).toEqual({ '1': [{ n: 1 }, { n: 1 }], '2': [{ n: 2 }] });
    });

    it('returns empty object for empty input', () => {
      expect(groupBy([], () => 'x')).toEqual({});
    });
  });

  describe('uniqueBy', () => {
    it('removes duplicates by primitive key', () => {
      expect(uniqueBy([1, 2, 1, 3, 2])).toEqual([1, 2, 3]);
    });

    it('removes duplicates by derived key', () => {
      const items = [{ id: 'a' }, { id: 'b' }, { id: 'a' }];
      expect(uniqueBy(items, (x) => x.id)).toEqual([{ id: 'a' }, { id: 'b' }]);
    });
  });

  describe('partition', () => {
    it('splits items by predicate', () => {
      const [even, odd] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
      expect(even).toEqual([2, 4]);
      expect(odd).toEqual([1, 3, 5]);
    });
  });

  describe('moveItem', () => {
    it('moves item and returns a new array', () => {
      const original = ['a', 'b', 'c', 'd'];
      const result = moveItem(original, 1, 3);
      expect(result).toEqual(['a', 'c', 'd', 'b']);
      expect(original).toEqual(['a', 'b', 'c', 'd']);
    });

    it('no-ops when from === to', () => {
      const arr = [1, 2, 3];
      expect(moveItem(arr, 1, 1)).toBe(arr);
    });

    it('throws on out-of-bounds index', () => {
      expect(() => moveItem([1, 2], 5, 0)).toThrow(RangeError);
      expect(() => moveItem([1, 2], 0, 5)).toThrow(RangeError);
    });
  });
});
