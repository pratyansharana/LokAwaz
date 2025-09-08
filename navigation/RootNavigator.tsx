import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';

// Import your Firebase config and screens
import { auth } from '../Firebase/firebaseconfig'; // Ensure this path is correct
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';

// Create a stack navigator
const Stack = createNativeStackNavigator();

/**
 * The main navigator that decides which stack of screens to show based on auth state.
 */
const RootNavigator = () => {
  // State to hold the user object from Firebase, or null if not logged in
  const [user, setUser] = useState<User | null>(null);
  
  // State to check if the auth state has been loaded
  const [initializing, setInitializing] = useState(true);

  // Effect hook to subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) {
        setInitializing(false);
      }
    });

    // Cleanup the subscription when the component unmounts
    return unsubscribe;
  }, [initializing]);

  // While Firebase is checking the auth state, you can show a loading screen
  if (initializing) {
    // You can return a loading spinner here instead of null
    return null; 
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // User is signed in: Show the main app screens
          <Stack.Screen name="App" component={AppStack} />
        ) : (
          // No user is signed in: Show the authentication screens
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

/**
 * Stack for screens that are shown when the user is authenticated.
 */
const AppStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      {/* Add other app screens here (e.g., Report Issue, Profile) */}
    </Stack.Navigator>
  );
};

/**
 * Stack for screens that are shown for user authentication.
 */
const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
};

export default RootNavigator;