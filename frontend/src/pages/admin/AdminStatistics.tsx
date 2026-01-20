import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AdminStatistics() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/admin/statistics');
      setStats(response.data.data);
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12">暂无数据</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">统计概览</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm mb-2">总用户数</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm mb-2">总竞赛数</h3>
          <p className="text-3xl font-bold text-green-600">{stats.totalCompetitions}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm mb-2">总报名数</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalRegistrations}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-500 text-sm mb-2">总获奖数</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.totalAwards}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">获奖级别分布</h3>
          <div className="space-y-2">
            {stats.awardsByLevel?.map((item: any) => (
              <div key={item.awardLevel} className="flex justify-between">
                <span>{item.awardLevel === 'school' ? '校级' : item.awardLevel === 'provincial' ? '省级' : item.awardLevel === 'national' ? '国家级' : '院级'}</span>
                <span className="font-semibold">{item._count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">报名状态分布</h3>
          <div className="space-y-2">
            {stats.registrationsByStatus?.map((item: any) => (
              <div key={item.status} className="flex justify-between">
                <span>{item.status === 'pending' ? '待审核' : item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已拒绝' : '已取消'}</span>
                <span className="font-semibold">{item._count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
