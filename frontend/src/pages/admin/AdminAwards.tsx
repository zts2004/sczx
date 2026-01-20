import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';

type AwardStatus = 'pending' | 'approved' | 'rejected';
type AwardLevel = 'school' | 'provincial' | 'national' | 'college';

type Award = {
  id: number;
  awardLevel: AwardLevel;
  awardName: string;
  awardRank?: string | null;
  awardTime: string;
  certificateImage?: string | null;
  certificateNumber?: string | null;
  status: AwardStatus;
  user: { id: number; username: string; realName?: string | null };
  competition?: { id: number; title: string } | null;
  reviewNotes?: string | null;
};

function levelText(l: AwardLevel) {
  return l === 'school' ? '校级' : l === 'provincial' ? '省级' : l === 'national' ? '国家级' : '院级';
}

function statusText(s: AwardStatus) {
  return s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : '已拒绝';
}

export default function AdminAwards() {
  const [items, setItems] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [awardLevel, setAwardLevel] = useState<'' | AwardLevel>('');
  const [status, setStatus] = useState<'' | AwardStatus>('');

  const [reviewing, setReviewing] = useState<Award | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [issuing, setIssuing] = useState(false);
  const [issueForm, setIssueForm] = useState({
    userId: '',
    competitionId: '',
    awardName: '',
    awardRank: '',
    awardTime: '',
    certificateImage: '',
    description: '',
  });

  const params = useMemo(() => {
    const p: any = { page: 1, limit: 50 };
    if (awardLevel) p.awardLevel = awardLevel;
    if (status) p.status = status;
    return p;
  }, [awardLevel, status]);

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/awards', { params });
      setItems(res.data.data.awards);
    } catch (e: any) {
      setError(e.response?.data?.message || '获取获奖列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const openReview = (a: Award) => {
    setReviewing(a);
    setReviewStatus('approved');
    setReviewNotes('');
  };

  const submitReview = async () => {
    if (!reviewing) return;
    setSubmitting(true);
    setError('');
    try {
      await api.put(`/admin/awards/${reviewing.id}/review`, {
        status: reviewStatus,
        reviewNotes: reviewNotes || undefined,
      });
      setReviewing(null);
      await fetchList();
    } catch (e: any) {
      setError(e.response?.data?.message || '审核失败');
    } finally {
      setSubmitting(false);
    }
  };

  const submitIssue = async () => {
    setSubmitting(true);
    setError('');
    try {
      if (!issueForm.userId || !issueForm.awardName || !issueForm.awardTime || !issueForm.certificateImage) {
        setError('用户ID、证书名称、获奖时间、证书图片URL 为必填项');
        return;
      }
      await api.post('/admin/awards/certificate', {
        userId: Number(issueForm.userId),
        competitionId: issueForm.competitionId ? Number(issueForm.competitionId) : undefined,
        awardName: issueForm.awardName,
        awardRank: issueForm.awardRank || undefined,
        awardTime: new Date(issueForm.awardTime).toISOString(),
        certificateImage: issueForm.certificateImage,
        description: issueForm.description || undefined,
      });
      setIssuing(false);
      setIssueForm({
        userId: '',
        competitionId: '',
        awardName: '',
        awardRank: '',
        awardTime: '',
        certificateImage: '',
        description: '',
      });
      await fetchList();
    } catch (e: any) {
      setError(e.response?.data?.message || '发放失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">获奖管理</h2>
        <button
          onClick={() => setIssuing(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          发放院级证书
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-800">{error}</div>}

      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <select
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={awardLevel}
          onChange={(e) => setAwardLevel(e.target.value as any)}
        >
          <option value="">全部级别</option>
          <option value="school">校级</option>
          <option value="provincial">省级</option>
          <option value="national">国家级</option>
          <option value="college">院级</option>
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
        </select>
        <button onClick={fetchList} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
          刷新
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无获奖记录</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">级别</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">证书</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{a.user.realName || a.user.username}</div>
                    <div className="text-xs text-gray-500">ID: {a.user.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{levelText(a.awardLevel)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{a.awardName}</div>
                    <div className="text-xs text-gray-500">{new Date(a.awardTime).toLocaleDateString('zh-CN')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{statusText(a.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {a.certificateImage ? (
                      <a
                        className="text-blue-600 hover:text-blue-800"
                        href={a.certificateImage.startsWith('/uploads') ? `${window.location.origin}${a.certificateImage}` : a.certificateImage}
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                    {a.certificateNumber ? <div className="text-xs text-gray-500">{a.certificateNumber}</div> : null}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {a.status === 'pending' && a.awardLevel !== 'college' ? (
                      <button onClick={() => openReview(a)} className="text-blue-600 hover:text-blue-800">
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

      {reviewing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">审核获奖</h3>
              <button onClick={() => setReviewing(null)} className="text-gray-500 hover:text-gray-700">
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
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setReviewing(null)}
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

      {issuing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">发放院级证书</h3>
              <button onClick={() => setIssuing(false)} className="text-gray-500 hover:text-gray-700">
                关闭
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">用户ID *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={issueForm.userId}
                  onChange={(e) => setIssueForm({ ...issueForm, userId: e.target.value })}
                  placeholder="例如：1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">竞赛ID（可选）</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={issueForm.competitionId}
                  onChange={(e) => setIssueForm({ ...issueForm, competitionId: e.target.value })}
                  placeholder="例如：10"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">证书名称 *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={issueForm.awardName}
                  onChange={(e) => setIssueForm({ ...issueForm, awardName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">获奖等级</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={issueForm.awardRank}
                  onChange={(e) => setIssueForm({ ...issueForm, awardRank: e.target.value })}
                  placeholder="如：一等奖"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">获奖时间 *</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={issueForm.awardTime}
                  onChange={(e) => setIssueForm({ ...issueForm, awardTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">证书图片URL *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={issueForm.certificateImage}
                  onChange={(e) => setIssueForm({ ...issueForm, certificateImage: e.target.value })}
                  placeholder="可填 /uploads/... 或完整 URL"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">描述</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={issueForm.description}
                  onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIssuing(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={submitting}
              >
                取消
              </button>
              <button
                onClick={submitIssue}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? '提交中...' : '发放'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
