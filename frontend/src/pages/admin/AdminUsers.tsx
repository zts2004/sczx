import { useEffect, useMemo, useState } from 'react';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';

type Role = 'user' | 'admin' | 'super_admin';

type UserRow = {
  id: number;
  username: string;
  studentId?: string | null;
  email: string;
  realName?: string | null;
  phone?: string | null;
  role: Role;
  status: string;
  createdAt: string;
};

function roleText(r: Role) {
  return r === 'user' ? '普通用户' : r === 'admin' ? '管理员' : '超级管理员';
}

export default function AdminUsers() {
  const { user: actor } = useAuthStore();
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'' | Role>('');

  const params = useMemo(() => {
    const p: any = { page: 1, limit: 50 };
    if (search.trim()) p.search = search.trim();
    if (role) p.role = role;
    return p;
  }, [search, role]);

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/users', { params });
      setItems(res.data.data.users);
    } catch (e: any) {
      setError(e.response?.data?.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setUserRole = async (id: number, newRole: Role) => {
    setError('');
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole });
      await fetchList();
    } catch (e: any) {
      setError(e.response?.data?.message || '更新角色失败');
    }
  };

  const canSetSuperAdmin = actor?.role === 'super_admin';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">用户管理</h2>
      </div>

      {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-800">{error}</div>}

      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <input
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
          placeholder="搜索（用户名/邮箱/姓名/学号）"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-3 py-2 border border-gray-300 rounded-md"
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          <option value="">全部角色</option>
          <option value="user">普通用户</option>
          <option value="admin">管理员</option>
          <option value="super_admin">超级管理员</option>
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
        <div className="text-center py-12 text-gray-500">暂无用户</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">学号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium">{u.realName || u.username}</div>
                    <div className="text-xs text-gray-500">ID: {u.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.studentId || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{roleText(u.role)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {u.role === 'user' ? (
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => setUserRole(u.id, 'admin')}
                      >
                        设为管理员
                      </button>
                    ) : u.role === 'admin' ? (
                      <button
                        className="text-yellow-700 hover:text-yellow-900"
                        onClick={() => setUserRole(u.id, 'user')}
                      >
                        取消管理员
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                    {canSetSuperAdmin && u.role !== 'super_admin' ? (
                      <button
                        className="ml-3 text-purple-700 hover:text-purple-900"
                        onClick={() => setUserRole(u.id, 'super_admin')}
                      >
                        设为超级管理员
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        - **管理员**：只能把普通用户设为管理员/取消管理员；不能授予超级管理员，也不能修改超级管理员账号。<br />
        - **超级管理员**：可将用户设为超级管理员。
      </div>
    </div>
  );
}

