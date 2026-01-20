import { Link } from 'react-router-dom';
import { Trophy, Users, Calendar, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="px-4 py-8">
      {/* 英雄区域 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          民航安全工程学院竞赛报名系统
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          便捷的竞赛报名与管理平台
        </p>
        <Link
          to="/competitions"
          className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          查看竞赛
          <ArrowRight className="ml-2 w-5 h-5" />
        </Link>
      </div>

      {/* 功能特性 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">竞赛管理</h3>
          <p className="text-gray-600">
            浏览各类竞赛，查看详细信息，轻松报名参加
          </p>
        </div>
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <Users className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">在线报名</h3>
          <p className="text-gray-600">
            在线提交报名信息，实时查看报名状态
          </p>
        </div>
        <div className="text-center p-6 bg-white rounded-lg shadow">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">获奖管理</h3>
          <p className="text-gray-600">
            上传获奖证书，管理个人获奖记录
          </p>
        </div>
      </div>
    </div>
  );
}
