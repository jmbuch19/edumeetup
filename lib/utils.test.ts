import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('c1', 'c2')).toBe('c1 c2');
  });

  it('should handle conditional classes', () => {
    expect(cn('c1', true && 'c2', false && 'c3')).toBe('c1 c2');
  });

  it('should handle arrays', () => {
    expect(cn(['c1', 'c2'])).toBe('c1 c2');
  });

  it('should handle objects', () => {
    expect(cn({ c1: true, c2: false })).toBe('c1');
  });

  it('should handle mixed inputs', () => {
    expect(cn('c1', ['c2', { c3: true }], 'c4')).toBe('c1 c2 c3 c4');
  });

  it('should handle empty and falsy values', () => {
    expect(cn(null, undefined, '', 'c1')).toBe('c1');
  });

  it('should merge conflicting tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('px-4', 'px-2')).toBe('px-2');
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('should handle complex tailwind merge cases', () => {
    expect(cn('text-lg font-bold', 'text-sm')).toBe('font-bold text-sm');
  });
});
