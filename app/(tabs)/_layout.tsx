import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';

import { HeaderButton } from '@/components/ui';
import { colors } from '@/constants/theme';
import { awaitingMySignature } from '@/lib/orgRules';
import { connectionsWithStatus } from '@/lib/selectors';
import { useAppState } from '@/lib/store';

export default function TabsLayout() {
  const state = useAppState();
  const requestCount = connectionsWithStatus(state, 'incoming').length;
  const signatureCount = awaitingMySignature(state).length;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.text, fontWeight: '800', fontSize: 22 },
        headerTitleAlign: 'left',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          tabBarBadge: requestCount || undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
          ),
          headerRight: () => (
            <HeaderButton
              icon="create-outline"
              label="New message"
              onPress={() => router.push('/people')}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orgs"
        options={{
          title: 'Orgs',
          tabBarBadge: signatureCount || undefined,
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
