import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AdminCompetitions from './AdminCompetitions';
import AdminRegistrations from './AdminRegistrations';
import AdminAwards from './AdminAwards';
import AdminStatistics from './AdminStatistics';
import AdminUsers from './AdminUsers';

export default function AdminDashboard() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">管理后台</h1>
      
      {/* 导航标签 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <Link
            to="/admin"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              isActive('/admin') && location.pathname === '/admin'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            统计概览
          </Link>
          <Link
            to="/admin/competitions"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              isActive('/admin/competitions')
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            竞赛管理
          </Link>
          <Link
            to="/admin/registrations"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              isActive('/admin/registrations')
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            报名管理
          </Link>
          <Link
            to="/admin/awards"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              isActive('/admin/awards')
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            获奖管理
          </Link>
          <Link
            to="/admin/users"
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              isActive('/admin/users')
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            用户管理
          </Link>
        </nav>
      </div>

      {/* 路由内容 */}
      <Routes>
        <Route index element={<AdminStatistics />} />
        <Route path="competitions" element={<AdminCompetitions />} />
        <Route path="registrations" element={<AdminRegistrations />} />
        <Route path="awards" element={<AdminAwards />} />
        <Route path="users" element={<AdminUsers />} />
      </Routes>
    </div>
  );
}
