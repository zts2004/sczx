import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import CompetitionListPage from './pages/competition/CompetitionListPage';
import CompetitionDetailPage from './pages/competition/CompetitionDetailPage';
import ProfilePage from './pages/user/ProfilePage';
import MyRegistrationsPage from './pages/registration/MyRegistrationsPage';
import MyAwardsPage from './pages/award/MyAwardsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import HomePage from './pages/HomePage';

function App() {
  const { user } = useAuthStore();

  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* 需要布局的路由 */}
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/competitions" element={<CompetitionListPage />} />
        <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
        
        {/* 需要登录的路由 */}
        {user && (
          <>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-registrations" element={<MyRegistrationsPage />} />
            <Route path="/my-awards" element={<MyAwardsPage />} />
          </>
        )}
        
        {/* 需要管理员权限的路由 */}
        {user && (user.role === 'admin' || user.role === 'super_admin') && (
          <Route path="/admin/*" element={<AdminDashboard />} />
        )}
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
