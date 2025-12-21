import React, { useState } from 'react';
import MoonClock from './MoonClock';
import PreciseMoonClock from './PreciseMoonClock';

function App() {
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' 또는 'precise'

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 탭 메뉴 */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-4 font-semibold transition-colors ${activeTab === 'basic'
                  ? 'text-white border-b-2 border-blue-500 bg-slate-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                }`}
            >
              🌙 기본 Moon Clock
            </button>
            <button
              onClick={() => setActiveTab('precise')}
              className={`px-6 py-4 font-semibold transition-colors ${activeTab === 'precise'
                  ? 'text-white border-b-2 border-yellow-500 bg-slate-700/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                }`}
            >
              🔭 정밀 천문 계산
            </button>
          </div>
        </div>
      </div>

      {/* 컴포넌트 렌더링 */}
      {activeTab === 'basic' ? <MoonClock /> : <PreciseMoonClock />}
    </div>
  );
}

export default App;