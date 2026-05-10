/**
 * RPC Signature Drift Test
 *
 * Mục đích: chặn drift giữa chữ ký RPC trong DB (dump qua
 * `scripts/audit/dump-db-schema.sh` → `_generated/db-functions.tsv`) và
 * snapshot kỳ vọng (`scripts/audit/rpc-signatures.snapshot.json`).
 *
 * Khi test fail → dev phải:
 *   1. Đọc kỹ diff (test in ra expected vs actual).
 *   2. Quyết định: schema thay đổi hợp lệ → cập nhật snapshot + docs/architecture/01-modules/*.md
 *      tương ứng. Hoặc: drift sai → revert migration.
 *
 * Liên quan: docs/architecture/09-refactor/findings.md → F-RPC-OVERLOAD-01, F-RPC-DOC-01.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const TSV = path.join(ROOT, 'docs/architecture/_generated/db-functions.tsv');
const SNAPSHOT = path.join(ROOT, 'scripts/audit/rpc-signatures.snapshot.json');

interface Snapshot {
  expected: Record<string, string[]>;
}

function loadSnapshot(): Snapshot {
  return JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')) as Snapshot;
}

function loadDbFunctions(): Map<string, string[]> {
  if (!fs.existsSync(TSV)) {
    throw new Error(
      `Không tìm thấy ${path.relative(ROOT, TSV)}. Chạy: bash scripts/audit/dump-db-schema.sh`
    );
  }
  const map = new Map<string, string[]>();
  const lines = fs.readFileSync(TSV, 'utf8').trim().split('\n').filter(Boolean);
  for (const line of lines) {
    const [name, args] = line.split('\t');
    if (!name) continue;
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(args ?? '');
  }
  // Sort overloads để so sánh ổn định
  for (const arr of map.values()) arr.sort();
  return map;
}

describe('RPC signature drift (vs _generated/db-functions.tsv)', () => {
  const snapshot = loadSnapshot();
  const db = loadDbFunctions();

  for (const [rpc, expectedSigs] of Object.entries(snapshot.expected)) {
    it(`\`${rpc}\` khớp snapshot`, () => {
      const actual = db.get(rpc);
      if (!actual) {
        throw new Error(
          `RPC \`${rpc}\` không còn trong DB snapshot. Có thể đã bị DROP — ` +
            `cập nhật scripts/audit/rpc-signatures.snapshot.json + docs/architecture/01-modules/*.md.`
        );
      }
      const expectedSorted = [...expectedSigs].sort();
      // So sánh cả số lượng overload + nội dung từng arg string
      expect(actual, formatDiff(rpc, expectedSorted, actual)).toEqual(expectedSorted);
    });
  }

  it('không có overload mới của RPC critical chưa được snapshot', () => {
    // Cảnh báo nếu một RPC có trong snapshot bị thêm overload mới ngoài kế hoạch.
    const issues: string[] = [];
    for (const [rpc, expectedSigs] of Object.entries(snapshot.expected)) {
      const actual = db.get(rpc);
      if (!actual) continue;
      if (actual.length > expectedSigs.length) {
        issues.push(
          `\`${rpc}\`: DB có ${actual.length} overload, snapshot ${expectedSigs.length}. ` +
            `Thêm signature mới vào snapshot HOẶC DROP overload thừa.`
        );
      }
    }
    expect(issues, issues.join('\n')).toEqual([]);
  });
});

function formatDiff(rpc: string, expected: string[], actual: string[]): string {
  const lines = [
    '',
    `RPC \`${rpc}\` drift so với snapshot.`,
    '',
    `Expected (${expected.length} overload):`,
    ...expected.map((s, i) => `  [${i}] ${s || '(no args)'}`),
    '',
    `Actual (${actual.length} overload trong db-functions.tsv):`,
    ...actual.map((s, i) => `  [${i}] ${s || '(no args)'}`),
    '',
    'Hành động:',
    '  - Nếu schema đổi hợp lệ → update scripts/audit/rpc-signatures.snapshot.json',
    '    + cập nhật docs/architecture/01-modules/*.md có nhắc tới chữ ký này.',
    '  - Nếu drift sai → revert migration / DROP overload thừa.',
    '',
  ];
  return lines.join('\n');
}
