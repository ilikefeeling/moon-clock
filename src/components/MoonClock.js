import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, SafeAreaView, StyleSheet, Platform } from 'react-native';
import { Moon, Waves, MapPin, Navigation, Calendar, Clock, Plus, Trash2, Search } from 'lucide-react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeSpeed, setTimeSpeed] = useState(1); // 1 = 1일, 2 = 1시간
    const [searchTerm, setSearchTerm] = useState('');
    const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);
    const [ports, setPorts] = useState(portOffsets);
    const [userAddress, setUserAddress] = useState(null);
    const [isAddPortVisible, setIsAddPortVisible] = useState(false);
    const [newPortName, setNewPortName] = useState('');
    const [newPortOffset, setNewPortOffset] = useState('');
    const [newPortLat, setNewPortLat] = useState('');
    const [newPortLng, setNewPortLng] = useState('');
    const { width: windowWidth } = useWindowDimensions();

    const STORAGE_KEY = '@custom_ports_v1';

    // Load custom ports
    useEffect(() => {
        const loadPorts = async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setPorts({ ...portOffsets, ...parsed });
                }
            } catch (e) {
                console.error('Failed to load ports', e);
            }
        };
        loadPorts();
    }, []);

    // Save custom ports
    const saveCustomPorts = async (updatedPorts) => {
        try {
            const customOnly = {};
            Object.entries(updatedPorts).forEach(([key, val]) => {
                if (!portOffsets[key]) customOnly[key] = val;
            });
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
        } catch (e) {
            console.error('Failed to save ports', e);
        }
    };

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
                const coords = {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude
                };
                setUserLocation(coords);
                setLocationError(null);

                // Get Address
                const reverse = await Location.reverseGeocodeAsync({
                    latitude: coords.lat,
                    longitude: coords.lng
                });
                if (reverse && reverse[0]) {
                    const addr = reverse[0];
                    setUserAddress(`${addr.region || ''} ${addr.city || ''} ${addr.street || ''} ${addr.name || ''}`.trim());
                }
            } catch (error) {
                setLocationError('위치 정보를 가져올 수 없습니다. 기본 위치를 사용합니다.');
                setUserLocation({ lat: 37.5665, lng: 126.9780 });
            }
        })();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            if (!isPlaying) {
                setCurrentTime(new Date());
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [isPlaying]);

    // 애니메이션 타이머
    useEffect(() => {
        if (isPlaying) {
            const interval = setInterval(() => {
                setCurrentTime(prev => {
                    const newTime = new Date(prev);
                    if (timeSpeed === 1) {
                        newTime.setDate(newTime.getDate() + 1); // 1일 추가
                    } else if (timeSpeed === 2) {
                        newTime.setHours(newTime.getHours() + 1); // 1시간 추가
                    }
                    return newTime;
                });
            }, 100); // 100ms마다 업데이트 (더 부드러운 변화를 위해)
            return () => clearInterval(interval);
        }
    }, [isPlaying, timeSpeed]);

    const moonAngle = calculateMoonHandAngle(currentTime);
    const sunAngle = calculateSunRingAngle(currentTime);

    // 항구 또는 현 위치 기반 조석 계산
    const tidalStatus = calculateTidalStatus(
        currentTime,
        isUsingCurrentLocation ? userLocation : (ports[selectedPort] || portOffsets.incheon)
    );

    const tidalRange = calculateTidalRange(currentTime);
    const moonPhase = userLocation
        ? calculateAccurateMoonPhase(currentTime, userLocation.lat, userLocation.lng)
        : calculateAccurateMoonPhase(currentTime);

    const clockSize = Math.min(windowWidth - 40, 500);

    const handleDateChange = (dateStr) => {
        setIsPlaying(false);
        // datetime-local gives string, need to handle timezone
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            setCurrentTime(date);
        }
    };

    const addPort = () => {
        if (!newPortName || !newPortOffset) return;
        const key = `custom_${Date.now()}`;
        const newEntry = {
            name: newPortName,
            offset: parseInt(newPortOffset),
            lat: parseFloat(newPortLat) || 37,
            lng: parseFloat(newPortLng) || 127
        };
        const updated = { ...ports, [key]: newEntry };
        setPorts(updated);
        saveCustomPorts(updated);
        setIsAddPortVisible(false);
        setNewPortName('');
        setNewPortOffset('');
    };

    const deletePort = (key) => {
        if (portOffsets[key]) return; // Protect system ports
        const updated = { ...ports };
        delete updated[key];
        setPorts(updated);
        saveCustomPorts(updated);
        if (selectedPort === key) setSelectedPort('incheon');
    };

    // Date formatting for input (local time)
    const getLocalISOString = (date) => {
        const off = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - off).toISOString().slice(0, 16);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>🌙 Moon Clock</Text>
                    <Text style={styles.subtitle}>실시간 조석 시계 - 당신의 위치에서 보이는 달</Text>
                    {(userLocation || userAddress) && (
                        <View style={styles.locationContainer}>
                            <Navigation size={14} color="#34d399" />
                            <Text style={styles.locationText}>
                                {isUsingCurrentLocation && userAddress ? `${userAddress} ` : ''}
                                ({userLocation?.lat.toFixed(2)}°, {userLocation?.lng.toFixed(2)}°)
                            </Text>
                        </View>
                    )}
                    {locationError && (
                        <Text style={styles.errorText}>⚠️ {locationError}</Text>
                    )}
                </View>

                {/* Playback Controls */}
                <View style={styles.controlsCard}>
                    <View style={styles.controlsRow}>
                        <TouchableOpacity
                            onPress={() => setIsPlaying(!isPlaying)}
                            style={[styles.controlButton, isPlaying ? styles.pauseButton : styles.playButton]}
                        >
                            <Text style={styles.controlButtonText}>{isPlaying ? '⏸ 일시정지' : '▶️ 재생'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => {
                                setIsPlaying(false);
                                setCurrentTime(new Date());
                            }}
                            style={[styles.controlButton, styles.resetButton]}
                        >
                            <Text style={styles.controlButtonText}>🔄 초기화</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Date/Time Picker Replacement for Web/Native */}
                    {Platform.OS === 'web' && (
                        <View style={styles.datePickerRow}>
                            <Calendar size={18} color="#93c5fd" />
                            <input
                                type="datetime-local"
                                value={getLocalISOString(currentTime)}
                                onChange={(e) => handleDateChange(e.target.value)}
                                style={{
                                    backgroundColor: '#1e293b',
                                    color: '#ffffff',
                                    border: '1px solid #334155',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    fontSize: '14px',
                                    marginLeft: '8px',
                                    flex: 1,
                                    outline: 'none'
                                }}
                            />
                        </View>
                    )}

                    <View style={styles.speedRow}>
                        <TouchableOpacity
                            onPress={() => setTimeSpeed(1)}
                            style={[styles.speedButton, timeSpeed === 1 && styles.speedButtonActive]}
                        >
                            <Text style={[styles.speedButtonText, timeSpeed === 1 && styles.speedButtonTextActive]}>1일/0.1초</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setTimeSpeed(2)}
                            style={[styles.speedButton, timeSpeed === 2 && styles.speedButtonActive]}
                        >
                            <Text style={[styles.speedButtonText, timeSpeed === 2 && styles.speedButtonTextActive]}>1시간/0.1초</Text>
                        </TouchableOpacity>
                    </View>
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
                            <TouchableOpacity
                                style={styles.addPortIcon}
                                onPress={() => setIsAddPortVisible(!isAddPortVisible)}
                            >
                                <Plus size={20} color="#ffffff" />
                            </TouchableOpacity>
                        </View>

                        {/* Add Port Form */}
                        {isAddPortVisible && (
                            <View style={styles.addPortContainer}>
                                <input
                                    placeholder="항구 이름"
                                    value={newPortName}
                                    onChange={(e) => setNewPortName(e.target.value)}
                                    style={styles.formInput}
                                />
                                <input
                                    placeholder="오프셋(분)"
                                    type="number"
                                    value={newPortOffset}
                                    onChange={(e) => setNewPortOffset(e.target.value)}
                                    style={styles.formInput}
                                />
                                <TouchableOpacity style={styles.savePortButton} onPress={addPort}>
                                    <Text style={styles.savePortText}>추가</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Port Search and Current Location Toggle */}
                        <View style={styles.portControls}>
                            <TouchableOpacity
                                onPress={() => setIsUsingCurrentLocation(!isUsingCurrentLocation)}
                                style={[
                                    styles.currentLocButton,
                                    isUsingCurrentLocation && styles.currentLocButtonActive
                                ]}
                            >
                                <Text style={[
                                    styles.currentLocText,
                                    isUsingCurrentLocation && styles.currentLocTextActive
                                ]}>
                                    {isUsingCurrentLocation ? '📍 현 위치 사용 중' : '📍 현 위치로 지정'}
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.searchBar}>
                                <Text style={styles.searchIcon}>🔍</Text>
                                <input
                                    placeholder="항구 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: '14px',
                                        flex: 1,
                                        outline: 'none',
                                        padding: '4px',
                                        width: '100%'
                                    }}
                                />
                            </View>
                        </View>

                        <View style={styles.portGrid}>
                            {Object.entries(ports)
                                .filter(([_, port]) => (port.name || '').toLowerCase().includes(searchTerm.toLowerCase().trim()))
                                .map(([key, port]) => (
                                    <TouchableOpacity
                                        key={key}
                                        onPress={() => {
                                            setSelectedPort(key);
                                            setIsUsingCurrentLocation(false);
                                        }}
                                        style={[
                                            styles.portButton,
                                            (!isUsingCurrentLocation && selectedPort === key) ? styles.portButtonSelected : styles.portButtonNormal
                                        ]}
                                    >
                                        <View style={styles.portButtonInner}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[
                                                    styles.portName,
                                                    { color: (!isUsingCurrentLocation && selectedPort === key) ? '#ffffff' : '#cbd5e1' }
                                                ]}>
                                                    {port.name}
                                                </Text>
                                                <Text style={styles.portOffset}>
                                                    {port.offset > 0 ? '+' : ''}{Math.floor(port.offset / 60)}:{String(Math.abs(port.offset % 60)).padStart(2, '0')}
                                                </Text>
                                            </View>
                                            {!portOffsets[key] && (
                                                <TouchableOpacity onPress={() => deletePort(key)} style={{ padding: 4 }}>
                                                    <Trash2 size={14} color="#f87171" />
                                                </TouchableOpacity>
                                            )}
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
        fontSize: 14,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    tideTop: {
        top: 12,
        left: '50%',
        marginLeft: -16,
        color: '#93c5fd',
    },
    tideRight: {
        right: 12,
        top: '50%',
        marginTop: -8,
        color: '#67e8f9',
    },
    tideBottom: {
        bottom: 12,
        left: '50%',
        marginLeft: -16,
        color: '#93c5fd',
    },
    tideLeft: {
        left: 12,
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
    },
    // New styles for controls
    controlsCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#334155',
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 12,
    },
    controlButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
        minWidth: 120,
        alignItems: 'center',
    },
    playButton: {
        backgroundColor: '#16a34a',
    },
    pauseButton: {
        backgroundColor: '#dc2626',
    },
    resetButton: {
        backgroundColor: '#2563eb',
    },
    controlButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    speedRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    speedButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#334155',
        borderWidth: 1,
        borderColor: '#475569',
    },
    speedButtonActive: {
        backgroundColor: '#7c3aed',
        borderColor: '#8b5cf6',
    },
    speedButtonText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: '600',
    },
    speedButtonTextActive: {
        color: '#ffffff',
    },
    datePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155',
    },
    portControls: {
        marginBottom: 16,
        gap: 12,
    },
    currentLocButton: {
        backgroundColor: 'rgba(51, 65, 85, 0.5)',
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    currentLocButtonActive: {
        backgroundColor: '#059669',
        borderColor: '#10b981',
    },
    currentLocText: {
        color: '#cbd5e1',
        fontWeight: 'bold',
        fontSize: 14,
    },
    currentLocTextActive: {
        color: '#ffffff',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#334155',
    },
    searchIcon: {
        marginRight: 8,
        fontSize: 14,
    },
    addPortIcon: {
        marginLeft: 'auto',
        backgroundColor: '#3b82f6',
        borderRadius: 20,
        padding: 4,
    },
    addPortContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    formInput: {
        backgroundColor: '#1e293b',
        color: '#ffffff',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        outline: 'none',
    },
    savePortButton: {
        backgroundColor: '#10b981',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    savePortText: {
        color: '#ffffff',
        fontWeight: 'bold',
    }
});
