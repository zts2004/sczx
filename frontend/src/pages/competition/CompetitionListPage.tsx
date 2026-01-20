import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

interface Competition {
  id: number;
  title: string;
  description: string;
  type: string;
  coverImage?: string;
  startTime: string;
  endTime: string;
  registrationStart: string;
  registrationEnd: string;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
}

export default function CompetitionListPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchCompetitions();
  }, [search, type, status]);

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (type) params.type = type;
      if (status) params.status = status;

      const response = await api.get('/competitions', { params });
      setCompetitions(response.data.data.competitions);
    } catch (error) {
      console.error('获取竞赛列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      not_started: '未开始',
      registration_open: '报名中',
      registration_closed: '报名已结束',
      in_progress: '进行中',
      ended: '已结束',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      registration_open: 'bg-green-100 text-green-800',
      registration_closed: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      ended: 'bg-gray-100 text-gray-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">竞赛列表</h1>

      {/* 搜索和筛选 */}
      <div className="mb-6 space-y-4 md:flex md:space-y-0 md:space-x-4">
        <input
          type="text"
          placeholder="搜索竞赛..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">全部类型</option>
          <option value="学术">学术</option>
          <option value="体育">体育</option>
          <option value="艺术">艺术</option>
          <option value="其他">其他</option>
        </select>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value="registration_open">报名中</option>
          <option value="registration_closed">报名已结束</option>
          <option value="in_progress">进行中</option>
          <option value="ended">已结束</option>
        </select>
      </div>

      {/* 竞赛列表 */}
      {loading ? (
        <div className="text-center py-12">加载中...</div>
      ) : competitions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无竞赛</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((competition) => (
            <Link
              key={competition.id}
              to={`/competitions/${competition.id}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {competition.coverImage && (
                <img
                  src={competition.coverImage}
                  alt={competition.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{competition.type}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(competition.status)}`}>
                    {getStatusText(competition.status)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{competition.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {competition.description}
                </p>
                <div className="text-sm text-gray-500">
                  <p>报名人数: {competition.currentParticipants}
                    {competition.maxParticipants > 0 && ` / ${competition.maxParticipants}`}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
