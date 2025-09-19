import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db } from '../Firebase/firebaseconfig';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { doc, getDoc, setDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import * as Location from 'expo-location';

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import MainTabs from './MainTabs';
import ReportScreen from '../screens/ReportScreen';
import ReportDetailsScreen from '../screens/ReportDetailsScreen';
import NearbyScreen from '../screens/NearbyScreen';

const Stack = createNativeStackNavigator();

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
];

const CustomHeader = ({ locationName }: { locationName: string }) => {
  const user = auth.currentUser;
  const [modalVisible, setModalVisible] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const onSelectLanguage = (lang: { code: string; label: string }) => {
    setModalVisible(false);
    alert(`Language set to ${lang.label}`);
  };

  return (
    <SafeAreaView style={styles.headerSafeArea}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.welcomeText}>Welcome {user?.displayName || 'User'}</Text>
          <Text style={styles.locationText}>{locationName}</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.actionButton}
          >
            <Icon name="translate" size={26} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={styles.actionButton}>
            <Icon name="logout" size={26} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Language selection modal */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Select a Language</Text>
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.languageButton}
                  onPress={() => onSelectLanguage(item)}
                >
                  <Text style={styles.languageButtonText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

// ✅ Optimized AppStack
const AppStack = ({ locationName }: { locationName: string }) => (
  <Stack.Navigator>
    <Stack.Screen
      name="MainTabs"
      component={MainTabs}
      options={{
        header: () => <CustomHeader locationName={locationName} />,
      }}
    />
    <Stack.Screen
      name="ReportIssue"
      component={ReportScreen}
      options={{ title: 'Report an Issue' }}
    />
    <Stack.Screen
      name="ReportDetails"
      component={ReportDetailsScreen}
      options={{ title: 'Issue Details' }}
    />
    <Stack.Screen
      name="nearby"
      component={NearbyScreen}
      options={{ title: 'Nearby issues' }}
    />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

const RootNavigator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [locationName, setLocationName] = useState('Locating...');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setInitializing(false);
        return;
      }

      if (!currentUser.emailVerified) {
        await auth.signOut();
        setUser(null);
        setInitializing(false);
        return;
      }

      // ✅ Show user immediately
      setUser(currentUser);
      setInitializing(false);

      // 🔄 Fetch location in background
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Low,
              timeout: 2000, // fail fast if GPS is slow
            });

            const address = await Location.reverseGeocodeAsync(location.coords);
            const { subregion, city } = address[0] || {};
            setLocationName(subregion && city ? `${subregion}, ${city}` : city || 'Unknown Location');

            // Save user doc if not exists
            const userDocRef = doc(db, 'users', currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
              const locationData = new GeoPoint(location.coords.latitude, location.coords.longitude);
              await setDoc(userDocRef, {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || '',
                photoURL: currentUser.photoURL || '',
                provider: currentUser.providerData[0]?.providerId || 'unknown',
                createdAt: serverTimestamp(),
                lastKnownLocation: locationData,
              });
            }
          } else {
            setLocationName('Permission Denied');
          }
        } catch (error) {
          console.error('Error fetching location:', error);
          setLocationName('Unavailable');
        }
      })();
    });

    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="App">
            {() => <AppStack locationName={locationName} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  headerSafeArea: {
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 20,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  languageButton: {
    width: '100%',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  languageButtonText: {
    textAlign: 'center',
    fontSize: 16,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RootNavigator;
