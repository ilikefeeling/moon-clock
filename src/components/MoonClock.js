import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, SafeAreaView, StyleSheet, Platform } from 'react-native';
import { Moon, Waves, MapPin, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import {
    portOffsets,
    calculateAccurateMoonPhase,
    calculateMoonHandAngle,
    calculateSunRingAngle,
    calculateTidalStatus,
    calculateTidalRange
} from '../utils/calculations';
import MoonVisual from './MoonVisual';

export default function MoonClock() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedPort, setSelectedPort] = useState('incheon');
    const [userLocation, setUserLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const { width: windowWidth } = useWindowDimensions();

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationError('위치 권한이 거부되었습니다. 기본 위치를 사용합니다.');
                setUserLocation({ lat: 37.5665, lng: 126.9780 });
                return;
            }
            try {
                let location = await Location.getCurrentPositionAsync({});
                setUserLocation({
                    lat: location.coords.latitude,
                    lng: location.coords.longitude
                });
                setLocationError(null);
            } catch (error) {
                setLocationError('위치 정보를 가져올 수 없습니다. 기본 위치를 사용합니다.');
                setUserLocation({ lat: 37.5665, lng: 126.9780 });
            }
        })();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const moonAngle = calculateMoonHandAngle(currentTime);
    const sunAngle = calculateSunRingAngle(currentTime);
    const tidalStatus = calculateTidalStatus(currentTime, selectedPort);
    const tidalRange = calculateTidalRange(currentTime);
    const moonPhase = userLocation
        ? calculateAccurateMoonPhase(currentTime, userLocation.lat, userLocation.lng)
        : calculateAccurateMoonPhase(currentTime);

    const clockSize = Math.min(windowWidth - 40, 500);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>🌙 Moon Clock</Text>
                    <Text style={styles.subtitle}>실시간 조석 시계 - 당신의 위치에서 보이는 달</Text>
                    {userLocation && (
                        <View style={styles.locationContainer}>
                            <Navigation size={14} color="#34d399" />
                            <Text style={styles.locationText}>
                                위도: {userLocation.lat.toFixed(2)}° / 경도: {userLocation.lng.toFixed(2)}°
                            </Text>
                        </View>
                    )}
                    {locationError && (
                        <Text style={styles.errorText}>⚠️ {locationError}</Text>
                    )}
                </View>

                {/* Main Clock View */}
                <View style={styles.clockCard}>
                    <View style={{ width: clockSize, height: clockSize, position: 'relative' }}>
                        {/* Sun Ring */}
                        <View
                            style={{
                                position: 'absolute',
                                inset: 0,
                                borderWidth: 4,
                                borderColor: 'rgba(234, 179, 8, 0.2)',
                                borderRadius: clockSize / 2,
                                transform: [{ rotate: `${sunAngle}deg` }]
                            }}
                        >
                            <View
                                style={{
                                    position: 'absolute',
                                    top: -12,
                                    left: clockSize / 2 - 12,
                                    width: 24,
                                    height: 24,
                                    backgroundColor: '#facc15',
                                    borderRadius: 12,
                                    shadowColor: '#facc15',
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.5,
                                    shadowRadius: 10,
                                    elevation: 5
                                }}
                            />
                        </View>

                        {/* Central Moon Display */}
                        <View style={[styles.centralMoon, { borderRadius: clockSize / 2 }]}>
                            <MoonVisual phase={moonPhase.phase} size={clockSize * 0.6} />
                            <View style={styles.lunarDayBadge}>
                                <Text style={styles.lunarDayText}>음력 {moonPhase.day}일</Text>
                            </View>
                            <Text style={styles.phaseNameText}>{moonPhase.phaseName.split('(')[0]}</Text>
                        </View>

                        {/* Tide Indicators */}
                        <View style={styles.tideIndicators}>
                            <Text style={[styles.tideText, styles.tideTop]}>간조</Text>
                            <Text style={[styles.tideText, styles.tideRight]}>만조</Text>
                            <Text style={[styles.tideText, styles.tideBottom]}>간조</Text>
                            <Text style={[styles.tideText, styles.tideLeft]}>만조</Text>
                        </View>

                        {/* Moon Hand */}
                        <View
                            style={{
                                position: 'absolute',
                                inset: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: [{ rotate: `${moonAngle}deg` }]
                            }}
                        >
                            <View
                                style={[styles.moonHand, { height: clockSize / 2 - 20, marginBottom: clockSize / 2 }]}
                            >
                                <View style={{ position: 'absolute', top: -30, left: -15 }}>
                                    <MoonVisual phase={moonPhase.phase} size={30} />
                                </View>
                            </View>
                        </View>

                        {/* Center dot */}
                        <View style={styles.centerDot} />
                    </View>

                    <View style={styles.timeContainer}>
                        <Text style={styles.timeText}>
                            {currentTime.toLocaleTimeString('ko-KR')}
                        </Text>
                        <Text style={styles.dateText}>
                            {currentTime.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                            })}
                        </Text>
                    </View>
                </View>

                {/* status cards */}
                <View style={styles.cardsContainer}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Waves size={20} color={tidalStatus.type === 'high' ? '#22d3ee' : '#60a5fa'} />
                            <Text style={styles.cardTitle}>조석 상태</Text>
                        </View>
                        <View style={styles.cardContent}>
                            <View style={styles.cardRow}>
                                <Text style={styles.label}>현재 상태</Text>
                                <Text style={[styles.value, { color: tidalStatus.type === 'high' ? '#22d3ee' : '#60a5fa' }]}>
                                    {tidalStatus.status}
                                </Text>
                            </View>
                            <View style={styles.cardRow}>
                                <Text style={styles.label}>물때</Text>
                                <Text style={styles.valueSemi}>{tidalRange.type}</Text>
                            </View>
                            <View style={styles.progressBarBg}>
                                <View
                                    style={[
                                        styles.progressBarFill,
                                        {
                                            width: `${tidalStatus.intensity}%`,
                                            backgroundColor: tidalStatus.type === 'high' ? '#22d3ee' : '#60a5fa'
                                        }
                                    ]}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MapPin size={20} color="#34d399" />
                            <Text style={styles.cardTitle}>항구 선택</Text>
                        </View>
                        <View style={styles.portGrid}>
                            {Object.entries(portOffsets).map(([key, port]) => (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => setSelectedPort(key)}
                                    style={[
                                        styles.portButton,
                                        selectedPort === key ? styles.portButtonSelected : styles.portButtonNormal
                                    ]}
                                >
                                    <View style={styles.portButtonInner}>
                                        <Text style={[
                                            styles.portName,
                                            { color: selectedPort === key ? '#ffffff' : '#cbd5e1' }
                                        ]}>
                                            {port.name}
                                        </Text>
                                        <Text style={styles.portOffset}>
                                            {port.offset > 0 ? '+' : ''}{Math.floor(port.offset / 60)}:{String(Math.abs(port.offset % 60)).padStart(2, '0')}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={[styles.card, styles.lastCard]}>
                        <View style={styles.cardHeader}>
                            <Moon size={20} color="#c084fc" />
                            <Text style={styles.cardTitle}>실시간 달 정보</Text>
                        </View>
                        <View style={styles.moonDetailContainer}>
                            <MoonVisual phase={moonPhase.phase} size={150} />
                            <View style={styles.lunarDetailBadge}>
                                <Text style={styles.lunarDetailText}>음력 {moonPhase.day}일</Text>
                            </View>
                            <Text style={styles.phaseDetailText}>{moonPhase.phaseName}</Text>
                            <View style={styles.illumContainer}>
                                <Text style={styles.illumText}>조명 {(moonPhase.illumination * 100).toFixed(1)}%</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 4,
    },
    subtitle: {
        color: '#93c5fd',
        fontSize: 14,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    locationText: {
        color: '#34d399',
        fontSize: 12,
        marginLeft: 4,
    },
    errorText: {
        color: '#fbbf24',
        fontSize: 12,
        marginTop: 4,
    },
    clockCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        alignItems: 'center',
        marginBottom: 24,
    },
    centralMoon: {
        position: 'absolute',
        inset: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lunarDayBadge: {
        marginTop: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
    },
    lunarDayText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    phaseNameText: {
        color: '#93c5fd',
        fontSize: 12,
        marginTop: 4,
    },
    tideIndicators: {
        position: 'absolute',
        inset: 0,
    },
    tideText: {
        position: 'absolute',
        fontSize: 10,
        fontWeight: 'bold',
    },
    tideTop: {
        top: 8,
        left: '50%',
        marginLeft: -16,
        color: '#93c5fd',
    },
    tideRight: {
        right: 8,
        top: '50%',
        marginTop: -8,
        color: '#67e8f9',
    },
    tideBottom: {
        bottom: 8,
        left: '50%',
        marginLeft: -16,
        color: '#93c5fd',
    },
    tideLeft: {
        left: 8,
        top: '50%',
        marginTop: -8,
        color: '#67e8f9',
    },
    moonHand: {
        width: 4,
        backgroundColor: 'rgba(96, 165, 250, 0.5)',
        borderRadius: 2,
    },
    centerDot: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -8,
        marginTop: -8,
        width: 16,
        height: 16,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#334155',
        zIndex: 10,
    },
    timeContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    timeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    dateText: {
        color: '#93c5fd',
        fontSize: 14,
        marginTop: 4,
    },
    cardsContainer: {
        gap: 16,
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.5)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#334155',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    cardContent: {
        gap: 12,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'between',
        alignItems: 'center',
    },
    label: {
        color: '#94a3b8',
        fontSize: 14,
    },
    value: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    valueSemi: {
        color: '#ffffff',
        fontWeight: '600',
    },
    progressBarBg: {
        width: '100%',
        backgroundColor: '#334155',
        borderRadius: 4,
        height: 8,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBarFill: {
        height: '100%',
    },
    portGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    portButton: {
        width: '48%',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    portButtonNormal: {
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
    },
    portButtonSelected: {
        backgroundColor: '#3b82f6',
    },
    portButtonInner: {
        flexDirection: 'row',
        justifyContent: 'between',
        alignItems: 'center',
    },
    portName: {
        fontWeight: '600',
    },
    portOffset: {
        fontSize: 10,
        color: '#94a3b8',
    },
    moonDetailContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
        borderRadius: 12,
        padding: 16,
    },
    lunarDetailBadge: {
        marginTop: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
    },
    lunarDetailText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 18,
    },
    phaseDetailText: {
        color: '#d8b4fe',
        fontWeight: '600',
        marginTop: 8,
    },
    illumContainer: {
        marginTop: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    illumText: {
        color: '#22d3ee',
        fontSize: 12,
    },
    lastCard: {
        marginBottom: 32,
    }
});
