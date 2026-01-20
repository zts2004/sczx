import { useState, useEffect } from 'react';
import api from '../../utils/api';

interface Award {
  id: number;
  awardLevel: string;
  awardName: string;
  awardRank?: string;
  awardTime: string;
  certificateImage?: string;
  status: string;
  competition?: {
    id: number;
    title: string;
  };
}

export default function MyAwardsPage() {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    competitionId: '',
    awardLevel: 'school',
    awardName: '',
    awardRank: '',
    awardTime: '',
    description: '',
  });
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  useEffect(() => {
    fetchAwards();
  }, []);

  const fetchAwards = async () => {
    try {
      const response = await api.get('/awards/my');
      setAwards(response.data.data.awards);
    } catch (error) {
      console.error('获取获奖记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!certificateFile) {
        alert('请先选择证书图片文件');
        return;
      }

      setUploading(true);
      const fd = new FormData();
      fd.append('awardLevel', formData.awardLevel);
      fd.append('awardName', formData.awardName);
      if (formData.awardRank) fd.append('awardRank', formData.awardRank);
      fd.append('awardTime', new Date(formData.awardTime).toISOString());
      if (formData.description) fd.append('description', formData.description);
      if (formData.competitionId) fd.append('competitionId', formData.competitionId);
      fd.append('certificate', certificateFile);

      await api.post('/awards', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert('获奖记录提交成功，等待审核');
      setShowUpload(false);
      setFormData({
        competitionId: '',
        awardLevel: 'school',
        awardName: '',
        awardRank: '',
        awardTime: '',
        description: '',
      });
      setCertificateFile(null);
      fetchAwards();
    } catch (error: any) {
      alert(error.response?.data?.message || '提交失败');
    } finally {
      setUploading(false);
    }
  };

  const getLevelText = (level: string) => {
    const levelMap: Record<string, string> = {
      school: '校级',
      provincial: '省级',
      national: '国家级',
      college: '院级',
    };
    return levelMap[level] || level;
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return statusMap[status] || status;
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  return (
    <div className="px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">我的获奖</h1>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showUpload ? '取消' : '上传获奖'}
        </button>
      </div>

      {showUpload && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">上传获奖证书</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">获奖级别 *</label>
              <select
                required
                value={formData.awardLevel}
                onChange={(e) => setFormData({ ...formData, awardLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="school">校级</option>
                <option value="provincial">省级</option>
                <option value="national">国家级</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">获奖名称 *</label>
              <input
                type="text"
                required
                value={formData.awardName}
                onChange={(e) => setFormData({ ...formData, awardName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">获奖等级</label>
              <input
                type="text"
                value={formData.awardRank}
                onChange={(e) => setFormData({ ...formData, awardRank: e.target.value })}
                placeholder="如：一等奖"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">获奖时间 *</label>
              <input
                type="date"
                required
                value={formData.awardTime}
                onChange={(e) => setFormData({ ...formData, awardTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">证书图片文件 *</label>
              <input
                required
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">支持 jpg/png/webp，默认不超过 5MB</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {uploading ? '上传中...' : '提交'}
          </button>
        </form>
      )}

      {awards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无获奖记录</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {awards.map((award) => (
            <div key={award.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {award.certificateImage && (
                <img
                  src={award.certificateImage.startsWith('/uploads') ? `${window.location.origin}${award.certificateImage}` : award.certificateImage}
                  alt={award.awardName}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-600">
                    {getLevelText(award.awardLevel)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    award.status === 'approved' ? 'bg-green-100 text-green-800' :
                    award.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {getStatusText(award.status)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{award.awardName}</h3>
                {award.awardRank && (
                  <p className="text-sm text-gray-600 mb-2">等级: {award.awardRank}</p>
                )}
                <p className="text-sm text-gray-500">
                  {new Date(award.awardTime).toLocaleDateString('zh-CN')}
                </p>
                {award.competition && (
                  <p className="text-sm text-gray-500 mt-2">
                    竞赛: {award.competition.title}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
