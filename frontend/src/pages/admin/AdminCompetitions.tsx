import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

type CompetitionStatus =
  | 'draft'
  | 'not_started'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'ended'
  | 'cancelled';

type Competition = {
  id: number;
  title: string;
  type: string;
  status: CompetitionStatus;
  registrationStart: string;
  registrationEnd: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
};

function statusText(s: CompetitionStatus) {
  const map: Record<CompetitionStatus, string> = {
    draft: '草稿',
    not_started: '未开始',
    registration_open: '报名中',
    registration_closed: '报名已结束',
    in_progress: '进行中',
    ended: '已结束',
    cancelled: '已取消',
  };
  return map[s] ?? s;
}

function statusBadgeClass(s: CompetitionStatus) {
  const map: Partial<Record<CompetitionStatus, string>> = {
    draft: 'bg-gray-100 text-gray-800',
    registration_open: 'bg-green-100 text-green-800',
    registration_closed: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    ended: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return map[s] ?? 'bg-gray-100 text-gray-800';
}

type FormState = {
  id?: number;
  title: string;
  description?: string;
  type: string;
  startTime: string; // datetime-local
  endTime: string; // datetime-local
  registrationStart: string; // datetime-local
  registrationEnd: string; // datetime-local
  maxParticipants: number;
  status: CompetitionStatus;
};

const emptyForm: FormState = {
  title: '',
  description: '',
  type: '其他',
  startTime: '',
  endTime: '',
  registrationStart: '',
  registrationEnd: '',
  maxParticipants: 0,
  status: 'draft',
};

function toDatetimeLocal(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminCompetitions() {
  const [items, setItems] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | CompetitionStatus>('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const params = useMemo(() => {
    const p: any = { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' };
    if (q.trim()) p.search = q.trim();
    if (status) p.status = status;
    return p;
  }, [q, status]);

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/competitions', { params });
      setItems(res.data.data.competitions);
    } catch (e: any) {
      setError(e.response?.data?.message || '获取竞赛列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const openCreate = () => {
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = async (id: number) => {
    setError('');
    try {
      const res = await api.get(`/competitions/${id}`);
      const c = res.data.data;
      setForm({
        id: c.id,
        title: c.title,
        description: c.description || '',
        type: c.type || '其他',
        startTime: toDatetimeLocal(c.startTime),
        endTime: toDatetimeLocal(c.endTime),
        registrationStart: toDatetimeLocal(c.registrationStart),
        registrationEnd: toDatetimeLocal(c.registrationEnd),
        maxParticipants: c.maxParticipants || 0,
        status: c.status || 'draft',
      });
      setShowForm(true);
    } catch (e: any) {
      setError(e.response?.data?.message || '获取竞赛详情失败');
    }
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        registrationStart: new Date(form.registrationStart).toISOString(),
        registrationEnd: new Date(form.registrationEnd).toISOString(),
        maxParticipants: Number(form.maxParticipants) || 0,
        status: form.status,
      };

      if (form.id) {
        await api.put(`/competitions/${form.id}`, payload);
      } else {
        await api.post('/competitions', payload);
      }
      setShowForm(false);
      await fetchList();
    } catch (e: any) {
      setError(e.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('确定删除该竞赛吗？此操作不可撤销。')) return;
    setError('');
    try {
      await api.delete(`/competitions/${id}`);
      await fetchList();
    } catch (e: any) {
      setError(e.response?.data?.message || '删除失败');
    }
  };

  const publish = async (id: number) => {
    if (!confirm('确定发布该竞赛并开启报名吗？')) return;
    setError('');
    try {
      await api.put(`/competitions/${id}`, { status: 'registration_open' });
      await fetchList();
    } catch (e: any) {
      setError(e.response?.data?.message || '发布失败');
    }
  };

  const unpublish = async (id: number) => {
    if (!confirm('确定撤回为草稿吗？')) return;
    setError('');
    try {
      await api.put(`/competitions/${id}`, { status: 'draft' });
      await fetchList();
    } catch (e: any) {
      setError(e.response?.data?.message || '操作失败');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">竞赛管理</h2>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          新建竞赛
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-800">{error}</div>
      )}

      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          placeholder="搜索竞赛（标题/描述）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="registration_open">报名中</option>
          <option value="registration_closed">报名已结束</option>
          <option value="in_progress">进行中</option>
          <option value="ended">已结束</option>
          <option value="cancelled">已取消</option>
        </select>
        <button
          onClick={fetchList}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          刷新
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无竞赛</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">报名时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">人数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{c.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{c.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${statusBadgeClass(c.status)}`}>
                      {statusText(c.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>{new Date(c.registrationStart).toLocaleString('zh-CN')}</div>
                    <div className="text-gray-400">至 {new Date(c.registrationEnd).toLocaleString('zh-CN')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {c.currentParticipants}
                    {c.maxParticipants > 0 ? ` / ${c.maxParticipants}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => openEdit(c.id)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      编辑
                    </button>
                    {c.status === 'draft' ? (
                      <button
                        onClick={() => publish(c.id)}
                        className="text-green-600 hover:text-green-800 mr-3"
                      >
                        发布
                      </button>
                    ) : (
                      <button
                        onClick={() => unpublish(c.id)}
                        className="text-yellow-700 hover:text-yellow-900 mr-3"
                      >
                        撤回
                      </button>
                    )}
                    <button
                      onClick={() => remove(c.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{form.id ? '编辑竞赛' : '新建竞赛'}</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                关闭
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">竞赛名称 *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">类型</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="学术">学术</option>
                  <option value="体育">体育</option>
                  <option value="艺术">艺术</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">状态</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as CompetitionStatus })}
                >
                  <option value="draft">草稿</option>
                  <option value="registration_open">报名中</option>
                  <option value="registration_closed">报名已结束</option>
                  <option value="in_progress">进行中</option>
                  <option value="ended">已结束</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">报名开始 *</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.registrationStart}
                  onChange={(e) => setForm({ ...form, registrationStart: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">报名结束 *</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.registrationEnd}
                  onChange={(e) => setForm({ ...form, registrationEnd: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">竞赛开始 *</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">竞赛结束 *</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">人数上限（0=不限）</label>
                <input
                  type="number"
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={form.maxParticipants}
                  onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">描述</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                取消
              </button>
              <button
                onClick={save}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={saving || !form.title || !form.startTime || !form.endTime || !form.registrationStart || !form.registrationEnd}
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
