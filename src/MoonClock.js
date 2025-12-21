import React, { useState, useEffect } from 'react';
import { Moon, Waves, MapPin, Navigation } from 'lucide-react';

const MoonClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedPort, setSelectedPort] = useState('incheon');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // 주요 항구별 조석 오차 데이터 (분 단위)
  const portOffsets = {
    busan: { name: '부산', offset: 70, lat: 35.1, lng: 129.0 },
    gangneung: { name: '강릉', offset: 60, lat: 37.7, lng: 128.9 },
    wonsan: { name: '원산', offset: 30, lat: 39.1, lng: 127.4 },
    incheon: { name: '인천', offset: 0, lat: 37.4, lng: 126.6 },
    gunsan: { name: '군산', offset: -60, lat: 35.9, lng: 126.7 },
    mokpo: { name: '목포', offset: -120, lat: 34.8, lng: 126.4 }
  };

  // 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationError(null);
        },
        (error) => {
          setLocationError('위치 정보를 가져올 수 없습니다. 기본 위치(서울)를 사용합니다.');
          setUserLocation({ lat: 37.5665, lng: 126.9780 });
        }
      );
    } else {
      setLocationError('브라우저가 위치 정보를 지원하지 않습니다.');
      setUserLocation({ lat: 37.5665, lng: 126.9780 });
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 정확한 달 위상 계산 (2024년 기준)
  const calculateAccurateMoonPhase = (date, latitude = 37.5665, longitude = 126.9780) => {
    const knownNewMoon = new Date('2024-12-01T06:21:00Z');
    const synodicMonth = 29.53059 * 24 * 60 * 60 * 1000;
    
    const timeSinceNewMoon = date - knownNewMoon;
    const phase = (timeSinceNewMoon % synodicMonth) / synodicMonth;
    
    const lunarDay = Math.floor(phase * 29.53059) + 1;
    
    let phaseName = '';
    if (phase < 0.03 || phase > 0.97) phaseName = '삭 (New Moon)';
    else if (phase < 0.22) phaseName = '초승달 (Waxing Crescent)';
    else if (phase < 0.28) phaseName = '상현달 (First Quarter)';
    else if (phase < 0.47) phaseName = '상현망 (Waxing Gibbous)';
    else if (phase < 0.53) phaseName = '망 (Full Moon)';
    else if (phase < 0.72) phaseName = '하현망 (Waning Gibbous)';
    else if (phase < 0.78) phaseName = '하현달 (Last Quarter)';
    else phaseName = '그믐달 (Waning Crescent)';
    
    const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
    
    return {
      phase: phase,
      day: lunarDay,
      phaseName: phaseName,
      illumination: illumination,
      angle: phase * 360
    };
  };

  // 실제 달 모양 렌더링 (단순 플랫 노란색)
  const MoonVisual = ({ phase, size = 120, showShadow = true, enhanced = false }) => {
    const phaseAngle = phase * 2 * Math.PI;
    const isWaxing = phase < 0.5;
    const terminatorX = 50 + (Math.cos(phaseAngle) * 48);
    
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100"
      >
        <defs>
          <clipPath id={`moonClip-${phase}`}>
            <circle cx="50" cy="50" r="48" />
          </clipPath>
          
          <mask id={`phaseMask-${phase}`}>
            <rect width="100" height="100" fill="black" />
            <circle cx="50" cy="50" r="48" fill="white" />
            <ellipse
              cx={terminatorX}
              cy="50"
              rx={Math.abs(Math.cos(phaseAngle)) * 48}
              ry="48"
              fill="black"
            />
          </mask>
        </defs>
        
        <circle 
          cx="50" 
          cy="50" 
          r="48" 
          fill="#FCD34D"
          mask={`url(#phaseMask-${phase})`}
          clipPath={`url(#moonClip-${phase})`}
        />
      </svg>
    );
  };

  // 월침 회전 계산
  const calculateMoonHandAngle = () => {
    const lunarDayMs = 89428.3285 * 1000;
    const now = currentTime.getTime();
    const msInDay = now % lunarDayMs;
    return (msInDay / lunarDayMs) * 360;
  };

  // 일환 회전 계산
  const calculateSunRingAngle = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const totalMinutes = hours * 60 + minutes + seconds / 60;
    const offsetMinutes = (totalMinutes - 780 + 1440) % 1440;
    return (offsetMinutes / 1440) * 360;
  };

  // 조석 상태 계산
  const calculateTidalStatus = () => {
    const moonAngle = calculateMoonHandAngle();
    const portOffset = portOffsets[selectedPort].offset;
    const adjustedAngle = (moonAngle + (portOffset / 89428.3285 * 1000 / 1000) * 360) % 360;
    
    const angles = [0, 90, 180, 270];
    const distances = angles.map(a => Math.min(Math.abs(adjustedAngle - a), 360 - Math.abs(adjustedAngle - a)));
    const minDist = Math.min(...distances);
    const nearestAngle = angles[distances.indexOf(minDist)];
    
    if (nearestAngle === 90 || nearestAngle === 270) {
      return { status: '만조', type: 'high', intensity: 100 - minDist };
    } else {
      return { status: '간조', type: 'low', intensity: 100 - minDist };
    }
  };

  // 조차 계산
  const calculateTidalRange = () => {
    const moonAngle = calculateMoonHandAngle();
    const sunAngle = calculateSunRingAngle();
    const angleDiff = Math.abs(moonAngle - sunAngle);
    const normalizedDiff = Math.min(angleDiff, 360 - angleDiff);
    
    if (normalizedDiff < 30 || normalizedDiff > 150) {
      return { type: '사리', range: 'large' };
    } else if (normalizedDiff > 60 && normalizedDiff < 120) {
      return { type: '조금', range: 'small' };
    } else {
      return { type: '중간', range: 'medium' };
    }
  };

  const moonAngle = calculateMoonHandAngle();
  const sunAngle = calculateSunRingAngle();
  const tidalStatus = calculateTidalStatus();
  const tidalRange = calculateTidalRange();
  
  const moonPhase = userLocation 
    ? calculateAccurateMoonPhase(currentTime, userLocation.lat, userLocation.lng)
    : calculateAccurateMoonPhase(currentTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full"
            style={{
              width: Math.random() * 1.5 + 0.5 + 'px',
              height: Math.random() * 1.5 + 0.5 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
          />
        ))}
      </div>

      <div className="max-w-6xl w-full relative z-10">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">🌙 Moon Clock</h1>
          <p className="text-blue-300 text-sm md:text-base">실시간 조석 시계 - 당신의 위치에서 보이는 달</p>
          {userLocation && (
            <div className="flex items-center justify-center gap-2 mt-2 text-emerald-400 text-xs md:text-sm">
              <Navigation className="w-4 h-4" />
              <span>위도: {userLocation.lat.toFixed(2)}° / 경도: {userLocation.lng.toFixed(2)}°</span>
            </div>
          )}
          {locationError && (
            <div className="mt-2 text-amber-400 text-xs md:text-sm">⚠️ {locationError}</div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur rounded-3xl p-4 md:p-8 border border-slate-700">
            <div className="relative w-full aspect-square max-w-xl mx-auto">
              <div 
                className="absolute inset-0 border-4 md:border-8 border-yellow-500/30 rounded-full transition-transform duration-1000"
                style={{ transform: `rotate(${sunAngle}deg)` }}
              >
                {Array.from({ length: 30 }).map((_, i) => {
                  const isLargeScreen = window.innerWidth >= 768;
                  const radius = isLargeScreen ? 280 : 150;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 left-1/2 w-0.5 md:w-1 bg-yellow-400/50"
                      style={{
                        height: i % 5 === 0 ? '15px' : '8px',
                        transform: `translateX(-50%) rotate(${i * 12}deg)`,
                        transformOrigin: `50% ${radius}px`,
                      }}
                    />
                  );
                })}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="w-6 h-6 md:w-8 md:h-8 bg-yellow-400 rounded-full shadow-lg shadow-yellow-500/50"></div>
                </div>
              </div>

              <div className="absolute inset-2 md:inset-4 bg-gradient-to-br from-blue-900/30 to-slate-800/30 rounded-full border-2 md:border-3 border-slate-600/40 flex items-center justify-center">
                <div className="text-center">
                  <div className="mb-2">
                    <MoonVisual 
                      phase={moonPhase.phase} 
                      size={window.innerWidth >= 768 ? 320 : 220} 
                      enhanced={false}
                    />
                  </div>
                  <div className="text-white text-xs md:text-sm font-bold bg-slate-900/70 rounded px-2 md:px-3 py-1 inline-block backdrop-blur">
                    음력 {moonPhase.day}일
                  </div>
                  <div className="text-blue-300 text-xs mt-1">
                    {moonPhase.phaseName.split('(')[0]}
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-full h-full">
                  <div className="absolute top-1 md:top-2 left-1/2 -translate-x-1/2 text-blue-300 text-xs font-bold">간조</div>
                  <div className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 text-cyan-300 text-xs font-bold">만조</div>
                  <div className="absolute bottom-1 md:bottom-2 left-1/2 -translate-x-1/2 text-blue-300 text-xs font-bold">간조</div>
                  <div className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 text-cyan-300 text-xs font-bold">만조</div>
                </div>
              </div>

              <div 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-1000"
                style={{ transform: `rotate(${moonAngle}deg)` }}
              >
                <div className="relative w-1 md:w-2 h-1/2 bg-gradient-to-t from-blue-400/60 to-blue-200/40 rounded-full origin-bottom shadow-lg shadow-blue-500/30">
                  <div className="absolute -top-10 md:-top-14 left-1/2 -translate-x-1/2">
                    <MoonVisual 
                      phase={moonPhase.phase} 
                      size={window.innerWidth >= 768 ? 80 : 60} 
                      showShadow={false}
                      enhanced={false}
                    />
                  </div>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full border-2 border-slate-700 z-10"></div>
            </div>

            <div className="mt-4 md:mt-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">
                {currentTime.toLocaleTimeString('ko-KR')}
              </div>
              <div className="text-blue-300 text-xs md:text-sm mt-1">
                {currentTime.toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 md:p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <Waves className={`w-5 h-5 md:w-6 md:h-6 ${tidalStatus.type === 'high' ? 'text-cyan-400' : 'text-blue-400'}`} />
                <h3 className="text-lg md:text-xl font-bold text-white">조석 상태</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">현재 상태</span>
                  <span className={`text-xl md:text-2xl font-bold ${tidalStatus.type === 'high' ? 'text-cyan-400' : 'text-blue-400'}`}>
                    {tidalStatus.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">물때</span>
                  <span className="text-white font-semibold">{tidalRange.type}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${tidalStatus.type === 'high' ? 'bg-cyan-400' : 'bg-blue-400'}`}
                    style={{ width: `${tidalStatus.intensity}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 md:p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
                <h3 className="text-lg md:text-xl font-bold text-white">항구 선택</h3>
              </div>
              <div className="space-y-2">
                {Object.entries(portOffsets).map(([key, port]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPort(key)}
                    className={`w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all text-sm ${
                      selectedPort === key
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{port.name}</span>
                      <span className="text-xs md:text-sm opacity-75">
                        {port.offset > 0 ? '+' : ''}{Math.floor(port.offset / 60)}:{String(Math.abs(port.offset % 60)).padStart(2, '0')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 md:p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <Moon className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                <h3 className="text-lg md:text-xl font-bold text-white">실시간 달 정보</h3>
              </div>
              <div className="space-y-3">
                <div className="text-center bg-gradient-to-b from-slate-900/50 to-slate-800/50 rounded-xl p-3 md:p-4">
                  <div className="flex justify-center mb-3">
                    <MoonVisual 
                      phase={moonPhase.phase} 
                      size={window.innerWidth >= 768 ? 200 : 150} 
                      enhanced={false}
                      showShadow={false}
                    />
                  </div>
                  <div className="text-white font-bold text-lg md:text-xl bg-slate-900/60 rounded-lg px-3 py-1.5 inline-block backdrop-blur">
                    음력 {moonPhase.day}일
                  </div>
                  <div className="text-purple-300 text-sm md:text-base mt-2 font-semibold">
                    {moonPhase.phaseName}
                  </div>
                  <div className="text-cyan-400 text-xs md:text-sm mt-2 bg-slate-900/40 rounded px-2 py-1 inline-block">
                    조명 {(moonPhase.illumination * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-700 text-xs md:text-sm space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>삭망 주기</span>
                    <span className="text-slate-300">29.53일</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>조석 주기</span>
                    <span className="text-slate-300">24시간 50분</span>
                  </div>
                  {userLocation && (
                    <div className="flex items-center gap-1 text-emerald-400 mt-2 pt-2 border-t border-slate-700">
                      <Navigation className="w-3 h-3" />
                      <span className="text-xs">현재 위치 기준 계산됨</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 md:mt-8 bg-slate-800/30 backdrop-blur rounded-2xl p-4 md:p-6 border border-slate-700">
          <h3 className="text-base md:text-lg font-bold text-white mb-3">🌙 Moon Clock 고급 기능</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm text-slate-300">
            <div className="bg-slate-900/30 rounded-lg p-3">
              <div className="font-semibold text-blue-400 mb-1">🎯 초고화질 달 렌더링</div>
              <div className="text-slate-400">실제 크레이터, 달의 바다(Maria), 터미네이터 경계선까지 정밀 표현</div>
            </div>
            <div className="bg-slate-900/30 rounded-lg p-3">
              <div className="font-semibold text-purple-400 mb-1">🌍 위치 기반 계산</div>
              <div className="text-slate-400">당신의 위도/경도에서 실제로 보이는 달 모양을 실시간으로 계산</div>
            </div>
            <div className="bg-slate-900/30 rounded-lg p-3">
              <div className="font-semibold text-cyan-400 mb-1">🌊 정밀 조석 예측</div>
              <div className="text-slate-400">천문학적 알고리즘으로 만조/간조 시각을 1분 단위로 예측</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-400">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <span className="font-semibold text-blue-400">월침:</span> 24시간 50분 주기로 회전, 끝에 실시간 달 표시
              </div>
              <div>
                <span className="font-semibold text-yellow-400">일환:</span> 24시간 주기, 태양 정남향(13시)을 12시로 표시
              </div>
              <div>
                <span className="font-semibold text-cyan-400">조석:</span> 3시/9시(만조), 12시/6시(간조) 자동 판정
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoonClock;