import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../Firebase/firebaseconfig';

interface Issue {
  id: string;
  title: string;
  category: string;
  location: { latitude: number; longitude: number };
  status: 'Reported' | 'In Progress' | 'Resolved';
  imageUrl: string;
}

const NearbyScreen = () => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  const [region, setRegion] = useState<Region>({
    latitude: 23.25238,
    longitude: 77.49625,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'issues'), snapshot => {
      const fetched = snapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          title: data.title || 'Untitled',
          category: data.category || 'Other',
          location: data.location
            ? { latitude: data.location.latitude, longitude: data.location.longitude }
            : { latitude: 0, longitude: 0 },
          status: data.status || 'Reported',
          imageUrl: data.imageUrl || 'https://via.placeholder.com/100',
        } as Issue;
      });
      setIssues(fetched);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={region}>
        {issues.map(issue =>
          issue.location.latitude && issue.location.longitude ? (
            <Marker
              key={issue.id}
              coordinate={{
                latitude: issue.location.latitude,
                longitude: issue.location.longitude,
              }}
              title={issue.title}
              description={issue.category}
            />
          ) : null
        )}
      </MapView>

      <FlatList
        data={issues}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text>{item.category}</Text>
              <Text>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', margin: 10, backgroundColor: '#fff', padding: 10, borderRadius: 10 },
  image: { width: 50, height: 50, borderRadius: 8 },
  title: { fontWeight: 'bold', fontSize: 16 },
});

export default NearbyScreen;
