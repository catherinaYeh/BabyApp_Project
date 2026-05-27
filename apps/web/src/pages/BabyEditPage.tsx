import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBabies, useCreateBaby, useUpdateBaby } from '@/lib/hooks';
import { useAppStore } from '@/lib/store';
import { ApiError } from '@/lib/api/client';

const AVATAR_COLORS = [
  '#FFB7B7',
  '#FFD580',
  '#FFE49A',
  '#A8E6CF',
  '#A0E7E5',
  '#B5D0FF',
  '#D7B3FF',
  '#FFC8DD',
];

export function BabyEditPage() {
  const { babyId } = useParams<{ babyId?: string }>();
  const isEdit = !!babyId;
  const navigate = useNavigate();
  const { data: babies } = useBabies();
  const existing = isEdit ? babies?.data?.find((b) => b.id === babyId) : undefined;

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setBirthDate(existing.birthDate);
      setAvatarColor(existing.avatarColor);
    }
  }, [existing]);

  const create = useCreateBaby();
  const update = useUpdateBaby(babyId ?? '');
  const setActive = useAppStore((s) => s.setActiveBabyId);
  const pending = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && babyId) {
        await update.mutateAsync({ name, birthDate, avatarColor });
      } else {
        const baby = await create.mutateAsync({ name, birthDate, avatarColor });
        setActive(baby.id);
      }
      navigate('/babies');
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.problem.errors?.[0]?.message ?? err.problem.detail ?? err.problem.title;
        setError(msg);
      } else {
        setError(String(err));
      }
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{isEdit ? '編輯寶寶' : '新增寶寶'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <label className="block">
          <span className="text-sm text-slate-600">姓名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">出生日期</span>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            required
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none"
          />
        </label>
        <fieldset>
          <legend className="text-sm text-slate-600">頭像顏色</legend>
          <div className="mt-2 grid grid-cols-8 gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAvatarColor(c)}
                aria-label={`color ${c}`}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  avatarColor === c ? 'border-brand scale-110' : 'border-white'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-700"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-xl bg-brand py-2 text-sm font-semibold text-white shadow disabled:opacity-50"
          >
            {pending ? '處理中…' : '儲存'}
          </button>
        </div>
      </form>
    </div>
  );
}
