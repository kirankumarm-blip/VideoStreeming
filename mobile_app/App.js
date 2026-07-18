import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();

function NavigationRoot() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Let context initialize tokens silently
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#121217',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: '#FFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: '#0A0A0C' },
      }}
    >
      {user ? (
        <>
          <Stack.Screen 
            name="/dashboard" 
            component={DashboardScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="/watch" 
            component={PlayerScreen} 
            options={{ title: 'Lesson Details' }} 
          />
          <Stack.Screen 
            name="/profile" 
            component={ProfileScreen} 
            options={{ title: 'My Profile' }} 
          />
        </>
      ) : (
        <Stack.Screen 
          name="/login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <NavigationContainer theme={DarkTheme}>
            <StatusBar barStyle="light-content" backgroundColor="#0A0A0C" />
            <NavigationRoot />
          </NavigationContainer>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
