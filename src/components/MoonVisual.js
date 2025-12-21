import React from 'react';
import Svg, { Circle, Defs, ClipPath, Mask, Rect, Ellipse } from 'react-native-svg';

const MoonVisual = ({ phase, size = 120 }) => {
    const phaseAngle = phase * 2 * Math.PI;
    const terminatorX = 50 + (Math.cos(phaseAngle) * 48);
    const rx = Math.abs(Math.cos(phaseAngle)) * 48;

    return (
        <Svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
        >
            <Defs>
                <ClipPath id={`moonClip-${phase}`}>
                    <Circle cx="50" cy="50" r="48" />
                </ClipPath>

                <Mask id={`phaseMask-${phase}`}>
                    <Rect width="100" height="100" fill="black" />
                    <Circle cx="50" cy="50" r="48" fill="white" />
                    <Ellipse
                        cx={terminatorX}
                        cy="50"
                        rx={rx}
                        ry="48"
                        fill="black"
                    />
                </Mask>
            </Defs>

            <Circle
                cx="50"
                cy="50"
                r="48"
                fill="#FCD34D"
                mask={`url(#phaseMask-${phase})`}
                clipPath={`url(#moonClip-${phase})`}
            />
        </Svg>
    );
};

export default MoonVisual;
