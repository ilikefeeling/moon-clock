// src/utils/calculations.js

export const portOffsets = {
    busan: { name: '부산', offset: 70, lat: 35.1, lng: 129.0 },
    gangneung: { name: '강릉', offset: 60, lat: 37.7, lng: 128.9 },
    wonsan: { name: '원산', offset: 30, lat: 39.1, lng: 127.4 },
    incheon: { name: '인천', offset: 0, lat: 37.4, lng: 126.6 },
    gunsan: { name: '군산', offset: -60, lat: 35.9, lng: 126.7 },
    mokpo: { name: '목포', offset: -120, lat: 34.8, lng: 126.4 }
};

export const calculateAccurateMoonPhase = (date, latitude = 37.5665, longitude = 126.9780) => {
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

export const calculateMoonHandAngle = (currentTime) => {
    const lunarDayMs = 89428.3285 * 1000;
    const now = currentTime.getTime();
    const msInDay = now % lunarDayMs;
    return (msInDay / lunarDayMs) * 360;
};

export const calculateSunRingAngle = (currentTime) => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const totalMinutes = hours * 60 + minutes + seconds / 60;
    const offsetMinutes = (totalMinutes - 780 + 1440) % 1440;
    return (offsetMinutes / 1440) * 360;
};

export const calculateTidalStatus = (currentTime, selectedPortOrCoords) => {
    const moonAngle = calculateMoonHandAngle(currentTime);
    let portOffset = 0;

    if (typeof selectedPortOrCoords === 'string') {
        portOffset = portOffsets[selectedPortOrCoords].offset;
    } else if (selectedPortOrCoords && typeof selectedPortOrCoords.lng === 'number') {
        // 경도 기반 대략적 오차 계산 (표준 경도 135도 기준)
        // 1도당 약 4분 차이
        portOffset = (selectedPortOrCoords.lng - 135) * 4;
    }

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

export const calculateTidalRange = (currentTime) => {
    // 조차는 주로 태양과 달의 상대적 위치에 의해 결정되므로 포트 오프셋은 대략적 판정에 영향이 적음
    const moonAngle = calculateMoonHandAngle(currentTime);
    const sunAngle = calculateSunRingAngle(currentTime);
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
