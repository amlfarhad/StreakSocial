import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Switch,
  useColorScheme
} from 'react-native';
import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Markdown from 'react-native-markdown-display';
import { Feather } from '@expo/vector-icons';
import { supabase } from './lib/supabase';
import { Session, User } from '@supabase/supabase-js';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Use environment variable for production, fallback to local for dev
const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');

// ============================================
// THEME SYSTEM
// ============================================
const lightTheme = {
  bg: '#FDF8F3',           // Warm cream
  bgSecondary: '#F5EDE6',  // Warm light tan
  text: '#2C2417',         // Warm dark brown
  textSecondary: '#8B7355',// Warm brown
  accent: '#E07A5F',       // Terracotta
  accentSecondary: '#81B29A', // Sage green
  border: '#E8DFD5',       // Warm border
  card: '#FFFFFF',
};

const darkTheme = {
  bg: '#1A1A1A',
  bgSecondary: '#252525',
  text: '#F5F5F5',
  textSecondary: '#888888',
  accent: '#E07A5F',
  accentSecondary: '#81B29A',
  border: '#333333',
  card: '#2A2A2A',
};

type Theme = typeof lightTheme;
const ThemeContext = createContext<{ theme: Theme; isDark: boolean; toggle: () => void }>({
  theme: lightTheme,
  isDark: false,
  toggle: () => { },
});

// ============================================
// TYPES
// ============================================
interface Goal {
  id: string;
  title: string;
  description?: string;
  category: string;
  current_streak: number;
  frequency: string;
  lastCheckIn?: string; // ISO date string of last check-in
  checkedToday?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FeedItem {
  id: string;
  user: string;
  avatar: string;
  goal: string;
  streak: number;
  caption: string;
  timeAgo: string;
  likes: number;
  photoUri?: string; // Actual photo URI
}

interface CheckIn {
  id: string;
  goalId: string;
  goalTitle: string;
  photoUri: string;
  caption: string;
  streak: number;
  timestamp: Date;
}

// ============================================
// AUTH SCREEN - Login/Signup
// ============================================
function AuthScreen({ onAuthSuccess }: { onAuthSuccess: () => void }) {
  const { theme } = useContext(ThemeContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAuth = async () => {
    setMessage(null);

    if (!email || !password) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!name) {
          setMessage({ type: 'error', text: 'Please enter your name' });
          setIsLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Account created! Check your email to verify.' });
        setIsLoading(false);
        return;
      }
      onAuthSuccess();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.authContainer}>
          <Text style={[styles.authTitle, { color: theme.text }]}>StreakSocial</Text>
          <Text style={[styles.authSubtitle, { color: theme.textSecondary }]}>
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </Text>

          {message && (
            <View style={[
              styles.authMessage,
              { backgroundColor: message.type === 'error' ? '#FFEBE9' : '#E6F7ED' }
            ]}>
              <Text style={[
                styles.authMessageText,
                { color: message.type === 'error' ? '#D73A49' : '#22863A' }
              ]}>
                {message.text}
              </Text>
            </View>
          )}

          {!isLogin && (
            <TextInput
              style={[styles.authInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              placeholder="Your name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={[styles.authInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={[styles.authInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: theme.accent }]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.authButtonText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setMessage(null); }} style={styles.authSwitch}>
            <Text style={[styles.authSwitchText, { color: theme.textSecondary }]}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: theme.accent }}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================
// BOTTOM TAB BAR
// ============================================
function TabBar({ activeTab, onTabPress, notificationCount }: { activeTab: string; onTabPress: (tab: string) => void; notificationCount?: number }) {
  const { theme } = useContext(ThemeContext);
  const tabs: { id: string; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { id: 'feed', icon: 'camera', label: 'Feed' },
    { id: 'home', icon: 'check-square', label: 'Goals' },
    { id: 'trophy', icon: 'award', label: 'Compete' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
  ];

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.id}
          style={styles.tabItem}
          onPress={() => onTabPress(tab.id)}
        >
          <View style={{ position: 'relative' }}>
            <Feather
              name={tab.icon}
              size={22}
              color={activeTab === tab.id ? theme.accent : theme.textSecondary}
            />
            {tab.id === 'settings' && notificationCount && notificationCount > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#FF3B30', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{notificationCount}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.tabLabel,
            { color: activeTab === tab.id ? theme.accent : theme.textSecondary }
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}


// ============================================
// HOME SCREEN
// ============================================
interface AIInsight {
  message: string;
  urgency: 'low' | 'medium' | 'high';
  emoji: string;
}

function HomeScreen({
  goals,
  onGoalPress,
  onAddGoal,
  onCheckIn
}: {
  goals: Goal[];
  onGoalPress: (goal: Goal) => void;
  onAddGoal: () => void;
  onCheckIn: (goal: Goal) => void;
}) {
  const { theme } = useContext(ThemeContext);
  const [timeLeft, setTimeLeft] = useState('');
  const [isCheckInWindow, setIsCheckInWindow] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  // Fetch proactive AI insight on mount
  useEffect(() => {
    const fetchInsight = async () => {
      if (goals.length === 0) return;

      setInsightLoading(true);
      try {
        // Find the goal with the lowest streak (most at-risk)
        const atRiskGoal = goals.reduce((min, g) => g.current_streak < min.current_streak ? g : min, goals[0]);

        const response = await fetch(`${API_URL}/ai/agentic-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Give me a very brief (1-2 sentences) motivational insight for my goal "${atRiskGoal.title}" with a ${atRiskGoal.current_streak} day streak. Be encouraging but concise.`,
            goal_id: atRiskGoal.id,
            goal_title: atRiskGoal.title,
            streak: atRiskGoal.current_streak
          })
        });

        if (response.ok) {
          const data = await response.json();
          const streak = atRiskGoal.current_streak;
          setAiInsight({
            message: data.message.slice(0, 150) + (data.message.length > 150 ? '...' : ''),
            urgency: streak === 0 ? 'high' : streak < 7 ? 'medium' : 'low',
            emoji: data.is_agentic ? '🤖' : '💡'
          });
        }
      } catch (error) {
        console.log('Insight fetch error:', error);
      } finally {
        setInsightLoading(false);
      }
    };

    fetchInsight();
  }, [goals.length]); // Refetch when goals change

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const hour = now.getHours();

      // Check-in window: 8 AM - 10 PM (can customize per user preference later)
      if (hour >= 8 && hour < 22) {
        setIsCheckInWindow(true);
        // Calculate time until 10 PM
        const endTime = new Date();
        endTime.setHours(22, 0, 0, 0);
        const diff = endTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${mins}m`);
      } else {
        setIsCheckInWindow(false);
        // Calculate time until 8 AM
        const nextWindow = new Date();
        if (hour >= 22) {
          nextWindow.setDate(nextWindow.getDate() + 1);
        }
        nextWindow.setHours(8, 0, 0, 0);
        const diff = nextWindow.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}h ${mins}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.greeting, { color: theme.text }]}>{getGreeting()}</Text>
      <Text style={[styles.subGreeting, { color: theme.textSecondary }]}>
        You have {goals.length} active goals
      </Text>

      {/* AI Coach Insight Card */}
      {(aiInsight || insightLoading) && (
        <View style={[styles.checkInBanner, {
          backgroundColor: theme.accentSecondary + '15',
          borderColor: theme.accentSecondary,
          marginBottom: 12
        }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 14 }}>{aiInsight?.emoji || '🤖'}</Text>
              <Text style={[styles.checkInBannerTitle, { color: theme.accentSecondary, fontSize: 13 }]}>
                AI Coach says:
              </Text>
              <View style={{ backgroundColor: theme.accentSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>AGENTIC</Text>
              </View>
            </View>
            {insightLoading ? (
              <ActivityIndicator size="small" color={theme.accentSecondary} style={{ alignSelf: 'flex-start' }} />
            ) : (
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20, paddingBottom: 4 }}>
                {aiInsight?.message}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Check-in Window Banner */}
      <View style={[styles.checkInBanner, {
        backgroundColor: isCheckInWindow ? theme.accent + '15' : theme.bgSecondary,
        borderColor: isCheckInWindow ? theme.accent : theme.border
      }]}>
        <View style={styles.checkInBannerLeft}>
          <Text style={[styles.checkInBannerTitle, { color: theme.text }]}>
            {isCheckInWindow ? '📸 Check-in Window Open' : '⏰ Next Window'}
          </Text>
          <Text style={[styles.checkInBannerTime, { color: isCheckInWindow ? theme.accent : theme.textSecondary }]}>
            {isCheckInWindow ? `${timeLeft} remaining` : `Opens in ${timeLeft}`}
          </Text>
        </View>
        {isCheckInWindow && (
          <View style={[styles.checkInBannerBadge, { backgroundColor: theme.accent }]}>
            <Text style={styles.checkInBannerBadgeText}>LIVE</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>TODAY</Text>

        {goals.map((goal) => {
          // Calculate milestone progress
          const milestones = [7, 21, 30, 100];
          const nextMilestone = milestones.find(m => goal.current_streak < m) || 100;
          const prevMilestone = milestones.filter(m => goal.current_streak >= m).pop() || 0;
          const milestoneProgress = prevMilestone > 0 ? 100 : Math.round((goal.current_streak / nextMilestone) * 100);

          return (
            <TouchableOpacity
              key={goal.id}
              style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => onGoalPress(goal)}
              activeOpacity={0.7}
            >
              <TouchableOpacity
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: isCheckInWindow ? theme.accent : theme.bgSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: isCheckInWindow ? theme.accent : theme.border
                }}
                onPress={() => onCheckIn(goal)}
              >
                <Text style={{ fontSize: 24 }}>{isCheckInWindow ? '📷' : '➕'}</Text>
              </TouchableOpacity>
              <View style={styles.goalContent}>
                <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ fontSize: 16, marginRight: 4 }}>🔥</Text>
                  <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 16 }}>{goal.current_streak}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14, marginLeft: 4 }}>day streak</Text>
                  {goal.current_streak >= 7 && (
                    <Text style={{ marginLeft: 8 }}>
                      {goal.current_streak >= 100 ? '💎' : goal.current_streak >= 30 ? '🏆' : goal.current_streak >= 21 ? '🌟' : '⭐'}
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.streakBadge, { backgroundColor: theme.accentSecondary + '20' }]}>
                  <Text style={[styles.streakText, { color: theme.accentSecondary }]}>
                    {milestoneProgress}%
                  </Text>
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>to {nextMilestone}d</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.accent }]}
          onPress={onAddGoal}
        >
          <Text style={styles.addButtonText}>+ Add New Goal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ============================================
// FEED SCREEN with Integrity Algorithm
// ============================================
interface ApiFeedItem {
  id: string;
  user_id: string;
  user_name: string;
  avatar: string;
  goal_title: string;
  streak: number;
  caption: string;
  category: string;
  integrity_score: number;
  integrity_badge: string;
  consistency_rate: number;
  time_ago: string;
}

interface FriendRequest {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
}

function FeedScreen({
  myCheckIns,
  formatTimeAgo
}: {
  myCheckIns: CheckIn[];
  formatTimeAgo: (date: Date) => string;
}) {
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState<'friends' | 'community' | 'photos'>('community');
  const [feedData, setFeedData] = useState<ApiFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandRequests, setExpandRequests] = useState(false);

  // Fetch feed data
  useEffect(() => {
    fetchFeed();
    fetchPendingRequests();
  }, [activeTab]);

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'friends') {
        params.set('friends_only', 'true');
      }
      const response = await fetch(`${API_URL}/checkins/feed?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFeedData(data);
      }
    } catch (e) {
      console.log('Feed fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`${API_URL}/friends/requests`);
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data);
      }
    } catch (e) {
      console.log('Requests fetch error:', e);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/friends/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.log('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (username: string) => {
    try {
      const response = await fetch(`${API_URL}/friends/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      if (response.ok) {
        Alert.alert('Success', 'Friend request sent!');
        setShowAddFriend(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to send request');
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    try {
      const response = await fetch(`${API_URL}/friends/accept/${friendshipId}`, { method: 'POST' });
      if (response.ok) {
        fetchPendingRequests();
        fetchFeed();
      }
    } catch (e) {
      console.log('Accept error:', e);
    }
  };

  const getBadgeEmoji = (badge: string) => {
    switch (badge) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return null;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'gold': return '#FFD700';
      case 'silver': return '#C0C0C0';
      case 'bronze': return '#CD7F32';
      default: return theme.accent;
    }
  };

  // Convert real check-ins to display format
  const myPhotosFeed = myCheckIns.map(c => ({
    id: c.id,
    user_name: 'You',
    avatar: '😊',
    goal_title: c.goalTitle,
    streak: c.streak,
    caption: c.caption,
    time_ago: formatTimeAgo(c.timestamp),
    photoUri: c.photoUri,
    integrity_badge: 'none',
    consistency_rate: 100,
    integrity_score: 0
  }));

  const displayFeed = activeTab === 'photos' ? myPhotosFeed : feedData;

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.pageTitle, { color: theme.text, marginBottom: 0 }]}>Feed</Text>
        <TouchableOpacity
          style={{ backgroundColor: theme.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => setShowAddFriend(true)}
        >
          <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>+ Add Friend</Text>
        </TouchableOpacity>
      </View>

      {/* Pending Friend Requests - Compact Collapsible */}
      {pendingRequests.length > 0 && (
        <TouchableOpacity
          onPress={() => setExpandRequests(!expandRequests)}
          activeOpacity={0.8}
          style={{
            backgroundColor: theme.accentSecondary + '15',
            borderRadius: 14,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.accentSecondary + '30'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                backgroundColor: theme.accentSecondary,
                width: 28,
                height: 28,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{pendingRequests.length}</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: '600', fontSize: 15 }}>
                Friend Request{pendingRequests.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={{ color: theme.accentSecondary, fontSize: 18 }}>
              {expandRequests ? '▲' : '▼'}
            </Text>
          </View>

          {/* Expanded view - show max 3 requests */}
          {expandRequests && (
            <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: theme.accentSecondary + '30', paddingTop: 14 }}>
              {pendingRequests.slice(0, 3).map(req => (
                <View key={req.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ fontSize: 28, marginRight: 12 }}>{req.avatar}</Text>
                  <Text style={{ flex: 1, color: theme.text, fontWeight: '600', fontSize: 15 }}>{req.display_name}</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: theme.accentSecondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
                    onPress={() => acceptRequest(req.id)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Accept</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {pendingRequests.length > 3 && (
                <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8, fontSize: 13 }}>
                  +{pendingRequests.length - 3} more requests
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Tab Bar */}
      <View style={[styles.feedTabs, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.feedTab, activeTab === 'friends' && { backgroundColor: theme.accent }]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.feedTabText, { color: activeTab === 'friends' ? '#FFF' : theme.textSecondary }]}>
            Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedTab, activeTab === 'community' && { backgroundColor: theme.accent }]}
          onPress={() => setActiveTab('community')}
        >
          <Text style={[styles.feedTabText, { color: activeTab === 'community' ? '#FFF' : theme.textSecondary }]}>
            Community
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedTab, activeTab === 'photos' && { backgroundColor: theme.accent }]}
          onPress={() => setActiveTab('photos')}
        >
          <Text style={[styles.feedTabText, { color: activeTab === 'photos' ? '#FFF' : theme.textSecondary }]}>
            My Photos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Integrity Algorithm Indicator */}
      {activeTab !== 'photos' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>Sorted by </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.accent + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, color: theme.accent, fontWeight: '600' }}>INTEGRITY SCORE</Text>
          </View>
          <Text style={{ fontSize: 12, color: theme.textSecondary }}> • Consistency = Visibility</Text>
        </View>
      )}

      {isLoading && activeTab !== 'photos' ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : displayFeed.length === 0 ? (
        <View style={{
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderRadius: 20,
          borderWidth: 1,
          padding: 60,
          alignItems: 'center',
          marginTop: 20
        }}>
          <Text style={{ fontSize: 80, marginBottom: 24 }}>
            {activeTab === 'friends' ? '👥' : activeTab === 'photos' ? '📸' : '🌍'}
          </Text>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
            {activeTab === 'friends' ? 'No Friends Added Yet' : activeTab === 'photos' ? 'No Check-ins Yet' : 'No Posts Yet'}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
            {activeTab === 'friends' ? 'Add friends to see their check-ins and cheer them on!' :
              activeTab === 'photos' ? 'Complete your first check-in to start building your streak!' :
                'Be the first to share your progress with the community!'}
          </Text>
        </View>
      ) : (
        displayFeed.map((item: any) => (
          <View key={item.id} style={[styles.feedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.feedHeader}>
              <View style={styles.feedUser}>
                <Text style={styles.feedAvatar}>{item.avatar}</Text>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.feedUserName, { color: theme.text }]}>{item.user_name}</Text>
                    {getBadgeEmoji(item.integrity_badge) && (
                      <Text style={{ marginLeft: 6, fontSize: 16 }}>{getBadgeEmoji(item.integrity_badge)}</Text>
                    )}
                  </View>
                  <Text style={[styles.feedGoal, { color: theme.textSecondary }]}>{item.goal_title}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.feedStreak, { backgroundColor: getBadgeColor(item.integrity_badge) + '20' }]}>
                  <Text style={[styles.feedStreakText, { color: getBadgeColor(item.integrity_badge) }]}>🔥 {item.streak} days</Text>
                </View>
                {item.consistency_rate && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                    <Text style={{ fontSize: 13, color: theme.accentSecondary, fontWeight: '600' }}>{item.consistency_rate}%</Text>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginLeft: 4 }}>consistent</Text>
                  </View>
                )}
              </View>
            </View>

            {item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={styles.feedImage} />
            ) : (
              <View style={[styles.feedImagePlaceholder, { backgroundColor: theme.bgSecondary }]}>
                <Text style={{ fontSize: 52 }}>📷</Text>
                <Text style={{ color: theme.textSecondary, marginTop: 8 }}>Photo check-in</Text>
              </View>
            )}

            <Text style={[styles.feedCaption, { color: theme.text }]}>{item.caption}</Text>

            <View style={styles.feedFooter}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={[styles.likeButton, { flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 18 }}>❤️</Text>
                  <Text style={{ color: theme.textSecondary, marginLeft: 6, fontSize: 14, fontWeight: '600' }}>{item.likes || Math.floor(Math.random() * 20) + 1}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ marginLeft: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16 }}>💬</Text>
                  <Text style={{ color: theme.textSecondary, marginLeft: 6, fontSize: 14, fontWeight: '600' }}>{Math.floor(Math.random() * 5)}</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.feedTime, { color: theme.textSecondary }]}>{item.time_ago}</Text>
            </View>
          </View>
        ))
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }}>Add Friend</Text>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.bgSecondary,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => { setShowAddFriend(false); setSearchResults([]); setSearchQuery(''); }}
              >
                <Text style={{ fontSize: 20, color: theme.textSecondary, fontWeight: '600' }}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: theme.bgSecondary, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, color: theme.text, fontSize: 16 }}
                placeholder="Search by username..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              <TouchableOpacity
                style={{ backgroundColor: theme.accent, paddingHorizontal: 20, borderRadius: 16, justifyContent: 'center', marginLeft: 10 }}
                onPress={handleSearch}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Search</Text>
              </TouchableOpacity>
            </View>

            {isSearching && <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />}

            {searchResults.map(user => (
              <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Text style={{ fontSize: 32, marginRight: 14 }}>{user.avatar}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', fontSize: 16 }}>{user.display_name}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>@{user.username}</Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: user.friendship_status ? theme.bgSecondary : theme.accent,
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20
                  }}
                  onPress={() => sendFriendRequest(user.username)}
                  disabled={!!user.friendship_status}
                >
                  <Text style={{ color: user.friendship_status ? theme.textSecondary : '#FFF', fontWeight: '600', fontSize: 14 }}>
                    {user.friendship_status === 'accepted' ? 'Friends' : user.friendship_status === 'pending' ? 'Pending' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {searchResults.length === 0 && searchQuery && !isSearching && (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 15 }}>
                  No users found matching "{searchQuery}"
                </Text>
              </View>
            )}

            {searchResults.length === 0 && !searchQuery && !isSearching && (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>👋</Text>
                <Text style={{ color: theme.text, textAlign: 'center', fontSize: 16, fontWeight: '600', marginBottom: 6 }}>
                  Find your friends!
                </Text>
                <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 14 }}>
                  Search by username to connect and support each other's streaks
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ============================================
// SETTINGS SCREEN
// ============================================
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  color: string;
  read: boolean;
  time_ago: string;
}

function SettingsScreen() {
  const { theme, isDark, toggle } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    fetchNotifications();
    fetchUserStats();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: NotificationItem) => !n.read).length);
      }
    } catch (e) {
      console.log('Notifications fetch error:', e);
    }
  };

  const fetchUserStats = async () => {
    try {
      const res = await fetch(`${API_URL}/achievements/stats`);
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (e) {
      console.log('Stats fetch error:', e);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, { method: 'POST' });
      fetchNotifications();
    } catch (e) {
      console.log('Mark read error:', e);
    }
  };

  const getColorForType = (color: string) => {
    switch (color) {
      case 'warning': return '#FF9500';
      case 'success': return '#34C759';
      case 'gold': return '#FFD700';
      case 'accent': return theme.accent;
      default: return theme.accentSecondary;
    }
  };

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.pageTitle, { color: theme.text, marginBottom: 0 }]}>Settings</Text>
        <TouchableOpacity
          style={{ position: 'relative' }}
          onPress={() => setShowNotifications(!showNotifications)}
        >
          <Feather name="bell" size={24} color={theme.text} />
          {unreadCount > 0 && (
            <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3B30', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* User Level Card */}
      {userStats && (
        <View style={{ backgroundColor: theme.accent + '15', borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 36, marginRight: 12 }}>{userStats.level_emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18 }}>Level {userStats.level}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{userStats.level_name} • {userStats.total_xp} XP</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{userStats.achievements_unlocked}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 11 }}>badges</Text>
            </View>
          </View>
          <View style={{ backgroundColor: theme.bgSecondary, borderRadius: 8, height: 6, overflow: 'hidden', marginTop: 12 }}>
            <View style={{ backgroundColor: theme.accent, height: 6, width: `${userStats.progress_percent}%` }} />
          </View>
        </View>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <View style={{ backgroundColor: theme.card, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>Notifications</Text>
            <TouchableOpacity onPress={markAllRead}>
              <Text style={{ color: theme.accent, fontSize: 13 }}>Mark all read</Text>
            </TouchableOpacity>
          </View>
          {notifications.length === 0 ? (
            <Text style={{ color: theme.textSecondary, textAlign: 'center', padding: 20 }}>No notifications</Text>
          ) : (
            notifications.slice(0, 5).map(notif => (
              <View key={notif.id} style={{ flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border, opacity: notif.read ? 0.6 : 1 }}>
                <Text style={{ fontSize: 24, marginRight: 12 }}>{notif.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '600', fontSize: 13 }}>{notif.title}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{notif.message}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>{notif.time_ago}</Text>
                </View>
                {!notif.read && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getColorForType(notif.color), marginTop: 4 }} />
                )}
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>APPEARANCE</Text>

        <View style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Dark Mode</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>
              {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggle}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ACCOUNT</Text>

        <TouchableOpacity style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Profile</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Edit your profile info</Text>
          </View>
          <Text style={{ color: theme.textSecondary }}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Push Notifications</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Get streak reminders</Text>
          </View>
          <Text style={{ color: theme.textSecondary }}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Privacy</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Control who sees your check-ins</Text>
          </View>
          <Text style={{ color: theme.textSecondary }}>→</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ABOUT</Text>

        <View style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Version</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>1.0.0 (Hackathon Edition)</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>HEALTH DISCLAIMER</Text>

        <View style={[styles.settingRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingDesc, { color: theme.textSecondary, lineHeight: 20 }]}>
              ⚕️ This app is not a substitute for professional medical, mental health, or fitness advice.
              Always consult qualified healthcare providers for personalized guidance.
              If you're in crisis, please contact emergency services or a crisis helpline.
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { borderColor: theme.accent }]}
        onPress={async () => {
          await supabase.auth.signOut();
        }}
      >
        <Text style={[styles.logoutText, { color: theme.accent }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


// ============================================
// TROPHY/COMPETE SCREEN
// ============================================
interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  avatar: string;
  total_score: number;
  highest_streak: number;
  badges: string[];
}

interface ChallengeData {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  duration_days: number;
  goal_checkins: number;
  prize_emoji: string;
  prize_name: string;
  xp_reward: number;
  participants: number;
  user_joined: boolean;
  user_progress: number;
  user_completed: boolean;
  ends_in: string | null;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  points: number;
  category: string;
  unlocked: boolean;
}

interface UserStats {
  total_xp: number;
  level: number;
  level_name: string;
  level_emoji: string;
  xp_to_next_level: number;
  progress_percent: number;
  achievements_unlocked: number;
  total_achievements: number;
}

function TrophyScreen() {
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'challenges' | 'achievements'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'leaderboard') {
        const res = await fetch(`${API_URL}/checkins/leaderboard`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.entries);
          setUserRank(data.user_rank);
        }
      } else if (activeTab === 'challenges') {
        const res = await fetch(`${API_URL}/challenges/active`);
        if (res.ok) {
          const data = await res.json();
          setChallenges(data);
        }
      } else if (activeTab === 'achievements') {
        const [achRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/achievements/`),
          fetch(`${API_URL}/achievements/stats`)
        ]);
        if (achRes.ok) setAchievements(await achRes.json());
        if (statsRes.ok) setUserStats(await statsRes.json());
      }
    } catch (e) {
      console.log('Trophy data fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const res = await fetch(`${API_URL}/challenges/join/${challengeId}`, { method: 'POST' });
      if (res.ok) {
        Alert.alert('🎉 Joined!', 'Good luck with the challenge!');
        fetchData();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to join challenge');
    }
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Compete</Text>

      {/* User Stats Banner */}
      {userStats && activeTab === 'achievements' && (
        <View style={{ backgroundColor: theme.accent + '15', borderRadius: 16, padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 32, marginRight: 12 }}>{userStats.level_emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18 }}>Level {userStats.level}: {userStats.level_name}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{userStats.total_xp} XP • {userStats.xp_to_next_level} to next level</Text>
            </View>
          </View>
          <View style={{ backgroundColor: theme.bgSecondary, borderRadius: 8, height: 8, overflow: 'hidden' }}>
            <View style={{ backgroundColor: theme.accent, height: 8, width: `${userStats.progress_percent}%` }} />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            {userStats.achievements_unlocked} / {userStats.total_achievements} achievements unlocked
          </Text>
        </View>
      )}

      {/* Tab Bar */}
      <View style={[styles.feedTabs, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.feedTab, activeTab === 'leaderboard' && { backgroundColor: theme.accent }]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.feedTabText, { color: activeTab === 'leaderboard' ? '#FFF' : theme.textSecondary }]}>
            🏆 Leaderboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedTab, activeTab === 'challenges' && { backgroundColor: theme.accent }]}
          onPress={() => setActiveTab('challenges')}
        >
          <Text style={[styles.feedTabText, { color: activeTab === 'challenges' ? '#FFF' : theme.textSecondary }]}>
            ⚔️ Challenges
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedTab, activeTab === 'achievements' && { backgroundColor: theme.accent }]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text style={[styles.feedTabText, { color: activeTab === 'achievements' ? '#FFF' : theme.textSecondary }]}>
            🎖️ Badges
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      ) : activeTab === 'leaderboard' ? (
        <>
          <View style={{ marginTop: 16 }}>
            {userRank && (
              <View style={{ backgroundColor: theme.accentSecondary + '20', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <Text style={{ color: theme.accentSecondary, fontWeight: '600', textAlign: 'center' }}>
                  Your Rank: #{userRank} 🎯
                </Text>
              </View>
            )}
            {leaderboard.map((entry, idx) => (
              <View key={entry.user_id} style={[styles.goalCard, {
                backgroundColor: idx < 3 ? theme.accent + '08' : theme.card,
                borderColor: idx < 3 ? theme.accent + '40' : theme.border,
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16
              }]}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: idx < 3 ? '#FFD700' + '30' : theme.bgSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12
                }}>
                  <Text style={{ fontSize: idx < 3 ? 20 : 14, fontWeight: '700', color: idx < 3 ? '#FFD700' : theme.textSecondary }}>
                    {getRankEmoji(entry.rank)}
                  </Text>
                </View>
                <Text style={{ fontSize: 32, marginRight: 12 }}>{entry.avatar}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{entry.user_name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ fontSize: 14 }}>🔥</Text>
                    <Text style={{ color: theme.accent, fontWeight: '600', fontSize: 14, marginLeft: 4 }}>{entry.highest_streak}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 13, marginLeft: 4 }}>day streak</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.accent, fontWeight: '800', fontSize: 18 }}>{Math.round(entry.total_score)}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>points</Text>
                </View>
              </View>
            ))}
            {leaderboard.length === 0 && (
              <View style={{
                alignItems: 'center',
                paddingVertical: 60,
                paddingHorizontal: 24
              }}>
                <Text style={{ fontSize: 80, marginBottom: 20 }}>🏆</Text>
                <Text style={{
                  color: theme.text,
                  fontSize: 22,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 12
                }}>
                  Leaderboard Coming Soon!
                </Text>
                <Text style={{
                  color: theme.textSecondary,
                  fontSize: 16,
                  textAlign: 'center',
                  lineHeight: 24
                }}>
                  Start checking in to your goals and you'll see rankings here. Be the first to top the charts!
                </Text>
              </View>
            )}
          </View>
        </>
      ) : activeTab === 'challenges' ? (
        <View style={{ marginTop: 20 }}>
          {challenges.map(challenge => (
            <View key={challenge.id} style={{
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 24,
              marginBottom: 20
            }}>
              {/* Header: Emoji + Title/Description */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: theme.bgSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <Text style={{ fontSize: 40 }}>{challenge.emoji}</Text>
                </View>
                <Text style={{
                  color: theme.text,
                  fontWeight: '700',
                  fontSize: 20,
                  textAlign: 'center',
                  marginBottom: 8
                }}>
                  {challenge.name}
                </Text>
                <Text style={{
                  color: theme.textSecondary,
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 22
                }}>
                  {challenge.description}
                </Text>
              </View>

              {/* Stats Row */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 20,
                paddingHorizontal: 10
              }}>
                <View style={{
                  backgroundColor: theme.bgSecondary,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12
                }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>🏅 {challenge.prize_name}</Text>
                </View>
                <View style={{
                  backgroundColor: theme.accentSecondary + '20',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12
                }}>
                  <Text style={{ color: theme.accentSecondary, fontSize: 14, fontWeight: '600' }}>+{challenge.xp_reward} XP</Text>
                </View>
                <View style={{
                  backgroundColor: theme.bgSecondary,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 12
                }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 14 }}>👥 {challenge.participants} joined</Text>
                </View>
              </View>

              {/* Progress or Join Button */}
              {challenge.user_joined ? (
                <View style={{ marginTop: 8 }}>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12
                  }}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
                      {challenge.user_progress} / {challenge.goal_checkins} days
                    </Text>
                    <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>
                      {challenge.ends_in}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: theme.bgSecondary,
                    borderRadius: 12,
                    height: 16,
                    overflow: 'hidden'
                  }}>
                    <View style={{
                      backgroundColor: challenge.user_completed ? theme.accentSecondary : theme.accent,
                      height: 16,
                      width: `${Math.min(100, (challenge.user_progress / challenge.goal_checkins) * 100)}%`,
                      borderRadius: 12
                    }} />
                  </View>
                  {challenge.user_completed && (
                    <View style={{
                      backgroundColor: theme.accentSecondary + '20',
                      borderRadius: 14,
                      paddingVertical: 14,
                      marginTop: 16
                    }}>
                      <Text style={{
                        color: theme.accentSecondary,
                        textAlign: 'center',
                        fontWeight: '700',
                        fontSize: 16
                      }}>
                        ✅ Challenge Completed!
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={{
                    backgroundColor: theme.accent,
                    borderRadius: 16,
                    paddingVertical: 18,
                    alignItems: 'center',
                    marginTop: 8
                  }}
                  onPress={() => joinChallenge(challenge.id)}
                >
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 17 }}>Join Challenge</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {challenges.length === 0 && (
            <View style={{
              alignItems: 'center',
              paddingVertical: 60,
              paddingHorizontal: 24
            }}>
              <Text style={{ fontSize: 80, marginBottom: 20 }}>⚔️</Text>
              <Text style={{
                color: theme.text,
                fontSize: 22,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 12
              }}>
                No Active Challenges
              </Text>
              <Text style={{
                color: theme.textSecondary,
                fontSize: 16,
                textAlign: 'center',
                lineHeight: 24
              }}>
                Challenges will appear here soon! Compete with friends to earn badges and XP.
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {achievements.map(ach => (
            <View key={ach.id} style={{
              width: '48%',
              backgroundColor: ach.unlocked ? theme.card : theme.bgSecondary,
              borderRadius: 16,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: ach.unlocked ? theme.accent + '40' : theme.border,
              opacity: ach.unlocked ? 1 : 0.5
            }}>
              {ach.unlocked && (
                <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: theme.accentSecondary, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 12 }}>✓</Text>
                </View>
              )}
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: ach.unlocked ? theme.accent + '20' : theme.bgSecondary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 28 }}>{ach.emoji}</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: '700', textAlign: 'center', fontSize: 14, marginBottom: 4 }}>{ach.name}</Text>
              <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 12, lineHeight: 16 }}>{ach.description}</Text>
              <View style={{ backgroundColor: ach.unlocked ? theme.accent + '20' : theme.bgSecondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 10 }}>
                <Text style={{ color: ach.unlocked ? theme.accent : theme.textSecondary, fontSize: 12, fontWeight: '600' }}>+{ach.points} XP</Text>
              </View>
            </View>
          ))}
          {achievements.length === 0 && (
            <View style={{
              width: '100%',
              alignItems: 'center',
              paddingVertical: 60,
              paddingHorizontal: 24
            }}>
              <Text style={{ fontSize: 80, marginBottom: 20 }}>🎖️</Text>
              <Text style={{
                color: theme.text,
                fontSize: 22,
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: 12
              }}>
                Badges Coming Soon!
              </Text>
              <Text style={{
                color: theme.textSecondary,
                fontSize: 16,
                textAlign: 'center',
                lineHeight: 24
              }}>
                Complete challenges and maintain streaks to unlock achievements and earn XP!
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ============================================
// GOAL DETAIL SCREEN
// ============================================
function GoalDetailScreen({
  goal,
  onBack,
  onAskCoach,
  onCheckIn
}: {
  goal: Goal;
  onBack: () => void;
  onAskCoach: () => void;
  onCheckIn: () => void;
}) {
  const { theme } = useContext(ThemeContext);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // getDay() returns 0=Sunday, 1=Monday, etc. Convert to our array index (0=Mon, 6=Sun)
  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1; // Convert: Sun(0)→6, Mon(1)→0, ..., Sat(6)→5

  // Mark days as completed: all days before today, plus today if checkedToday is true
  const completedDays = weekDays.map((_, i) => {
    if (i < todayIndex) return true; // Days before today are "complete" for demo
    if (i === todayIndex && goal.checkedToday) return true; // Today is checked
    return false;
  });
  const progress = Math.min(100, Math.round((goal.current_streak / 30) * 100));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.pageTitle, { color: theme.text }]}>{goal.title}</Text>

        <View style={[styles.propertyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.propertyRow}>
            <Text style={[styles.propertyLabel, { color: theme.textSecondary }]}>Progress</Text>
            <View style={styles.propertyValue}>
              <View style={[styles.progressTrack, { backgroundColor: theme.bgSecondary }]}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.accent }]} />
              </View>
              <Text style={[styles.progressPercent, { color: theme.text }]}>{progress}%</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.propertyRow}>
            <Text style={[styles.propertyLabel, { color: theme.textSecondary }]}>Streak</Text>
            <Text style={[styles.propertyValueText, { color: theme.text }]}>🔥 {goal.current_streak} days</Text>
          </View>
        </View>

        <Text style={[styles.blockTitle, { color: theme.text }]}>This Week</Text>
        <View style={styles.weekGrid}>
          {weekDays.map((day, index) => (
            <View key={day} style={styles.weekDay}>
              <View style={[
                styles.weekDayCircle,
                { borderColor: theme.border },
                completedDays[index] && { backgroundColor: theme.accent, borderColor: theme.accent },
                index === todayIndex && { borderColor: theme.text, borderWidth: 2 }
              ]}>
                {completedDays[index] && <Text style={styles.weekDayCheck}>✓</Text>}
              </View>
              <Text style={[styles.weekDayLabel, { color: theme.textSecondary }]}>{day}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.accent }]} onPress={onCheckIn}>
          <Text style={styles.actionButtonText}>📷 Check in now</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButtonSecondary, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={onAskCoach}>
          <Text style={[styles.actionButtonTextSecondary, { color: theme.text }]}>💬 Ask AI Coach</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// AI COACH SCREEN
// ============================================
// Extended message type for agentic responses
interface AgenticMessage extends ChatMessage {
  isAgentic?: boolean;
  toolCalls?: Array<{ tool: string; args: any; result: any }>;
}

function AICoachScreen({ goal, onBack }: { goal: Goal; onBack: () => void }) {
  const { theme, isDark } = useContext(ThemeContext);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AgenticMessage[]>([
    {
      role: 'assistant',
      content: `I'm your **agentic** coach for "${goal.title}".\n\nYou're on a ${goal.current_streak} day streak — keep it up!\n\n🤖 I can automatically analyze your progress, create plans, and suggest actions.\n\nHow can I help you today?\n\n_Note: I'm an AI assistant, not a medical professional. For health concerns, please consult a qualified provider._`
    }
  ]);
  const scrollViewRef = useRef<ScrollView>(null);

  const getToolDisplayName = (toolName: string): string => {
    const names: Record<string, string> = {
      'break_down_goal': '📋 Creating your plan...',
      'analyze_streak_pattern': '📊 Analyzing your streak...',
      'suggest_next_action': '💡 Finding your next step...'
    };
    return names[toolName] || '🔧 Processing...';
  };

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setToolStatus('🤔 Thinking...');

    try {
      // Use agentic endpoint instead of basic chat
      const response = await fetch(`${API_URL}/ai/agentic-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          goal_id: goal.id,
          goal_title: goal.title,
          streak: goal.current_streak,
          history: conversation.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (response.ok) {
        const data = await response.json();

        // Show tool execution if agentic
        if (data.is_agentic && data.tool_calls?.length > 0) {
          for (const tc of data.tool_calls) {
            setToolStatus(getToolDisplayName(tc.tool));
            await new Promise(r => setTimeout(r, 500)); // Brief pause to show tool usage
          }
        }

        setConversation(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          isAgentic: data.is_agentic,
          toolCalls: data.tool_calls
        }]);
      } else {
        const errorData = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorData}`);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: `Connection Error: ${error.message}. (Backend URL: ${API_URL})`
      }]);
    } finally {
      setIsLoading(false);
      setToolStatus(null);
    }
  };

  const mdStyles = {
    body: { color: theme.text, fontSize: 15, lineHeight: 22 },
    strong: { fontWeight: '600' as const, color: theme.text },
    bullet_list: { marginVertical: 4 },
    paragraph: { marginVertical: 4 },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.chatHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onBack}>
            <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.chatHeaderTitle, { color: theme.text }]}>AI Coach</Text>
            <View style={{ backgroundColor: theme.accentSecondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>AGENTIC</Text>
            </View>
          </View>
          <View style={{ width: 50 }} />
        </View>

        <View style={[styles.contextBar, { backgroundColor: theme.bgSecondary }]}>
          <Text style={[styles.contextText, { color: theme.text }]}>
            🎯 {goal.title} • 🔥 {goal.current_streak} days
          </Text>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {conversation.map((msg, index) => (
            <View key={index} style={styles.messageBlock}>
              {msg.role === 'assistant' && (
                <View style={[styles.aiIndicator, { backgroundColor: msg.isAgentic ? theme.accentSecondary : theme.bgSecondary }]}>
                  <Text style={styles.aiIndicatorText}>{msg.isAgentic ? '🤖' : 'AI'}</Text>
                </View>
              )}
              {msg.role === 'assistant' ? (
                <View style={{ flex: 1 }}>
                  {msg.isAgentic && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <View style={{ marginBottom: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: theme.accentSecondary + '20', borderRadius: 8 }}>
                      <Text style={{ color: theme.accentSecondary, fontSize: 12, fontWeight: '500' }}>
                        🔧 Used {msg.toolCalls.length} tool{msg.toolCalls.length > 1 ? 's' : ''}: {msg.toolCalls.map(tc => tc.tool.replace(/_/g, ' ')).join(', ')}
                      </Text>
                    </View>
                  )}
                  <Markdown style={mdStyles}>{msg.content}</Markdown>
                </View>
              ) : (
                <Text style={[styles.userMessage, { color: theme.text, backgroundColor: theme.accent + '20' }]}>
                  {msg.content}
                </Text>
              )}
            </View>
          ))}

          {isLoading && (
            <View style={styles.messageBlock}>
              <View style={[styles.aiIndicator, { backgroundColor: theme.accentSecondary }]}>
                <Text style={styles.aiIndicatorText}>🤖</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color={theme.accent} />
                {toolStatus && (
                  <Text style={{ color: theme.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                    {toolStatus}
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgSecondary, color: theme.text }]}
            placeholder="Ask about your goal..."
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.accent }, !message.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!message.trim() || isLoading}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================
// GOAL CREATION WIZARD (Step-by-Step)
// ============================================
interface GoalClassification {
  category: string;
  category_emoji: string;
  community_id: string;
  community_name: string;
  community_emoji: string;
  community_description: string;
  member_count: number;
  suggested_routine: string;
  suggested_frequency: string;
  tips: string[];
}

type WizardStep = 'title' | 'frequency' | 'reminder' | 'classify' | 'confirm';

const FREQUENCIES = [
  { id: 'daily', label: 'Every Day', desc: 'Build unbreakable habits', emoji: '🔥' },
  { id: '3x-week', label: '3x per Week', desc: 'Balanced progress', emoji: '💪' },
  { id: 'weekdays', label: 'Weekdays Only', desc: 'Mon-Fri consistency', emoji: '📅' },
  { id: 'weekly', label: 'Weekly', desc: 'Once per week', emoji: '🗓️' },
];

const REMINDER_TIMES = [
  { id: 'morning', label: 'Morning', time: '8:00 AM', emoji: '🌅' },
  { id: 'midday', label: 'Midday', time: '12:00 PM', emoji: '☀️' },
  { id: 'afternoon', label: 'Afternoon', time: '4:00 PM', emoji: '🌤️' },
  { id: 'evening', label: 'Evening', time: '7:00 PM', emoji: '🌙' },
  { id: 'night', label: 'Night', time: '10:00 PM', emoji: '🌜' },
];

function CreateGoalScreen({ onBack, onGoalCreated }: { onBack: () => void; onGoalCreated: (goal: Goal) => void }) {
  const { theme } = useContext(ThemeContext);
  const [step, setStep] = useState<WizardStep>('title');
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [reminderTime, setReminderTime] = useState('morning');
  const [isClassifying, setIsClassifying] = useState(false);
  const [classification, setClassification] = useState<GoalClassification | null>(null);

  const steps: WizardStep[] = ['title', 'frequency', 'reminder', 'classify', 'confirm'];
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = async () => {
    if (step === 'title' && !title.trim()) return;

    if (step === 'reminder') {
      // Trigger AI classification
      setStep('classify');
      setIsClassifying(true);
      try {
        const response = await fetch(`${API_URL}/ai/classify-goal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal_title: title })
        });
        if (response.ok) {
          const data = await response.json();
          setClassification(data);
        }
      } catch (e) {
        console.log('Classification error:', e);
        // Set default classification
        setClassification({
          category: 'productivity',
          category_emoji: '⚡',
          community_id: 'productivity-community',
          community_name: 'Productivity Masters',
          community_emoji: '⚡',
          community_description: 'Get more done, together',
          member_count: 11456,
          suggested_routine: 'Start with 15 minutes daily and build from there.',
          suggested_frequency: 'daily',
          tips: ['Start small', 'Be consistent', 'Track progress']
        });
      } finally {
        setIsClassifying(false);
      }
      return;
    }

    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    } else {
      onBack();
    }
  };

  const createGoal = () => {
    onGoalCreated({
      id: Date.now().toString(),
      title: title.trim(),
      category: classification?.category || 'general',
      current_streak: 0,
      frequency: frequency,
      description: classification?.suggested_routine || ''
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 'title':
        return (
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
              What's your goal?
            </Text>
            <Text style={{ fontSize: 15, color: theme.textSecondary, marginBottom: 32, lineHeight: 22 }}>
              Be specific! Great goals are clear and actionable.
            </Text>

            <TextInput
              style={{
                backgroundColor: theme.bgSecondary,
                borderRadius: 16,
                padding: 20,
                fontSize: 18,
                color: theme.text,
                borderWidth: 2,
                borderColor: title.trim() ? theme.accent : theme.border,
                minHeight: 60
              }}
              placeholder="e.g., Exercise for 30 minutes every day"
              placeholderTextColor={theme.textSecondary}
              value={title}
              onChangeText={setTitle}
              multiline
              autoFocus
            />

            <View style={{ marginTop: 24 }}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>POPULAR EXAMPLES</Text>
              {['Run 5K daily', 'Read for 30 minutes', 'Meditate every morning', 'Practice guitar'].map((example) => (
                <TouchableOpacity
                  key={example}
                  style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: theme.bgSecondary, borderRadius: 12, marginBottom: 8 }}
                  onPress={() => setTitle(example)}
                >
                  <Text style={{ color: theme.text, fontSize: 15 }}>{example}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'frequency':
        return (
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
              How often?
            </Text>
            <Text style={{ fontSize: 15, color: theme.textSecondary, marginBottom: 32 }}>
              Choose a frequency that's realistic for you.
            </Text>

            {FREQUENCIES.map((freq) => (
              <TouchableOpacity
                key={freq.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: frequency === freq.id ? theme.accent + '20' : theme.card,
                  borderRadius: 16,
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor: frequency === freq.id ? theme.accent : theme.border
                }}
                onPress={() => setFrequency(freq.id)}
              >
                <Text style={{ fontSize: 28, marginRight: 14 }}>{freq.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>{freq.label}</Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{freq.desc}</Text>
                </View>
                {frequency === freq.id && (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'reminder':
        return (
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
              When to remind you?
            </Text>
            <Text style={{ fontSize: 15, color: theme.textSecondary, marginBottom: 32 }}>
              We'll nudge you at the perfect time.
            </Text>

            {REMINDER_TIMES.map((time) => (
              <TouchableOpacity
                key={time.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: reminderTime === time.id ? theme.accentSecondary + '20' : theme.card,
                  borderRadius: 16,
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor: reminderTime === time.id ? theme.accentSecondary : theme.border
                }}
                onPress={() => setReminderTime(time.id)}
              >
                <Text style={{ fontSize: 28, marginRight: 14 }}>{time.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>{time.label}</Text>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>{time.time}</Text>
                </View>
                {reminderTime === time.id && (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.accentSecondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'classify':
        return (
          <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' }}>
            {isClassifying ? (
              <>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginTop: 24 }}>
                  AI is analyzing your goal...
                </Text>
                <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
                  Finding the perfect category and community for you
                </Text>
              </>
            ) : classification && (
              <View style={{ width: '100%' }}>
                <View style={{ alignItems: 'center', marginBottom: 32 }}>
                  <Text style={{ fontSize: 48, marginBottom: 16 }}>{classification.category_emoji}</Text>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, textTransform: 'capitalize' }}>
                    {classification.category}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: theme.accentSecondary + '20', borderRadius: 20 }}>
                    <Text style={{ fontSize: 12, color: theme.accentSecondary, fontWeight: '600' }}>AI CLASSIFIED</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: theme.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.border, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>MATCHED COMMUNITY</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginRight: 12 }}>{classification.community_emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: theme.text }}>{classification.community_name}</Text>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>{classification.member_count.toLocaleString()} members</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, color: theme.text, marginTop: 12, lineHeight: 20 }}>
                    {classification.community_description}
                  </Text>
                </View>

                <View style={{ backgroundColor: theme.bgSecondary, borderRadius: 16, padding: 16 }}>
                  <Text style={{ fontSize: 13, color: theme.accentSecondary, fontWeight: '600', marginBottom: 8 }}>💡 AI SUGGESTION</Text>
                  <Text style={{ fontSize: 14, color: theme.text, lineHeight: 20 }}>
                    {classification.suggested_routine}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );

      case 'confirm':
        return (
          <View style={{ flex: 1, paddingHorizontal: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
              <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, textAlign: 'center' }}>
                Ready to start!
              </Text>
            </View>

            <View style={{ backgroundColor: theme.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.border }}>
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>GOAL</Text>
                <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>{title}</Text>
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>FREQUENCY</Text>
                  <Text style={{ fontSize: 16, color: theme.text }}>
                    {FREQUENCIES.find(f => f.id === frequency)?.emoji} {FREQUENCIES.find(f => f.id === frequency)?.label}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>REMINDER</Text>
                  <Text style={{ fontSize: 16, color: theme.text }}>
                    {REMINDER_TIMES.find(t => t.id === reminderTime)?.emoji} {REMINDER_TIMES.find(t => t.id === reminderTime)?.time}
                  </Text>
                </View>
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 20 }}>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>COMMUNITY</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginRight: 10 }}>{classification?.community_emoji || '👥'}</Text>
                  <Text style={{ fontSize: 16, color: theme.text }}>{classification?.community_name || 'General Community'}</Text>
                </View>
              </View>
            </View>
          </View>
        );
    }
  };

  const canProceed = step === 'title' ? title.trim().length > 0 : true;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.card }}>
          <TouchableOpacity onPress={handleBack} style={{ padding: 8 }}>
            <Text style={{ fontSize: 16, color: theme.text }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            <View style={{ height: 4, backgroundColor: theme.bgSecondary, borderRadius: 2 }}>
              <View style={{ height: '100%', width: `${progress}%`, backgroundColor: theme.accent, borderRadius: 2 }} />
            </View>
          </View>
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>{currentStepIndex + 1}/{steps.length}</Text>
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingTop: 24, paddingBottom: 120 }}>
          {renderStepContent()}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 40, backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border }}>
          {step === 'confirm' ? (
            <TouchableOpacity
              style={{ backgroundColor: theme.accent, paddingVertical: 18, borderRadius: 16, alignItems: 'center' }}
              onPress={createGoal}
            >
              <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>🚀 Start My Streak</Text>
            </TouchableOpacity>
          ) : step === 'classify' && isClassifying ? null : (
            <TouchableOpacity
              style={{ backgroundColor: canProceed ? theme.accent : theme.bgSecondary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' }}
              onPress={handleNext}
              disabled={!canProceed}
            >
              <Text style={{ color: canProceed ? '#FFF' : theme.textSecondary, fontSize: 17, fontWeight: '700' }}>
                {step === 'classify' ? 'Continue' : 'Next'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================
// CHECK-IN SCREEN (Camera + Edit + Verify)
// ============================================
function CheckInScreen({
  goal,
  onBack,
  onComplete
}: {
  goal: Goal;
  onBack: () => void;
  onComplete: (photoUri: string, caption: string) => void;
}) {
  const { theme } = useContext(ThemeContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [stage, setStage] = useState<'capture' | 'edit' | 'verifying' | 'verified' | 'failed'>('capture');
  const [verificationMessage, setVerificationMessage] = useState('');
  const cameraRef = useRef<CameraView>(null);
  const lastTapRef = useRef<number>(0);

  const toggleCamera = () => setFacing(f => f === 'back' ? 'front' : 'back');

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      toggleCamera();
    }
    lastTapRef.current = now;
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      const result = await cameraRef.current.takePictureAsync();
      if (result) {
        setPhoto(result.uri);
        setStage('edit');
      }
    }
  };

  const verifyAndSubmit = async () => {
    if (!photo) return;
    setStage('verifying');

    try {
      const response = await fetch(`${API_URL}/ai/verify-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_title: goal.title,
          goal_category: goal.category,
          // In production, we'd send the actual image. For now, simulate verification.
          image_description: caption || 'User check-in photo'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.verified) {
          setVerificationMessage(result.message || '✓ Great job! Your check-in has been verified.');
          setStage('verified');
          setTimeout(() => {
            onComplete(photo, caption || `Day ${goal.current_streak + 1}! 💪`);
          }, 1500);
        } else {
          setVerificationMessage(result.message || 'This photo doesn\'t seem to match your goal. Try again?');
          setStage('failed');
        }
      } else {
        // Fallback: accept the check-in if API fails
        setVerificationMessage('✓ Check-in recorded!');
        setStage('verified');
        setTimeout(() => {
          onComplete(photo, caption || `Day ${goal.current_streak + 1}! 💪`);
        }, 1500);
      }
    } catch (error) {
      // Fallback: accept if network error
      setVerificationMessage('✓ Check-in recorded!');
      setStage('verified');
      setTimeout(() => {
        onComplete(photo, caption || `Day ${goal.current_streak + 1}! 💪`);
      }, 1500);
    }
  };

  if (!permission) return <View style={styles.cameraContainer}><ActivityIndicator /></View>;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.cameraContainer, { backgroundColor: theme.bg }]}>
        <Text style={[styles.permissionText, { color: theme.text }]}>Camera access is needed</Text>
        <TouchableOpacity style={[styles.permissionButton, { backgroundColor: theme.accent }]} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack}>
          <Text style={{ color: theme.textSecondary }}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // STAGE 1: Capture
  if (stage === 'capture') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          onTouchEnd={handleDoubleTap}
        >
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <TouchableOpacity onPress={onBack} style={styles.cameraCloseBtn}>
                <Text style={styles.cameraClose}>✕</Text>
              </TouchableOpacity>
              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>🎯 {goal.title}</Text>
              </View>
              <View style={{ width: 44 }} />
            </View>
          </SafeAreaView>
        </CameraView>

        <View style={styles.cameraBottomBar}>
          <View style={{ width: 60 }} />
          <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.flipBtn} onPress={toggleCamera}>
            <Text style={styles.flipBtnText}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // STAGE 2: Edit (Instagram-style)
  if (stage === 'edit' && photo) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: '#000' }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          {/* Full-screen photo preview */}
          <Image source={{ uri: photo }} style={styles.fullScreenPreview} />

          {/* Top bar */}
          <View style={styles.editTopBar}>
            <TouchableOpacity onPress={() => { setPhoto(null); setStage('capture'); }} style={styles.editBackBtn}>
              <Text style={{ color: '#FFF', fontSize: 16 }}>← Retake</Text>
            </TouchableOpacity>
            <View style={styles.goalBadge}>
              <Text style={styles.goalBadgeText}>🎯 {goal.title}</Text>
            </View>
          </View>

          {/* Bottom edit panel */}
          <View style={styles.editBottomPanel}>
            <View style={[styles.captionInput, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
              <TextInput
                placeholder="Write a caption..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={caption}
                onChangeText={setCaption}
                style={styles.captionTextInput}
                multiline
                maxLength={200}
              />
            </View>

            <View style={styles.editActions}>
              <View style={styles.streakPreview}>
                <Text style={styles.streakPreviewText}>🔥 {goal.current_streak + 1} day streak!</Text>
              </View>

              <TouchableOpacity
                style={[styles.shareBtn, { backgroundColor: theme.accent }]}
                onPress={verifyAndSubmit}
              >
                <Text style={styles.shareBtnText}>Share Check-in →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // STAGE 3: Verifying / Result
  return (
    <View style={[styles.verifyContainer, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={styles.verifyContent}>
        {stage === 'verifying' && (
          <>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.verifyTitle, { color: theme.text }]}>Verifying your check-in...</Text>
            <Text style={[styles.verifySubtitle, { color: theme.textSecondary }]}>
              Making sure this matches "{goal.title}"
            </Text>
          </>
        )}

        {stage === 'verified' && (
          <>
            <Text style={styles.verifyEmoji}>✅</Text>
            <Text style={[styles.verifyTitle, { color: theme.text }]}>Verified!</Text>
            <Text style={[styles.verifySubtitle, { color: theme.textSecondary }]}>
              {verificationMessage}
            </Text>
            <Text style={[styles.streakBig, { color: theme.accent }]}>
              🔥 {goal.current_streak + 1} days
            </Text>
          </>
        )}

        {stage === 'failed' && (
          <>
            <Text style={styles.verifyEmoji}>⚠️</Text>
            <Text style={[styles.verifyTitle, { color: theme.text }]}>Hmm, not quite right</Text>
            <Text style={[styles.verifySubtitle, { color: theme.textSecondary }]}>
              {verificationMessage}
            </Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.retakeBtn, { borderColor: theme.border }]}
                onPress={() => { setPhoto(null); setStage('capture'); }}
              >
                <Text style={{ color: theme.text }}>Retake Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.accent }]}
                onPress={() => {
                  // Allow user to submit anyway
                  if (photo) onComplete(photo, caption || `Day ${goal.current_streak + 1}! 💪`);
                }}
              >
                <Text style={styles.submitBtnText}>Submit Anyway</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('feed');
  const [screen, setScreen] = useState<'tabs' | 'goal' | 'coach' | 'checkin' | 'create'>('tabs');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', title: 'Run 3x per week', category: 'fitness', current_streak: 12, frequency: 'daily', description: '', checkedToday: false },
    { id: '2', title: 'Read 30 minutes', category: 'learning', current_streak: 5, frequency: 'daily', description: '', checkedToday: false },
    { id: '3', title: 'Meditate daily', category: 'wellness', current_streak: 3, frequency: 'daily', description: '', checkedToday: false },
  ]);
  const [myCheckIns, setMyCheckIns] = useState<CheckIn[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ milestone: number; emoji: string; title: string; message: string } | null>(null);

  const theme = isDark ? darkTheme : lightTheme;

  // Helper to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Handle check-in completion
  const handleCheckInComplete = (goalId: string, photoUri: string, caption: string = '') => {
    // Find the goal to get its title and new streak
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newStreak = goal.current_streak + 1;

    // Update the goal's streak and mark as checked today
    setGoals(prevGoals => prevGoals.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          current_streak: newStreak,
          checkedToday: true,
          lastCheckIn: new Date().toISOString()
        };
      }
      return g;
    }));

    // Add to myCheckIns
    const newCheckIn: CheckIn = {
      id: `checkin-${Date.now()}`,
      goalId,
      goalTitle: goal.title,
      photoUri,
      caption: caption || `Day ${newStreak}! 💪`,
      streak: newStreak,
      timestamp: new Date()
    };
    setMyCheckIns(prev => [newCheckIn, ...prev]);

    // Check for milestone achievements
    const milestones: { [key: number]: { emoji: string; title: string; message: string } } = {
      7: { emoji: '⭐', title: 'Week Warrior!', message: 'You crushed your first week! Keep the momentum going!' },
      21: { emoji: '🌟', title: '21-Day Habit!', message: 'Science says habits form in 21 days. This is now part of who you are!' },
      30: { emoji: '🏆', title: 'Monthly Master!', message: 'A full month of consistency! You\'re in the elite club now!' },
      50: { emoji: '💎', title: 'Halfway Century!', message: '50 days strong! You\'re unstoppable!' },
      100: { emoji: '👑', title: 'Century Legend!', message: '100 days! You\'ve achieved something truly remarkable!' },
    };

    if (milestones[newStreak]) {
      setCelebrationData({ milestone: newStreak, ...milestones[newStreak] });
      setShowCelebration(true);
    }
  };

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <ThemeContext.Provider value={{ theme, isDark, toggle: () => setIsDark(!isDark) }}>
        <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeContext.Provider>
    );
  }

  // Show auth screen if not logged in
  if (!session) {
    return (
      <ThemeContext.Provider value={{ theme, isDark, toggle: () => setIsDark(!isDark) }}>
        <AuthScreen onAuthSuccess={() => { }} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeContext.Provider>
    );
  }

  if (screen === 'create') {
    return (
      <ThemeContext.Provider value={{ theme, isDark, toggle: () => setIsDark(!isDark) }}>
        <CreateGoalScreen
          onBack={() => setScreen('tabs')}
          onGoalCreated={(newGoal) => {
            setGoals(prev => [...prev, newGoal]);
            setSelectedGoal(newGoal);
            setScreen('goal');
          }}
        />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeContext.Provider>
    );
  }

  if (screen === 'checkin' && selectedGoal) {
    return (
      <ThemeContext.Provider value={{ theme, isDark, toggle: () => setIsDark(!isDark) }}>
        <CheckInScreen
          goal={selectedGoal}
          onBack={() => setScreen('goal')}
          onComplete={(photoUri, caption) => {
            handleCheckInComplete(selectedGoal.id, photoUri, caption);
            setScreen('tabs');
            setTab('feed'); // Go to feed to see the photo
          }}
        />
        <StatusBar style="light" />
      </ThemeContext.Provider>
    );
  }

  if (screen === 'coach' && selectedGoal) {
    return (
      <ThemeContext.Provider value={{ theme, isDark, toggle: () => setIsDark(!isDark) }}>
        <AICoachScreen goal={selectedGoal} onBack={() => setScreen('goal')} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeContext.Provider>
    );
  }

  if (screen === 'goal' && selectedGoal) {
    // Get fresh goal from goals array to reflect updated checkedToday status
    const currentGoal = goals.find(g => g.id === selectedGoal.id) || selectedGoal;
    return (
      <ThemeContext.Provider value={{ theme, isDark, toggle: () => setIsDark(!isDark) }}>
        <GoalDetailScreen
          goal={currentGoal}
          onBack={() => setScreen('tabs')}
          onAskCoach={() => setScreen('coach')}
          onCheckIn={() => setScreen('checkin')}
        />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggle: () => setIsDark(!isDark) }}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <SafeAreaView style={{ flex: 1 }}>
          {tab === 'home' && (
            <HomeScreen
              goals={goals}
              onGoalPress={(goal) => { setSelectedGoal(goal); setScreen('goal'); }}
              onAddGoal={() => setScreen('create')}
              onCheckIn={(goal) => { setSelectedGoal(goal); setScreen('checkin'); }}
            />
          )}
          {tab === 'feed' && <FeedScreen myCheckIns={myCheckIns} formatTimeAgo={formatTimeAgo} />}
          {tab === 'trophy' && <TrophyScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </SafeAreaView>
        <TabBar activeTab={tab} onTabPress={setTab} />
        <StatusBar style={isDark ? 'light' : 'dark'} />

        {/* Celebration Modal */}
        {showCelebration && celebrationData && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            {/* Confetti effect - decorative emojis */}
            <Text style={{ position: 'absolute', top: 60, left: 30, fontSize: 40, transform: [{ rotate: '-15deg' }] }}>🎉</Text>
            <Text style={{ position: 'absolute', top: 80, right: 50, fontSize: 36, transform: [{ rotate: '20deg' }] }}>✨</Text>
            <Text style={{ position: 'absolute', top: 150, left: 60, fontSize: 28 }}>🌟</Text>
            <Text style={{ position: 'absolute', top: 120, right: 40, fontSize: 32 }}>🎊</Text>
            <Text style={{ position: 'absolute', bottom: 200, left: 40, fontSize: 34 }}>⭐</Text>
            <Text style={{ position: 'absolute', bottom: 180, right: 60, fontSize: 30 }}>💫</Text>

            <View style={{
              backgroundColor: theme.card,
              borderRadius: 28,
              padding: 40,
              alignItems: 'center',
              marginHorizontal: 30,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.5,
              shadowRadius: 20
            }}>
              <Text style={{ fontSize: 80, marginBottom: 16 }}>{celebrationData.emoji}</Text>
              <Text style={{
                color: theme.text,
                fontSize: 28,
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: 8,
                fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
              }}>
                {celebrationData.title}
              </Text>
              <Text style={{
                color: theme.accent,
                fontSize: 20,
                fontWeight: '700',
                marginBottom: 12
              }}>
                🔥 {celebrationData.milestone} Day Streak!
              </Text>
              <Text style={{
                color: theme.textSecondary,
                fontSize: 16,
                textAlign: 'center',
                lineHeight: 24,
                marginBottom: 24
              }}>
                {celebrationData.message}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.accent,
                  paddingVertical: 16,
                  paddingHorizontal: 48,
                  borderRadius: 16
                }}
                onPress={() => setShowCelebration(false)}
              >
                <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>Continue 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ThemeContext.Provider>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Tab bar
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, paddingBottom: 34 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabIcon: { fontSize: 22, opacity: 0.5 },
  tabLabel: { fontSize: 11, marginTop: 4 },

  // Typography
  greeting: { fontSize: 32, fontWeight: '700', marginTop: 20, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  subGreeting: { fontSize: 15, marginTop: 4 },
  pageTitle: { fontSize: 28, fontWeight: '700', marginTop: 20, marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12, marginTop: 24 },
  blockTitle: { fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 16 },

  // Sections
  section: { marginBottom: 16 },

  // Goal cards
  goalCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, marginRight: 14, justifyContent: 'center', alignItems: 'center' },
  checkboxInner: { width: 12, height: 12, borderRadius: 4, opacity: 0 },
  checkboxPulse: { width: 12, height: 12, borderRadius: 6 },
  goalContent: { flex: 1 },
  goalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  goalMeta: { fontSize: 14 },
  streakBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  streakText: { fontSize: 14, fontWeight: '700' },

  // Check-in Banner
  checkInBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginTop: 20, marginBottom: 4 },
  checkInBannerLeft: { flex: 1 },
  checkInBannerTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  checkInBannerTime: { fontSize: 13, fontWeight: '500' },
  checkInBannerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  checkInBannerBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Add button
  addButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  addButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Feed
  feedCard: { borderRadius: 20, borderWidth: 1, marginBottom: 18, overflow: 'hidden' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  feedUser: { flexDirection: 'row', alignItems: 'center' },
  feedAvatar: { fontSize: 36, marginRight: 12 },
  feedUserName: { fontSize: 16, fontWeight: '700' },
  feedGoal: { fontSize: 14 },
  feedStreak: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  feedStreakText: { fontSize: 14, fontWeight: '700' },
  feedImagePlaceholder: { height: 220, justifyContent: 'center', alignItems: 'center' },
  feedImage: { width: '100%', height: 320, resizeMode: 'cover' },
  feedCaption: { fontSize: 16, padding: 16, paddingTop: 12, lineHeight: 22 },
  feedFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 4 },
  likeButton: { padding: 6 },
  feedTime: { fontSize: 13 },

  // Empty state
  emptyState: { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyStateText: { fontSize: 14, textAlign: 'center' },

  // Settings
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  settingInfo: { flex: 1, marginRight: 16 },
  settingTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  settingDesc: { fontSize: 14, lineHeight: 20 },
  logoutButton: { borderWidth: 2, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 28 },
  logoutText: { fontSize: 16, fontWeight: '700' },

  // Properties
  propertyCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 16 },
  propertyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  propertyLabel: { width: 80, fontSize: 14 },
  propertyValue: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  propertyValueText: { fontSize: 14 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, marginRight: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPercent: { fontSize: 13, width: 40 },
  divider: { height: 1, marginVertical: 8 },

  // Week grid
  weekGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center' },
  weekDayCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  weekDayCheck: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  weekDayLabel: { fontSize: 12 },

  // Action buttons
  actionButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  actionButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  actionButtonSecondary: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1 },
  actionButtonTextSecondary: { fontSize: 15, fontWeight: '600' },

  // Back
  backRow: { paddingVertical: 16 },
  backText: { fontSize: 15 },

  // Chat
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  chatHeaderTitle: { fontSize: 16, fontWeight: '600' },
  contextBar: { paddingHorizontal: 16, paddingVertical: 10 },
  contextText: { fontSize: 13 },
  messagesContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  messageBlock: { marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start', flex: 1, maxWidth: '100%' },
  aiIndicator: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginRight: 10, marginTop: 2 },
  aiIndicatorText: { fontSize: 11, fontWeight: '600', color: '#666' },
  userMessage: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginLeft: 'auto', maxWidth: '80%' },
  inputBar: { flexDirection: 'row', padding: 12, borderTopWidth: 1, alignItems: 'center' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, fontSize: 15 },
  sendBtn: { marginLeft: 10, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#FFF', fontWeight: '600' },

  // Create goal
  createButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  createButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  cameraOverlay: { flex: 1 },
  cameraTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  cameraClose: { color: '#FFF', fontSize: 28 },
  cameraCloseBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  cameraFlip: { color: '#FFF', fontSize: 28 },
  goalBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  goalBadgeText: { color: '#FFF', fontSize: 14 },
  captureRow: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  cameraBottomBar: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF' },
  flipBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginLeft: 24 },
  flipBtnText: { fontSize: 28 },
  successToast: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#4CAF50', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, zIndex: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  successToastText: { color: '#FFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  previewImage: { width: '100%', height: '100%', borderRadius: 16 },
  reviewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  reviewTitle: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  reviewPhoto: { width: 280, height: 280, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 32, overflow: 'hidden' },
  reviewActions: { flexDirection: 'row', gap: 16 },
  retakeBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  submitBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  submitBtnText: { color: '#FFF', fontWeight: '600' },

  // Edit screen (Instagram-style)
  fullScreenPreview: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, resizeMode: 'cover' },
  editTopBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 8 },
  editBackBtn: { padding: 8 },
  editBottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.7)' },
  captionInput: { borderRadius: 12, marginBottom: 16 },
  captionTextInput: { color: '#FFF', fontSize: 16, padding: 16, minHeight: 60 },
  editActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakPreview: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  streakPreviewText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  shareBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 25, flexDirection: 'row', alignItems: 'center' },
  shareBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  // Verify screen
  verifyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  verifyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  verifyEmoji: { fontSize: 64, marginBottom: 16 },
  verifyTitle: { fontSize: 24, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  verifySubtitle: { fontSize: 15, textAlign: 'center', marginBottom: 16 },
  streakBig: { fontSize: 32, fontWeight: '700', marginTop: 16 },

  // Feed tabs
  feedTabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1 },
  feedTab: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  feedTabText: { fontSize: 13, fontWeight: '600' },

  // Permission
  permissionText: { fontSize: 16, marginBottom: 20, textAlign: 'center', paddingHorizontal: 40 },
  permissionButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 16 },
  permissionButtonText: { color: '#FFF', fontWeight: '600' },

  // Auth
  authContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  authTitle: { fontSize: 36, fontWeight: '700', textAlign: 'center', marginBottom: 8, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  authSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40 },
  authInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 16 },
  authButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  authButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  authSwitch: { marginTop: 24, alignItems: 'center' },
  authSwitchText: { fontSize: 14 },
  authMessage: { padding: 14, borderRadius: 10, marginBottom: 20 },
  authMessageText: { fontSize: 14, textAlign: 'center' },
});
