import { useState, useEffect } from 'react';
import api from '../../utils/api';

interface Registration {
  id: number;
  status: string;
  createdAt: string;
  competition: {
    id: number;
    title: string;
    type: string;
  };
}

export default function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await api.get('/registrations/my');
      setRegistrations(response.data.data.registrations);
    } catch (error) {
      console.error('获取报名记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const openUpload = (id: number) => {
    setUploadingId(id);
    setFiles(null);
  };

  const submitUpload = async () => {
    if (!uploadingId) return;
    if (!files || files.length === 0) {
      alert('请先选择文件');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('files', f));
      await api.post(`/registrations/${uploadingId}/materials`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('材料上传成功');
      setUploadingId(null);
    } catch (e: any) {
      alert(e.response?.data?.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">我的报名</h1>
      {registrations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无报名记录</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">竞赛名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">报名时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">材料</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {registrations.map((registration) => (
                <tr key={registration.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <a href={`/competitions/${registration.competition.id}`} className="text-blue-600 hover:text-blue-800">
                      {registration.competition.title}
                    </a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {registration.competition.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(registration.status)}`}>
                      {getStatusText(registration.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(registration.createdAt).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => openUpload(registration.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      上传材料
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {uploadingId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">上传参赛材料</h3>
              <button onClick={() => setUploadingId(null)} className="text-gray-500 hover:text-gray-700">
                关闭
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFiles(e.target.files)}
              />
              <p className="text-xs text-gray-500">
                支持：pdf / word / ppt / zip / 图片；可多选（最多20个）。
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setUploadingId(null)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={uploading}
              >
                取消
              </button>
              <button
                onClick={submitUpload}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={uploading}
              >
                {uploading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
