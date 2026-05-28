import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { importFeedingsCsv, type CsvImportResult } from '@/lib/api/csvImport';
import { EmptyState } from '@/components/common/EmptyState';
import { Spinner } from '@/components/common/Spinner';

const TEMPLATE = `food_name,fed_at,amount_ml,reaction,note
紅蘿蔔泥,2026-04-10T10:00:00+08:00,30,NONE,
高麗菜泥,2026-04-11T11:00:00+08:00,30,MILD,有點紅疹
`;

function downloadTemplate() {
  const blob = new Blob(['﻿' + TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'feeding-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportPage() {
  const activeBabyId = useAppStore((s) => s.activeBabyId);
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dryRunResult, setDryRunResult] = useState<CsvImportResult | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [busy, setBusy] = useState<'dry' | 'real' | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setDryRunResult(null);
    setImportResult(null);
    setError(null);
  }

  async function runDryRun(f: File) {
    if (!activeBabyId) return;
    setBusy('dry');
    setError(null);
    setImportResult(null);
    try {
      const r = await importFeedingsCsv(activeBabyId, f, { dryRun: true });
      setDryRunResult(r);
    } catch (err) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? '預檢失敗');
    } finally {
      setBusy(null);
    }
  }

  async function runImport() {
    if (!activeBabyId || !file) return;
    setBusy('real');
    setError(null);
    try {
      const r = await importFeedingsCsv(activeBabyId, file, { dryRun: false });
      setImportResult(r);
      // Bust caches that the new data affects.
      qc.invalidateQueries({ queryKey: ['feedings', activeBabyId] });
      qc.invalidateQueries({ queryKey: ['dashboard', activeBabyId] });
      qc.invalidateQueries({ queryKey: ['trials', activeBabyId] });
      qc.invalidateQueries({ queryKey: ['baby-achievements', activeBabyId] });
    } catch (err) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? '匯入失敗');
    } finally {
      setBusy(null);
    }
  }

  function handleSelect(f: File | null) {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      setError('請選擇 .csv 檔案');
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setError('檔案超過 2 MB');
      return;
    }
    reset();
    setFile(f);
    runDryRun(f);
  }

  if (!activeBabyId) {
    return (
      <EmptyState icon="📥" title="先選一位寶寶" description="匯入紀錄屬於特定寶寶,請先切換" />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="serif text-xl font-semibold text-bark">批次匯入舊紀錄</h2>
        <p className="mt-1 text-xs text-bark-soft">
          上傳一份 CSV，把過往的餵食紀錄一次帶回家裡的本子。
        </p>
      </div>

      <div className="paper-card p-4 text-sm">
        <p className="serif text-bark">CSV 格式</p>
        <p className="mt-1 text-xs text-bark-soft">
          UTF-8 編碼，第一列為標頭：
          <code className="ml-1 rounded bg-cream-deep px-1.5 py-0.5 text-[11px]">
            food_name,fed_at,amount_ml,reaction,note
          </code>
        </p>
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-[11px] text-bark-soft">
          <li>fed_at 用 ISO 8601 含時區（如 2026-04-10T10:00:00+08:00）</li>
          <li>reaction: NONE / MILD / SEVERE，留空視為 NONE</li>
          <li>食材名稱需與圖鑑相符（大小寫不敏感）</li>
          <li>同 (寶寶, 食材, 時間) 已存在的紀錄會自動跳過</li>
          <li>最大 2 MB，最多 5000 列</li>
        </ul>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mt-3 inline-flex items-center gap-1 rounded-full border border-bark-faded/30 px-3 py-1 text-xs font-semibold text-bark-soft hover:bg-cream-deep/40"
        >
          <FileText size={14} /> 下載模板
        </button>
      </div>

      <label className="paper-card flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed border-bark-faded/40 bg-cream-card p-8 text-center transition-colors hover:bg-cream-deep/30">
        <Upload size={28} className="text-bark-faded" />
        <span className="serif text-base text-bark">{file ? file.name : '點此選擇 CSV 檔'}</span>
        {file && (
          <span className="num text-xs text-bark-soft">{(file.size / 1024).toFixed(1)} KB</span>
        )}
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
        />
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-blush/40 bg-blush-soft/40 p-3 text-sm text-blush-dark">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {busy === 'dry' && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-bark-soft">
          <Spinner size={18} /> 正在預檢…
        </div>
      )}

      {dryRunResult && !importResult && (
        <ResultCard title="預檢結果" subtitle="尚未寫入,請確認後再正式匯入" result={dryRunResult} />
      )}

      {dryRunResult && !importResult && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-xl border border-bark-faded/30 py-2 text-sm font-semibold text-bark-soft"
          >
            取消
          </button>
          <button
            type="button"
            onClick={runImport}
            disabled={busy !== null || dryRunResult.imported === 0}
            className="flex-1 rounded-xl bg-terracotta py-2 text-sm font-semibold text-cream shadow-fab disabled:opacity-50"
          >
            {busy === 'real' ? '匯入中…' : `確認匯入 ${dryRunResult.imported} 筆`}
          </button>
        </div>
      )}

      {importResult && (
        <>
          <ResultCard
            title="匯入完成"
            subtitle={`已寫入 ${importResult.imported} 筆`}
            result={importResult}
            success
          />
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-xl border border-bark-faded/30 py-2 text-sm font-semibold text-bark-soft"
          >
            再匯入一份
          </button>
        </>
      )}
    </div>
  );
}

function ResultCard({
  title,
  subtitle,
  result,
  success = false,
}: {
  title: string;
  subtitle: string;
  result: CsvImportResult;
  success?: boolean;
}) {
  return (
    <div className="paper-card space-y-3 p-4">
      <div className="flex items-center gap-2">
        {success ? (
          <CheckCircle2 size={18} className="text-sage-dark" />
        ) : (
          <FileText size={18} className="text-mustard-dark" />
        )}
        <div>
          <p className="serif text-base font-semibold text-bark">{title}</p>
          <p className="text-xs text-bark-soft">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Cell label="成功" value={result.imported} accent="sage" />
        <Cell label="跳過" value={result.skipped} accent="mustard" />
        <Cell label="錯誤" value={result.errors.length} accent="blush" />
      </div>
      {result.errors.length > 0 && (
        <details className="rounded-xl border border-bark-faded/20 bg-cream/40 p-2 text-xs">
          <summary className="cursor-pointer text-bark-soft">
            錯誤列表 ({result.errors.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {result.errors.map((e, i) => (
              <li key={i} className="rounded bg-blush-soft/30 px-2 py-1 text-blush-dark">
                <span className="num">列 {e.row}</span>: {e.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'sage' | 'mustard' | 'blush';
}) {
  const cls =
    accent === 'sage'
      ? 'bg-status-unlocked text-sage-dark'
      : accent === 'mustard'
        ? 'bg-status-trying text-mustard-dark'
        : 'bg-status-allergic text-blush-dark';
  return (
    <div className={`rounded-2xl border border-bark-faded/15 p-2 ${cls}`}>
      <div className="num text-2xl">{value}</div>
      <div className="text-[11px] opacity-80">{label}</div>
    </div>
  );
}
