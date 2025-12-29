import React from 'react';
import Svg, { Circle, Defs, ClipPath, Mask, Rect, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

const MoonVisual = ({ phase, size = 120 }) => {
    // 0 = New Moon, 0.25 = First Quarter, 0.5 = Full Moon, 0.75 = Last Quarter, 1.0 = New Moon
    const radius = 48;
    const centerX = 50;
    const centerY = 50;

    // 조명 비율 (0~1)
    const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;

    // 노란색 강도 조절 (밝은 노란색에서 진한 노란색으로)
    const moonColor = illumination > 0.05 ? '#FDE68A' : '#475569'; // 삭일 때는 회색빛
    const glowColor = illumination > 0.5 ? 'rgba(253, 230, 138, 0.3)' : 'rgba(253, 230, 138, 0.1)';

    // 타원의 너비 계산 (Terminator line)
    // phase < 0.5 (차오름): 오른쪽이 밝음
    // phase > 0.5 (기울어짐): 왼쪽이 밝음
    const rx = radius * (1 - 4 * (phase > 0.5 ? 1 - phase : phase) + Math.floor(4 * (phase > 0.5 ? 1 - phase : phase)));
    // 좀 더 직관적인 계산:
    // phase 0: rx = radius (dark circle)
    // phase 0.25: rx = 0 (half moon)
    // phase 0.5: rx = -radius (full moon)

    // 위상에 따른 Path 데이터 계산
    const getMoonPath = () => {
        const isWaxing = phase <= 0.5;
        const absRx = Math.abs(radius * (1 - 4 * (isWaxing ? phase : 1 - phase)));
        const isGibbous = (phase > 0.25 && phase < 0.75);

        // 기본 반원 (밝은 쪽)
        const sweep = isWaxing ? 1 : 0;
        const baseArc = `M 50 2 A 48 48 0 0 ${sweep} 50 98`;

        // 터미네이터 (경계선)
        const termSweep = isGibbous ? sweep : (1 - sweep);
        const termArc = `A ${absRx} 48 0 0 ${termSweep} 50 2`;

        return `${baseArc} ${termArc} Z`;
    };

    if (phase < 0.02 || phase > 0.98) {
        // 삭 (New Moon)
        return (
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Circle cx="50" cy="50" r="48" fill="#1e293b" stroke="#334155" strokeWidth="1" />
            </Svg>
        );
    }

    if (phase > 0.48 && phase < 0.52) {
        // 망 (Full Moon)
        return (
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    <RadialGradient id="fullMoonGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#FEF9C3" />
                        <Stop offset="70%" stopColor="#FDE68A" />
                        <Stop offset="100%" stopColor="#FACC15" />
                    </RadialGradient>
                </Defs>
                <Circle cx="50" cy="50" r="48" fill="url(#fullMoonGlow)" />
                <Circle cx="50" cy="50" r="52" fill="transparent" stroke="rgba(254, 249, 195, 0.2)" strokeWidth="4" />
            </Svg>
        );
    }

    return (
        <Svg width={size} height={size} viewBox="0 0 100 100">
            <Defs>
                <RadialGradient id="moonGradient" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#FEF9C3" />
                    <Stop offset="100%" stopColor="#FDE68A" />
                </RadialGradient>
            </Defs>

            {/* Background Shadow */}
            <Circle cx="50" cy="50" r="48" fill="#1e293b" />

            {/* Illuminated Area */}
            <Path
                d={getMoonPath()}
                fill="url(#moonGradient)"
            />

            {/* Outline */}
            <Circle cx="50" cy="50" r="48" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        </Svg>
    );
};

export default MoonVisual;
