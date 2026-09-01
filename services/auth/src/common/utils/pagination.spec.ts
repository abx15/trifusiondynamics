import { parsePagination, paginatedResult } from './pagination';

describe('parsePagination', () => {
  it('returns defaults for missing input', () => {
    const r = parsePagination();
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
    expect(r.take).toBe(20);
    expect(r.skip).toBe(0);
  });

  it('parses numeric string inputs', () => {
    const r = parsePagination('3', '50');
    expect(r.page).toBe(3);
    expect(r.limit).toBe(50);
    expect(r.skip).toBe(100);
  });

  it('caps the limit at MAX_LIMIT (100)', () => {
    const r = parsePagination(1, 9999);
    expect(r.limit).toBe(100);
    expect(r.take).toBe(100);
  });

  it('coerces invalid input to defaults', () => {
    const r = parsePagination('foo', '-5');
    expect(r.page).toBe(1);
    expect(r.limit).toBeGreaterThanOrEqual(1);
  });

  it('never returns page < 1', () => {
    expect(parsePagination(0, 10).page).toBe(1);
    expect(parsePagination(-3, 10).page).toBe(1);
  });

  it('never returns limit < 1', () => {
    expect(parsePagination(1, 0).limit).toBeGreaterThanOrEqual(1);
    expect(parsePagination(1, 0).limit).toBeLessThanOrEqual(20);
  });
});

describe('paginatedResult', () => {
  it('computes totalPages correctly', () => {
    const r = paginatedResult([1, 2, 3], 25, 1, 10);
    expect(r.totalPages).toBe(3);
    expect(r.page).toBe(1);
    expect(r.limit).toBe(10);
    expect(r.total).toBe(25);
  });

  it('returns totalPages >= 1 even when empty', () => {
    const r = paginatedResult([], 0, 1, 10);
    expect(r.totalPages).toBe(1);
  });
});
