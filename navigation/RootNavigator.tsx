import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '../Firebase/firebaseconfig';

// Firestore imports
import { doc, getDoc, setDoc, serverTimestamp, GeoPoint } from 'firebase/firestore'; 
import * as Location from 'expo-location'; 

// Screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import MainTabs from './MainTabs'; // Bottom tab navigator after login

const Stack = createNativeStackNavigator();

// --- App (after login & verification) ---
const AppStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
  </Stack.Navigator>
);

// --- Auth (before login or signup) ---
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
  </Stack.Navigator>
);

const RootNavigator = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          // ✅ Only proceed if email is verified
          if (currentUser.emailVerified) {
            const userDocRef = doc(db, "users", currentUser.uid);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) {
              // Ask for location once when creating profile
              let locationData = null;
              const { status } = await Location.requestForegroundPermissionsAsync();

              if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({});
                locationData = new GeoPoint(location.coords.latitude, location.coords.longitude);
              }

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

            setUser(currentUser); // ✅ Verified user logged in
          } else {
            // 🚫 Not verified → sign out
            await auth.signOut();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("!!! BIG ERROR inside onAuthStateChanged !!!", error);
        setUser(null);
      } finally {
        if (initializing) setInitializing(false);
      }
    });

    return unsubscribe; // cleanup
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
          <Stack.Screen name="App" component={AppStack} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
