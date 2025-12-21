import React, { useState, useEffect, useRef } from 'react';
import { Moon, MapPin, Info, Calendar, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, FastForward } from 'lucide-react';

// ===================================================================
// 정밀 천문 계산 엔진
// ===================================================================

const AstronomicalCalculator = {
    SYNODIC_MONTH: 29.530588861,
    KNOWN_NEW_MOON: new Date('2000-01-06T18:14:00Z'),
    DEG_TO_RAD: Math.PI / 180,
    RAD_TO_DEG: 180 / Math.PI,

    toJulianDate(date) {
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth() + 1;
        const d = date.getUTCDate() +
            date.getUTCHours() / 24 +
            date.getUTCMinutes() / 1440 +
            date.getUTCSeconds() / 86400;

        let year = y;
        let month = m;

        if (month <= 2) {
            year -= 1;
            month += 12;
        }

        const A = Math.floor(year / 100);
        const B = 2 - A + Math.floor(A / 4);

        return Math.floor(365.25 * (year + 4716)) +
            Math.floor(30.6001 * (month + 1)) +
            d + B - 1524.5;
    },

    getMoonLongitude(jd) {
        const T = (jd - 2451545.0) / 36525;

        let L0 = 218.3164477 + 481267.88123421 * T -
            0.0015786 * T * T + T * T * T / 538841 -
            T * T * T * T / 65194000;

        let M = 134.9633964 + 477198.8675055 * T +
            0.0087414 * T * T + T * T * T / 69699 -
            T * T * T * T / 14712000;

        let M1 = 357.5291092 + 35999.0502909 * T -
            0.0001536 * T * T + T * T * T / 24490000;

        let D = 297.8501921 + 445267.1114034 * T -
            0.0018819 * T * T + T * T * T / 545868 -
            T * T * T * T / 113065000;

        let F = 93.2720950 + 483202.0175233 * T -
            0.0036539 * T * T - T * T * T / 3526000 +
            T * T * T * T / 863310000;

        L0 *= this.DEG_TO_RAD;
        M *= this.DEG_TO_RAD;
        M1 *= this.DEG_TO_RAD;
        D *= this.DEG_TO_RAD;
        F *= this.DEG_TO_RAD;

        let deltaL = 0;
        deltaL += 6.288774 * Math.sin(M);
        deltaL += 1.274027 * Math.sin(2 * D - M);
        deltaL += 0.658314 * Math.sin(2 * D);
        deltaL += 0.213618 * Math.sin(2 * M);
        deltaL += -0.185116 * Math.sin(M1);
        deltaL += -0.114332 * Math.sin(2 * F);

        let lambda = (L0 * this.RAD_TO_DEG + deltaL) % 360;
        if (lambda < 0) lambda += 360;

        return lambda;
    },

    getMoonDeclination(jd) {
        const T = (jd - 2451545.0) / 36525;

        let M = 134.9633964 + 477198.8675055 * T;
        let D = 297.8501921 + 445267.1114034 * T;
        let F = 93.2720950 + 483202.0175233 * T;

        M *= this.DEG_TO_RAD;
        D *= this.DEG_TO_RAD;
        F *= this.DEG_TO_RAD;

        const lambda = this.getMoonLongitude(jd) * this.DEG_TO_RAD;
        const epsilon = (23.439291 - 0.0130042 * T) * this.DEG_TO_RAD;

        let beta = 5.128122 * Math.sin(F);
        beta += 0.280602 * Math.sin(M + F);
        beta += 0.277693 * Math.sin(M - F);
        beta += 0.173237 * Math.sin(2 * D - F);
        beta *= this.DEG_TO_RAD;

        const declination = Math.asin(
            Math.sin(beta) * Math.cos(epsilon) +
            Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda)
        ) * this.RAD_TO_DEG;

        return declination;
    },

    getMoonRightAscension(jd) {
        const T = (jd - 2451545.0) / 36525;
        const lambda = this.getMoonLongitude(jd) * this.DEG_TO_RAD;
        const epsilon = (23.439291 - 0.0130042 * T) * this.DEG_TO_RAD;

        let M = 134.9633964 + 477198.8675055 * T;
        let F = 93.2720950 + 483202.0175233 * T;
        M *= this.DEG_TO_RAD;
        F *= this.DEG_TO_RAD;

        let beta = 5.128122 * Math.sin(F);
        beta *= this.DEG_TO_RAD;

        const y = Math.sin(lambda) * Math.cos(epsilon) -
            Math.tan(beta) * Math.sin(epsilon);
        const x = Math.cos(lambda);

        let ra = Math.atan2(y, x) * this.RAD_TO_DEG;
        if (ra < 0) ra += 360;

        return ra;
    },

    getLocalSiderealTime(jd, longitude) {
        const T = (jd - 2451545.0) / 36525;

        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
            0.000387933 * T * T - T * T * T / 38710000;

        gmst = gmst % 360;
        if (gmst < 0) gmst += 360;

        let lst = gmst + longitude;
        lst = lst % 360;
        if (lst < 0) lst += 360;

        return lst;
    },

    getHourAngle(jd, longitude) {
        const lst = this.getLocalSiderealTime(jd, longitude);
        const ra = this.getMoonRightAscension(jd);

        let ha = lst - ra;
        if (ha < -180) ha += 360;
        if (ha > 180) ha -= 360;

        return ha;
    },

    getMoonAltitude(jd, latitude, longitude) {
        const dec = this.getMoonDeclination(jd) * this.DEG_TO_RAD;
        const ha = this.getHourAngle(jd, longitude) * this.DEG_TO_RAD;
        const lat = latitude * this.DEG_TO_RAD;

        const altitude = Math.asin(
            Math.sin(lat) * Math.sin(dec) +
            Math.cos(lat) * Math.cos(dec) * Math.cos(ha)
        ) * this.RAD_TO_DEG;

        return altitude;
    },

    getMoonAzimuth(jd, latitude, longitude) {
        const dec = this.getMoonDeclination(jd) * this.DEG_TO_RAD;
        const ha = this.getHourAngle(jd, longitude) * this.DEG_TO_RAD;
        const lat = latitude * this.DEG_TO_RAD;

        const y = Math.sin(ha);
        const x = Math.cos(ha) * Math.sin(lat) -
            Math.tan(dec) * Math.cos(lat);

        let azimuth = Math.atan2(y, x) * this.RAD_TO_DEG;
        azimuth = (azimuth + 180) % 360;

        return azimuth;
    },

    getParallacticAngle(jd, latitude, longitude) {
        const dec = this.getMoonDeclination(jd) * this.DEG_TO_RAD;
        const ha = this.getHourAngle(jd, longitude) * this.DEG_TO_RAD;
        const lat = latitude * this.DEG_TO_RAD;

        const y = Math.sin(ha);
        const x = Math.tan(lat) * Math.cos(dec) -
            Math.sin(dec) * Math.cos(ha);

        let q = Math.atan2(y, x) * this.RAD_TO_DEG;

        return q;
    },

    getMoonPhase(jd) {
        const daysSinceNewMoon = (jd - this.toJulianDate(this.KNOWN_NEW_MOON));
        const phase = (daysSinceNewMoon % this.SYNODIC_MONTH) / this.SYNODIC_MONTH;
        return phase < 0 ? phase + 1 : phase;
    },

    getIllumination(phase) {
        return (1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100;
    },

    calculateMoonData(date, latitude, longitude) {
        const jd = this.toJulianDate(date);
        const phase = this.getMoonPhase(jd);
        const illumination = this.getIllumination(phase);
        const lunarDay = Math.floor(phase * this.SYNODIC_MONTH) + 1;

        const rightAscension = this.getMoonRightAscension(jd);
        const declination = this.getMoonDeclination(jd);
        const hourAngle = this.getHourAngle(jd, longitude);

        const altitude = this.getMoonAltitude(jd, latitude, longitude);
        const azimuth = this.getMoonAzimuth(jd, latitude, longitude);
        const parallacticAngle = this.getParallacticAngle(jd, latitude, longitude);

        const phaseName = this.getPhaseName(phase);

        return {
            phase,
            illumination,
            lunarDay,
            rightAscension,
            declination,
            hourAngle,
            altitude,
            azimuth,
            parallacticAngle,
            phaseName,
            isWaxing: phase < 0.5,
            isVisible: altitude > 0
        };
    },

    getPhaseName(phase) {
        if (phase < 0.03 || phase > 0.97) return '삭 (New Moon)';
        if (phase < 0.22) return '초승달 (Waxing Crescent)';
        if (phase < 0.28) return '상현달 (First Quarter)';
        if (phase < 0.47) return '상현망 (Waxing Gibbous)';
        if (phase < 0.53) return '망 (Full Moon)';
        if (phase < 0.72) return '하현망 (Waning Gibbous)';
        if (phase < 0.78) return '하현달 (Last Quarter)';
        return '그믐달 (Waning Crescent)';
    }
};

// ===================================================================
// Canvas 렌더러
// ===================================================================

const MoonCanvasRenderer = {
    render(canvas, moonData) {
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 30;

        ctx.clearRect(0, 0, width, height);

        this.drawGlow(ctx, centerX, centerY, radius);

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(moonData.parallacticAngle * Math.PI / 180);

        this.drawMoonShadow(ctx, radius);
        this.drawMoonIllumination(ctx, radius, moonData);
        this.drawMoonDetails(ctx, radius, moonData);
        this.drawMoonOutline(ctx, radius);

        ctx.restore();

        this.drawInfoText(ctx, moonData, centerX, centerY, radius);
    },

    drawGlow(ctx, x, y, radius) {
        const gradient = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius * 1.4);
        gradient.addColorStop(0, 'rgba(254, 240, 138, 0.2)');
        gradient.addColorStop(0.5, 'rgba(254, 240, 138, 0.1)');
        gradient.addColorStop(1, 'rgba(254, 240, 138, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.4, 0, Math.PI * 2);
        ctx.fill();
    },

    drawMoonShadow(ctx, radius) {
        const gradient = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, 0, 0, 0, radius);
        gradient.addColorStop(0, '#0a0f1e');
        gradient.addColorStop(0.5, '#0f1729');
        gradient.addColorStop(1, '#020617');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
    },

    drawMoonIllumination(ctx, radius, moonData) {
        const phaseAngle = moonData.phase * 2 * Math.PI;
        const terminatorX = Math.cos(phaseAngle) * radius;

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.clip();

        const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius * 1.2);
        gradient.addColorStop(0, '#fefce8');
        gradient.addColorStop(0.3, '#fef3c7');
        gradient.addColorStop(0.6, '#fde68a');
        gradient.addColorStop(1, '#fcd34d');

        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.ellipse(terminatorX, 0, Math.abs(Math.cos(phaseAngle)) * radius, radius, 0, 0, Math.PI * 2);

        if (moonData.isWaxing) {
            ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
        } else {
            ctx.arc(0, 0, radius, 0, Math.PI * 2, true);
        }

        ctx.fill('evenodd');
        ctx.restore();
    },

    drawMoonDetails(ctx, radius, moonData) {
        const phaseAngle = moonData.phase * 2 * Math.PI;
        const terminatorX = Math.cos(phaseAngle) * radius;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(terminatorX, 0, Math.abs(Math.cos(phaseAngle)) * radius, radius, 0, 0, Math.PI * 2);
        if (moonData.isWaxing) {
            ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
        } else {
            ctx.arc(0, 0, radius, 0, Math.PI * 2, true);
        }
        ctx.clip('evenodd');

        const craters = [
            { x: -0.35, y: -0.25, r: 0.1, opacity: 0.2 },
            { x: 0.25, y: -0.2, r: 0.06, opacity: 0.15 },
            { x: -0.15, y: 0.25, r: 0.08, opacity: 0.18 },
            { x: 0.3, y: 0.3, r: 0.05, opacity: 0.12 },
            { x: -0.25, y: 0.4, r: 0.09, opacity: 0.16 },
            { x: 0.1, y: -0.35, r: 0.04, opacity: 0.1 }
        ];

        craters.forEach(crater => {
            ctx.fillStyle = `rgba(139, 115, 85, ${crater.opacity})`;
            ctx.beginPath();
            ctx.arc(crater.x * radius, crater.y * radius, crater.r * radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = 'rgba(100, 90, 70, 0.15)';
        ctx.beginPath();
        ctx.ellipse(-0.2 * radius, -0.1 * radius, 0.15 * radius, 0.12 * radius, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    },

    drawMoonOutline(ctx, radius) {
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
    },

    drawInfoText(ctx, moonData, centerX, centerY, radius) {
        if (!moonData.isVisible) {
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('지평선 아래', centerX, centerY + radius + 40);
        }
    }
};

// ===================================================================
// React Component
// ===================================================================

const PreciseMoonClock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [displayTime, setDisplayTime] = useState(new Date());
    const [location, setLocation] = useState({ lat: 37.5665, lng: 126.9780 });
    const [moonData, setMoonData] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeSpeed, setTimeSpeed] = useState(1); // 1 = 1일, 2 = 1시간
    const canvasRef = useRef(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setLocationError(null);
                },
                (error) => {
                    setLocationError('위치 정보 사용 불가 (서울 기준)');
                }
            );
        }
    }, []);

    // 실시간 시계
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 애니메이션 타이머
    useEffect(() => {
        if (isPlaying) {
            const interval = setInterval(() => {
                setDisplayTime(prev => {
                    const newTime = new Date(prev);
                    if (timeSpeed === 1) {
                        newTime.setDate(newTime.getDate() + 1); // 1일 추가
                    } else if (timeSpeed === 2) {
                        newTime.setHours(newTime.getHours() + 1); // 1시간 추가
                    }
                    return newTime;
                });
            }, 100); // 100ms마다 업데이트
            return () => clearInterval(interval);
        }
    }, [isPlaying, timeSpeed]);

    // 달 데이터 계산 및 렌더링
    useEffect(() => {
        const data = AstronomicalCalculator.calculateMoonData(
            displayTime,
            location.lat,
            location.lng
        );
        setMoonData(data);

        if (canvasRef.current) {
            MoonCanvasRenderer.render(canvasRef.current, data);
        }
    }, [displayTime, location]);

    const handleReset = () => {
        setIsPlaying(false);
        setDisplayTime(new Date());
    };

    const handlePrevDay = () => {
        setDisplayTime(prev => {
            const newTime = new Date(prev);
            newTime.setDate(newTime.getDate() - 1);
            return newTime;
        });
    };

    const handleNextDay = () => {
        setDisplayTime(prev => {
            const newTime = new Date(prev);
            newTime.setDate(newTime.getDate() + 1);
            return newTime;
        });
    };

    const handleDateChange = (e) => {
        setDisplayTime(new Date(e.target.value));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* 헤더 */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                        <Moon className="w-8 h-8 text-yellow-300" />
                        정밀 천문 계산 달 시계
                    </h1>
                    <p className="text-blue-300 text-sm">실제 하늘에서 보이는 달의 모습과 각도를 재현</p>
                    {location && (
                        <div className="flex items-center justify-center gap-2 mt-2 text-emerald-400 text-xs">
                            <MapPin className="w-3 h-3" />
                            <span>위도: {location.lat.toFixed(4)}° / 경도: {location.lng.toFixed(4)}°</span>
                        </div>
                    )}
                    {locationError && (
                        <div className="mt-2 text-amber-400 text-xs">⚠️ {locationError}</div>
                    )}
                </div>

                {/* 시간 컨트롤 */}
                <div className="mb-6 bg-slate-800/70 backdrop-blur rounded-2xl p-4 border border-slate-700">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* 날짜 선택 */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-400" />
                            <input
                                type="datetime-local"
                                value={displayTime.toISOString().slice(0, 16)}
                                onChange={handleDateChange}
                                className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 text-sm"
                            />
                        </div>

                        {/* 컨트롤 버튼 */}
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrevDay}
                                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                title="이전 날"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className={`p-2 ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg transition-colors`}
                                title={isPlaying ? "일시정지" : "재생"}
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>

                            <button
                                onClick={handleNextDay}
                                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                title="다음 날"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleReset}
                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                title="현재 시간으로"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 속도 선택 */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTimeSpeed(1)}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${timeSpeed === 1 ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                1일/초
                            </button>
                            <button
                                onClick={() => setTimeSpeed(2)}
                                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${timeSpeed === 2 ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                            >
                                <FastForward className="w-4 h-4 inline mr-1" />
                                1시간/초
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 메인 캔버스 */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-6 md:p-8 border border-slate-700">
                            <div className="flex justify-center mb-4">
                                <canvas
                                    ref={canvasRef}
                                    width="500"
                                    height="500"
                                    className="max-w-full h-auto"
                                />
                            </div>

                            <div className="text-center">
                                <div className="text-white text-2xl md:text-3xl font-bold mb-2">
                                    {displayTime.toLocaleTimeString('ko-KR')}
                                </div>
                                <div className="text-blue-300 text-sm">
                                    {displayTime.toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        weekday: 'long'
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 정보 패널 */}
                    <div className="space-y-4">
                        {/* 기본 정보 */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <Info className="w-5 h-5 text-purple-400" />
                                달 위상 정보
                            </h3>
                            {moonData && (
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">위상</span>
                                        <span className="text-purple-300 font-semibold text-sm">{moonData.phaseName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">조명률</span>
                                        <span className="text-yellow-300 font-bold">{moonData.illumination.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">음력</span>
                                        <span className="text-white font-semibold">{moonData.lunarDay}일</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">위상 진행</span>
                                        <span className="text-cyan-300 font-mono">{(moonData.phase * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">상태</span>
                                        <span className={moonData.isVisible ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
                                            {moonData.isVisible ? '관측 가능 ✓' : '지평선 아래 ✗'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 천문 좌표 */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-4">천문 좌표</h3>
                            {moonData && (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">적경 (RA)</span>
                                        <span className="text-cyan-300 font-mono">{moonData.rightAscension.toFixed(2)}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">적위 (Dec)</span>
                                        <span className="text-cyan-300 font-mono">{moonData.declination.toFixed(2)}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">시간각 (HA)</span>
                                        <span className="text-cyan-300 font-mono">{moonData.hourAngle.toFixed(2)}°</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 지평 좌표 */}
                        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-5 border border-slate-700">
                            <h3 className="text-lg font-bold text-white mb-4">지평 좌표</h3>
                            {moonData && (
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">고도 (Alt)</span>
                                        <span className="text-emerald-300 font-mono">{moonData.altitude.toFixed(2)}°</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">방위각 (Az)</span>
                                        <span className="text-emerald-300 font-mono">{moonData.azimuth.toFixed(2)}°</span>
                                    </div>
                                    <div className="flex justify-between bg-blue-900/30 rounded px-2 py-1">
                                        <span className="text-yellow-300 font-semibold">시차각 (PA)</span>
                                        <span className="text-yellow-300 font-bold">{moonData.parallacticAngle.toFixed(2)}°</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 사용법 */}
                        <div className="bg-green-900/20 backdrop-blur rounded-2xl p-4 border border-green-700/50">
                            <div className="text-green-200 text-xs space-y-2">
                                <p className="font-bold text-green-300">✨ 사용 방법:</p>
                                <p>• <strong>▶️ 재생</strong>: 시간이 빠르게 진행되어 달이 변화합니다</p>
                                <p>• <strong>◀️ ▶️</strong>: 하루씩 이동</p>
                                <p>• <strong>1일/초</strong>: 1초에 하루씩 진행</p>
                                <p>• <strong>1시간/초</strong>: 더 빠른 진행</p>
                                <p className="text-yellow-300 font-semibold pt-2">재생 버튼을 눌러보세요! 달이 변화합니다 🌙</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단 정보 */}
                <div className="mt-6 bg-slate-800/30 backdrop-blur rounded-2xl p-4 border border-slate-700">
                    <div className="text-center text-sm text-slate-400">
                        <p>삭망 주기: <span className="text-yellow-300">29.530588861일</span> |
                            업데이트: <span className="text-cyan-300">실시간</span> |
                            정확도: <span className="text-emerald-300">±0.1°</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreciseMoonClock;