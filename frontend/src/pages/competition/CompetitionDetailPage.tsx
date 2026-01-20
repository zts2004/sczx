import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

export default function CompetitionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    fetchCompetition();
  }, [id]);

  const fetchCompetition = async () => {
    try {
      const response = await api.get(`/competitions/${id}`);
      setCompetition(response.data.data);
    } catch (error) {
      console.error('获取竞赛详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setRegistering(true);
    try {
      await api.post('/registrations', {
        competitionId: parseInt(id!),
      });
      alert('报名成功！');
      fetchCompetition();
    } catch (error: any) {
      alert(error.response?.data?.message || '报名失败');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (!competition) {
    return <div className="text-center py-12">竞赛不存在</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {competition.coverImage && (
        <img
          src={competition.coverImage}
          alt={competition.title}
          className="w-full h-64 object-cover rounded-lg mb-6"
        />
      )}
      <h1 className="text-3xl font-bold mb-4">{competition.title}</h1>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-gray-500 text-sm">竞赛类型</p>
            <p className="font-medium">{competition.type}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">报名人数</p>
            <p className="font-medium">
              {competition.currentParticipants}
              {competition.maxParticipants > 0 && ` / ${competition.maxParticipants}`}
            </p>
          </div>
        </div>
        {competition.description && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">竞赛描述</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{competition.description}</p>
          </div>
        )}
        {competition.rules && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">竞赛规则</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{competition.rules}</p>
          </div>
        )}
      </div>
      {user && (
        <div className="text-center">
          <button
            onClick={handleRegister}
            disabled={registering}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {registering ? '报名中...' : '立即报名'}
          </button>
        </div>
      )}
    </div>
  );
}
