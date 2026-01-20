import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type Registration = {
  id: number;
  status: RegistrationStatus;
  createdAt: string;
  reviewNotes?: string | null;
  user: {
    id: number;
    username: string;
    realName?: string | null;
    email: string;
    phone?: string | null;
  };
};

type Competition = { id: number; title: string };

export default function AdminRegistrations() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [competitionId, setCompetitionId] = useState<number | ''>('');
  const [status, setStatus] = useState<'' | RegistrationStatus>('');
  const [items, setItems] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const listParams = useMemo(() => {
    const p: any = { page: 1, limit: 50 };
    if (status) p.status = status;
    return p;
  }, [status]);

  const fetchCompetitions = async () => {
    try {
      // 拉取最近 100 个竞赛供选择
      const res = await api.get('/competitions', {
        params: { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' },
      });
      const cs = res.data.data.competitions as any[];
      setCompetitions(cs.map((c) => ({ id: c.id, title: c.title })));
    } catch (e: any) {
      setError(e.response?.data?.message || '获取竞赛列表失败');
    }
  };

  const fetchRegistrations = async () => {
    if (!competitionId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/admin/registrations/competition/${competitionId}`, {
        params: listParams,
      });
      setItems(res.data.data.registrations);
    } catch (e: any) {
      setError(e.response?.data?.message || '获取报名列表失败');
    } finally {
      setLoading(false);
    }
  };

  const exportZip = () => {
    if (!competitionId) return;
    // 触发浏览器下载
    window.open(`/api/admin/export/competition/${competitionId}/materials.zip`, '_blank');
  };

  useEffect(() => {
    fetchCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId, listParams]);

  const openReview = (id: number) => {
    setReviewingId(id);
    setReviewStatus('approved');
    setReviewNotes('');
  };

  const submitReview = async () => {
    if (!reviewingId) return;
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/admin/registrations/${reviewingId}/review`, {
        status: reviewStatus,
        reviewNotes: reviewNotes || undefined,
      });
      setReviewingId(null);
      await fetchRegistrations();
    } catch (e: any) {
      setError(e.response?.data?.message || '审核失败');
    } finally {
      setSubmitting(false);
    }
  };

  const statusText = (s: RegistrationStatus) => {
    const map: Record<RegistrationStatus, string> = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      cancelled: '已取消',
    };
    return map[s] || s;
  };

  const statusBadge = (s: RegistrationStatus) => {
    const map: Record<RegistrationStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return map[s] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">报名管理</h2>
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-800">{error}</div>}

      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <select
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          value={competitionId}
          onChange={(e) => setCompetitionId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">请选择竞赛</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        <select
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
          <option value="cancelled">已取消</option>
        </select>

        <button
          onClick={fetchRegistrations}
          disabled={!competitionId}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          刷新
        </button>

        <button
          onClick={exportZip}
          disabled={!competitionId}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          导出材料ZIP
        </button>
      </div>

      {!competitionId ? (
        <div className="text-gray-500">先选择一个竞赛，才能查看报名列表。</div>
      ) : loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无报名记录</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">报名时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{r.user.realName || r.user.username}</div>
                    <div className="text-xs text-gray-500">{r.user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.user.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${statusBadge(r.status)}`}>
                      {statusText(r.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(r.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {r.status === 'pending' ? (
                      <button
                        onClick={() => openReview(r.id)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        审核
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewingId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">审核报名</h3>
              <button onClick={() => setReviewingId(null)} className="text-gray-500 hover:text-gray-700">
                关闭
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">审核结果 *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                >
                  <option value="approved">通过</option>
                  <option value="rejected">拒绝</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">备注</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="可选：填写审核备注"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setReviewingId(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={submitReview}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? '提交中...' : '提交审核'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
