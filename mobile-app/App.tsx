import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from './src/screens/DashboardScreen';
import MarketInputScreen from './src/screens/MarketInputScreen';
import OpportunitiesScreen from './src/screens/OpportunitiesScreen';
import AgentTraceScreen from './src/screens/AgentTraceScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PurchasesScreen from './src/screens/PurchasesScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4F46E5',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingBottom: 6,
            paddingTop: 6,
            height: 58,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard', tabBarIcon: () => null }} />
        <Tab.Screen name="Input" component={MarketInputScreen} options={{ tabBarLabel: 'Input', tabBarIcon: () => null }} />
        <Tab.Screen name="Opportunities" component={OpportunitiesScreen} options={{ tabBarLabel: 'Deals', tabBarIcon: () => null }} />
        <Tab.Screen name="Trace" component={AgentTraceScreen} options={{ tabBarLabel: 'Trace', tabBarIcon: () => null }} />
        <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarLabel: 'Alerts', tabBarIcon: () => null }} />
        <Tab.Screen name="Purchases" component={PurchasesScreen} options={{ tabBarLabel: 'Purchases', tabBarIcon: () => null }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}