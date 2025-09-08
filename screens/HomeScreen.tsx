import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  SafeAreaView,
  ScrollView,
  Image
} from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, QuerySnapshot, DocumentData, query, limit } from 'firebase/firestore';
import { auth, db } from '../Firebase/firebaseconfig';
import MapView, { Marker, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// --- MOCK DATA AND TYPES (Replace with your actual data fetching) ---
interface Issue {
  id: string;
  title: string;
  category: string;
  location: { latitude: number; longitude: number };
  status: 'Reported' | 'In Progress' | 'Resolved';
  imageUrl: string;
}

type AppStackParamList = {
  Home: undefined;
  FullMap: undefined;
  ReportIssue: { category: string };
};

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;

const CATEGORIES = [
  { id: '1', title: 'Potholes', icon: 'road-variant', color: '#e74c3c' },
  { id: '2', title: 'Garbage', icon: 'trash-can-outline', color: '#27ae60' },
  { id: '3', title: 'Streetlight', icon: 'lightbulb-on-outline', color: '#f1c40f' },
  { id: '4', title: 'Water Leak', icon: 'water-pump', color: '#3498db' },
  { id: '5', title: 'Other', icon: 'alert-circle-outline', color: '#7f8c8d' },
];
// --- END MOCK DATA ---

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [region, setRegion] = useState<Region>({
    latitude: 22.7196,
    longitude: 75.8577,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    // Fetch the 3 most recent issues
    const issuesQuery = query(collection(db, 'issues'), limit(3));
    const unsubscribe = onSnapshot(issuesQuery, (snapshot: QuerySnapshot<DocumentData>) => {
      const fetchedIssues = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      })) as Issue[];
      setRecentIssues(fetchedIssues);
    });
    return () => unsubscribe();
  }, []);

  const renderCategoryItem = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => navigation.navigate('ReportIssue', { category: item.title })}>
      <View style={[styles.categoryIconContainer, { backgroundColor: `${item.color}20` }]}>
        <Icon name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={styles.categoryTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderIssueCard = (item: Issue) => (
    <TouchableOpacity key={item.id} style={styles.issueCard}>
      <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/100' }} style={styles.issueCardImage} />
      <View style={styles.issueCardContent}>
        <Text style={styles.issueCardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.issueCardCategory}>{item.category}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>LokAwaz</Text>
          <TouchableOpacity onPress={() => signOut(auth)}>
            <Icon name="account-circle-outline" size={30} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Quick Report Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report an Issue</Text>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20 }}
          />
        </View>
        
        {/* Nearby Issues Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearby Issues</Text>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={region}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              {recentIssues.map(issue => (
                <Marker key={issue.id} coordinate={issue.location} />
              ))}
            </MapView>
          </View>
          {recentIssues.map(renderIssueCard)}
          
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('FullMap')}>
            <Text style={styles.viewAllButtonText}>View All on Full Map</Text>
            <Icon name="arrow-right" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 15, paddingHorizontal: 20 },
  categoryCard: {
    width: 100,
    height: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginRight: 15,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryTitle: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  map: { flex: 1 },
  issueCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  issueCardImage: { width: 50, height: 50, borderRadius: 8 },
  issueCardContent: { flex: 1, marginLeft: 15 },
  issueCardTitle: { fontSize: 16, fontWeight: '600' },
  issueCardCategory: { fontSize: 14, color: '#888' },
  viewAllButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    flexDirection: 'row',
  },
  viewAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default HomeScreen;