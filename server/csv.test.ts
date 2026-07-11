import { describe, expect, it } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses simple rows', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles quoted fields with commas (as in university names)', () => {
    expect(parseCsv('uni,course\n"Hong Kong Polytechnic University, The",MM2711')).toEqual([
      ['uni', 'course'],
      ['Hong Kong Polytechnic University, The', 'MM2711'],
    ]);
  });

  it('handles escaped quotes and CRLF line endings', () => {
    expect(parseCsv('a,b\r\n"say ""hi""",2\r\n')).toEqual([
      ['a', 'b'],
      ['say "hi"', '2'],
    ]);
  });

  it('handles newlines inside quoted fields', () => {
    expect(parseCsv('a,b\n"line1\nline2",2')).toEqual([
      ['a', 'b'],
      ['line1\nline2', '2'],
    ]);
  });

  it('skips blank lines', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});
