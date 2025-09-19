import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps'; // MODIFIED: Added this required import
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../Firebase/firebaseconfig';
import * as Location from 'expo-location';

// ... (Interface and getDistance function remain the same)
interface Issue {
  id: string;
  category: string;
  location: { latitude: number; longitude: number };
  status: 'Reported' | 'In Progress' | 'Resolved';
  images: string[];
  description: string;
  distance?: number;
}

const getDistance = (coord1: Location.LocationObjectCoords, coord2: { latitude: number; longitude: number }) => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth's radius in km

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const lat1 = toRad(coord1.latitude);
  const lat2 = toRad(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in km
};


const NearbyScreen = () => {
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
  
  useEffect(() => {
    const getUserLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    };

    getUserLocation();
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const unsubscribe = onSnapshot(collection(db, 'issues'), snapshot => {
      const fetchedIssues = snapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        const distance = getDistance(userLocation, data.location);

        return {
          id: doc.id,
          ...data,
          location: data.location
            ? { latitude: data.location.latitude, longitude: data.location.longitude }
            : { latitude: 0, longitude: 0 },
          distance: distance,
        } as Issue;
      });

      const sortedIssues = fetchedIssues.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      setIssues(sortedIssues);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userLocation]);

  const handleCardPress = (item: Issue) => {
    if (!mapRef.current) return;

    const newRegion = {
        latitude: item.location.latitude,
        longitude: item.location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
    };

    mapRef.current.animateToRegion(newRegion, 1000);

    setTimeout(() => {
        navigation.navigate('ReportDetails', { report: item });
    }, 500);
  };


  if (loading || !userLocation) {
    return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loaderText}>Finding issues near you...</Text>
        </View>
      );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView 
        ref={mapRef}
        style={{ flex: 1 }} 
        initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        }}
        showsUserLocation
      >
        {issues.map(issue =>
          issue.location.latitude && issue.location.longitude ? (
            <Marker
              key={issue.id}
              coordinate={issue.location}
              title={issue.category}
              description={issue.status}
            />
          ) : null
        )}
      </MapView>

      <FlatList
        data={issues}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => handleCardPress(item)}
          >
            <Image 
                source={{ uri: item.images[0] || 'https://via.placeholder.com/100' }} 
                style={styles.image} 
            />
            <View style={styles.cardDetails}>
              <Text style={styles.title}>{item.category}</Text>
              <Text style={styles.status}>{item.status}</Text>
              {item.distance !== undefined && (
                <Text style={styles.distance}>
                  {item.distance.toFixed(2)} km away
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    loaderContainer: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    loaderText: {
      marginTop: 10,
      fontSize: 16,
      color: '#666',
    },
    list: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '35%',
      backgroundColor: 'transparent',
    },
    card: { 
      flexDirection: 'row', 
      marginHorizontal: 10,
      marginVertical: 5,
      backgroundColor: '#fff', 
      padding: 10, 
      borderRadius: 10,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 5,
    },
    image: { 
      width: 60, 
      height: 60, 
      borderRadius: 8 
    },
    cardDetails: { 
      marginLeft: 15,
      justifyContent: 'center',
    },
    title: { 
      fontWeight: 'bold', 
      fontSize: 16 
    },
    status: {
      color: '#555',
      marginTop: 2,
    },
    distance: {
      color: '#007AFF',
      fontWeight: '600',
      marginTop: 4,
    }
  });


export default NearbyScreen;