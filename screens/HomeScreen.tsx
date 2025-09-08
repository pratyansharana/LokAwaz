import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  SafeAreaView
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../Firebase/firebaseconfig';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define your app's navigation stack
// You would have other screens like MapScreen, ReportIssueScreen, etc.
type AppStackParamList = {
  Home: undefined;
  MapScreen: undefined; 
  ReportIssueScreen: undefined;
};

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;

// --- Data for our categories ---
const CATEGORIES = [
  { id: '1', title: 'Potholes & Roads', icon: 'road-variant', color: '#e74c3c' },
  { id: '2', title: 'Garbage Disposal', icon: 'trash-can-outline', color: '#27ae60' },
  { id: '3', title: 'Streetlight Issue', icon: 'lightbulb-on-outline', color: '#f1c40f' },
  { id: '4', title: 'Water Leakage', icon: 'water-pump', color: '#3498db' },
  { id: '5', title: 'Public Transport', icon: 'bus', color: '#9b59b6' },
  { id: '6', title: 'Other Issues', icon: 'alert-circle-outline', color: '#7f8c8d' },
];

const HomeScreen = ({ navigation }: HomeScreenProps) => {

  const handleCategoryPress = (category: typeof CATEGORIES[0]) => {
    // Navigate to a map/list screen, filtered by this category
    // For now, we'll just log it.
    console.log('Selected Category:', category.title);
    // Example navigation: navigation.navigate('MapScreen', { category: category.title });
  };

  const renderCategoryCard = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleCategoryPress(item)}>
      <Icon name={item.icon} size={40} color={item.color} />
      <Text style={styles.cardTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LokAwaz</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Icon name="logout" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>Hello, Citizen!</Text>
        <Text style={styles.promptText}>What's the issue?</Text>

        {/* Categories Grid */}
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryCard}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
        />
        
        {/* View All Button */}
        <TouchableOpacity 
          style={styles.viewAllButton} 
          onPress={() => console.log('Navigate to full map')}>
            {/* Example navigation: navigation.navigate('MapScreen') */}
          <Text style={styles.viewAllButtonText}>View All Issues on Map</Text>
        </TouchableOpacity>
      </View>

      {/* Report New Issue Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => console.log('Navigate to report issue screen')}>
          {/* Example navigation: navigation.navigate('ReportIssueScreen') */}
        <Icon name="plus" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  content: {
    flex: 1,
    padding: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#666',
  },
  promptText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  gridContainer: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  viewAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 30,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
});

export default HomeScreen;