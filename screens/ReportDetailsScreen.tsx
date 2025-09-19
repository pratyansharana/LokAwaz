import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Image, 
    ScrollView, 
    TouchableOpacity, 
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// A simple function to get a color based on the report's status
const getStatusColor = (status) => {
    switch (status) {
        case 'Resolved':
            return '#27AE60'; // Green
        case 'In Progress':
            return '#F2994A'; // Orange
        case 'Reported':
        default:
            return '#EF4444'; // Red
    }
};

const ReportDetailsScreen = () => {
    const route = useRoute();
    // Expecting the full report object to be passed in route.params
    const { report } = route.params;

    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoadingSound, setIsLoadingSound] = useState(false);

    async function playSound() {
        if (!report.voice) return;
        
        setIsLoadingSound(true);

        if (sound) {
            await sound.stopAsync();
            setIsPlaying(false);
            setIsLoadingSound(false);
            return;
        }

        try {
            const { sound: newSound } = await Audio.Sound.createAsync(
               { uri: report.voice },
               { shouldPlay: true }
            );
            
            newSound.setOnPlaybackStatusUpdate(status => {
                if (status.didJustFinish) {
                    setIsPlaying(false);
                    setSound(null); // Allow re-playing
                    newSound.unloadAsync();
                }
            });

            setSound(newSound);
            setIsPlaying(true);
        } catch (error) {
            console.error("Error playing sound: ", error);
        } finally {
            setIsLoadingSound(false);
        }
    }

    // Unload the sound when the component is unmounted
    useEffect(() => {
        return sound
          ? () => {
              sound.unloadAsync(); 
            }
          : undefined;
    }, [sound]);

    // Format the timestamp for display
    const formattedDate = report.createdAt?.toDate().toLocaleString() || 'N/A';

    return (
        <ScrollView style={styles.container}>
            {/* --- Image Gallery --- */}
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.imageScrollView}>
                {report.images.map((uri, index) => (
                    <Image key={index} source={{ uri }} style={styles.image} />
                ))}
            </ScrollView>

            {/* --- Details Card --- */}
            <View style={styles.detailsCard}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                    <Text style={styles.statusText}>{report.status}</Text>
                </View>
                <Text style={styles.category}>{report.category}</Text>
                <Text style={styles.description}>{report.description}</Text>
                
                <View style={styles.infoRow}>
                    <Icon name="calendar-clock" size={16} color="#6B7280" />
                    <Text style={styles.infoText}>{formattedDate}</Text>
                </View>

                {/* --- Voice Note Player --- */}
                {report.voice && (
                    <TouchableOpacity style={styles.voiceButton} onPress={playSound} disabled={isLoadingSound}>
                        {isLoadingSound ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Icon name={isPlaying ? "stop-circle-outline" : "play-circle-outline"} size={22} color="#FFFFFF" />
                        )}
                        <Text style={styles.voiceButtonText}>
                            {isPlaying ? 'Stop Playback' : 'Play Voice Note'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* --- Location Map --- */}
            <View style={styles.mapCard}>
                <Text style={styles.sectionTitle}>Location</Text>
                <MapView
                    style={styles.map}
                    initialRegion={{
                        latitude: report.location.latitude,
                        longitude: report.location.longitude,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                    }}
                    scrollEnabled={false} // Make the map static
                >
                    <Marker coordinate={report.location} title={report.category} />
                </MapView>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F4F7',
    },
    imageScrollView: {
        height: 250,
    },
    image: {
        width: width,
        height: 250,
        resizeMode: 'cover',
    },
    detailsCard: {
        backgroundColor: '#FFFFFF',
        margin: 15,
        borderRadius: 12,
        padding: 20,
        marginTop: -40, // Pulls the card up over the image
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    statusBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 15,
    },
    statusText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    category: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#374151',
        lineHeight: 24,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    infoText: {
        marginLeft: 8,
        fontSize: 14,
        color: '#6B7280',
    },
    voiceButton: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        marginLeft: 10,
        fontSize: 16,
    },
    mapCard: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 15,
        marginBottom: 20,
        borderRadius: 12,
        padding: 15,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#1F2937',
    },
    map: {
        height: 200,
        borderRadius: 8,
    },
});

export default ReportDetailsScreen;