import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import HomeScreen from '../screens/HomeScreen';          // main dashboard
import NearbyScreen from '../screens/NearbyScreen';      // nearby map + posts
import ReportIssueScreen from '../screens/ReportScreen'; // report form
import ProfileScreen from '../screens/ProfileScreen';    // profile/logout

const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#888',
        tabBarIcon: ({ color, size }) => {
          let iconName: string = 'home';

          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Nearby') iconName = 'map-marker-radius';
          else if (route.name === 'Report') iconName = 'plus-circle-outline';
          else if (route.name === 'Profile') iconName = 'account-circle-outline';

          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Nearby" component={NearbyScreen} />
      <Tab.Screen name="Report" component={ReportIssueScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabs;
