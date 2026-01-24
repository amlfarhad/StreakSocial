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
const API_URL = 'http://192.168.177.207:8000';

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
function TabBar({ activeTab, onTabPress }: { activeTab: string; onTabPress: (tab: string) => void }) {
  const { theme } = useContext(ThemeContext);
  const tabs: { id: string; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { id: 'feed', icon: 'camera', label: 'Feed' },
    { id: 'home', icon: 'check-square', label: 'Goals' },
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
          <Feather
            name={tab.icon}
            size={22}
            color={activeTab === tab.id ? theme.accent : theme.textSecondary}
          />
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

        {goals.map((goal) => (
          <TouchableOpacity
            key={goal.id}
            style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => onGoalPress(goal)}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              style={[styles.checkbox, { borderColor: isCheckInWindow ? theme.accent : theme.border }]}
              onPress={() => onCheckIn(goal)}
            >
              {isCheckInWindow && <View style={[styles.checkboxPulse, { backgroundColor: theme.accent }]} />}
            </TouchableOpacity>
            <View style={styles.goalContent}>
              <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.title}</Text>
              <Text style={[styles.goalMeta, { color: theme.textSecondary }]}>
                🔥 {goal.current_streak} day streak
              </Text>
            </View>
            <View style={[styles.streakBadge, { backgroundColor: theme.accentSecondary + '20' }]}>
              <Text style={[styles.streakText, { color: theme.accentSecondary }]}>
                {Math.min(100, Math.round((goal.current_streak / 30) * 100))}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}

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
// FEED SCREEN
// ============================================
function FeedScreen({
  myCheckIns,
  formatTimeAgo
}: {
  myCheckIns: CheckIn[];
  formatTimeAgo: (date: Date) => string;
}) {
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState<'friends' | 'community' | 'photos'>('friends');

  const friendsFeed: FeedItem[] = [
    { id: '1', user: 'Sarah K.', avatar: '👩‍🦰', goal: 'Morning yoga', streak: 45, caption: 'Day 45! 🧘‍♀️ Feeling stronger every day', timeAgo: '2h ago', likes: 12 },
    { id: '2', user: 'Mike R.', avatar: '👨‍🦱', goal: 'Read daily', streak: 23, caption: 'Just finished Atomic Habits 📚', timeAgo: '4h ago', likes: 8 },
  ];

  const communityFeed: FeedItem[] = [
    { id: '3', user: 'Emma L.', avatar: '👩', goal: 'Run 5K', streak: 14, caption: 'Rainy run but made it happen! 🌧️', timeAgo: '5h ago', likes: 24 },
    { id: '4', user: 'Alex T.', avatar: '🧑', goal: 'Learn guitar', streak: 30, caption: 'Finally nailed that chord progression 🎸', timeAgo: '8h ago', likes: 31 },
    { id: '5', user: 'Jordan P.', avatar: '🧔', goal: 'Meditate', streak: 60, caption: '60 days of calm 🧘', timeAgo: '10h ago', likes: 42 },
  ];

  // Convert real check-ins to FeedItems
  const myPhotosFeed: FeedItem[] = myCheckIns.map(c => ({
    id: c.id,
    user: 'You',
    avatar: '😊',
    goal: c.goalTitle,
    streak: c.streak,
    caption: c.caption,
    timeAgo: formatTimeAgo(c.timestamp),
    likes: 0,
    photoUri: c.photoUri
  }));

  const currentFeed = activeTab === 'friends' ? friendsFeed : activeTab === 'community' ? communityFeed : myPhotosFeed;
  const pageTitle = activeTab === 'photos' ? 'My Photos' : activeTab === 'friends' ? 'Friends' : 'Community';

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.pageTitle, { color: theme.text }]}>{pageTitle}</Text>

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

      {activeTab === 'photos' && myPhotosFeed.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📷</Text>
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No check-ins yet</Text>
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Complete a check-in to see your photos here!
          </Text>
        </View>
      )}

      {currentFeed.map(item => (
        <View key={item.id} style={[styles.feedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.feedHeader}>
            <View style={styles.feedUser}>
              <Text style={styles.feedAvatar}>{item.avatar}</Text>
              <View>
                <Text style={[styles.feedUserName, { color: theme.text }]}>{item.user}</Text>
                <Text style={[styles.feedGoal, { color: theme.textSecondary }]}>{item.goal}</Text>
              </View>
            </View>
            <View style={[styles.feedStreak, { backgroundColor: theme.accent + '20' }]}>
              <Text style={[styles.feedStreakText, { color: theme.accent }]}>🔥 {item.streak}</Text>
            </View>
          </View>

          {item.photoUri ? (
            <Image source={{ uri: item.photoUri }} style={styles.feedImage} />
          ) : (
            <View style={[styles.feedImagePlaceholder, { backgroundColor: theme.bgSecondary }]}>
              <Text style={{ fontSize: 48 }}>📷</Text>
            </View>
          )}

          <Text style={[styles.feedCaption, { color: theme.text }]}>{item.caption}</Text>

          <View style={styles.feedFooter}>
            <TouchableOpacity style={styles.likeButton}>
              <Text style={{ fontSize: 16, color: theme.text }}>❤️ {item.likes}</Text>
            </TouchableOpacity>
            <Text style={[styles.feedTime, { color: theme.textSecondary }]}>{item.timeAgo}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ============================================
// SETTINGS SCREEN
// ============================================
function SettingsScreen() {
  const { theme, isDark, toggle } = useContext(ThemeContext);

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Settings</Text>

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
            <Text style={[styles.settingTitle, { color: theme.text }]}>Notifications</Text>
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>Manage push notifications</Text>
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
            <Text style={[styles.settingDesc, { color: theme.textSecondary }]}>1.0.0</Text>
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
function AICoachScreen({ goal, onBack }: { goal: Goal; onBack: () => void }) {
  const { theme, isDark } = useContext(ThemeContext);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `I'm your coach for "${goal.title}".\n\nYou're on a ${goal.current_streak} day streak — keep it up!\n\nHow can I help you today?\n\n_Note: I'm an AI assistant, not a medical professional. For health concerns, please consult a qualified provider._`
    }
  ]);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
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
        setConversation(prev => [...prev, { role: 'assistant', content: data.message }]);
      } else {
        throw new Error('API error');
      }
    } catch {
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: `I'm here to help you with "${goal.title}". What specific aspect would you like to work on?`
      }]);
    } finally {
      setIsLoading(false);
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
          <Text style={[styles.chatHeaderTitle, { color: theme.text }]}>AI Coach</Text>
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
                <View style={[styles.aiIndicator, { backgroundColor: theme.bgSecondary }]}>
                  <Text style={styles.aiIndicatorText}>AI</Text>
                </View>
              )}
              {msg.role === 'assistant' ? (
                <View style={{ flex: 1 }}>
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
              <View style={[styles.aiIndicator, { backgroundColor: theme.bgSecondary }]}>
                <Text style={styles.aiIndicatorText}>AI</Text>
              </View>
              <ActivityIndicator size="small" color={theme.accent} />
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
// CREATE GOAL SCREEN
// ============================================
function CreateGoalScreen({ onBack, onGoalCreated }: { onBack: () => void; onGoalCreated: (goal: Goal) => void }) {
  const { theme } = useContext(ThemeContext);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ChatMessage[]>([
    { role: 'assistant', content: "What goal would you like to work on?\n\n• \"I want to exercise more\"\n• \"Learn to play guitar\"\n• \"Read more books\"" }
  ]);
  const [goalData, setGoalData] = useState<{ title?: string; isComplete?: boolean }>({});
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/ai/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: conversation.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setConversation(prev => [...prev, { role: 'assistant', content: data.message }]);
        if (data.is_complete) {
          const title = data.message.match(/🎯\s*(.+?)(?:\n|$)/i)?.[1] || userMessage;
          setGoalData({ title: title.trim(), isComplete: true });
        }
      } else {
        throw new Error('API error');
      }
    } catch {
      setConversation(prev => [...prev, { role: 'assistant', content: "How often would you like to work on this?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const createGoal = () => {
    if (!goalData.title) return;
    onGoalCreated({
      id: Date.now().toString(),
      title: goalData.title,
      category: 'general',
      current_streak: 0,
      frequency: 'daily',
      description: ''
    });
  };

  const mdStyles = {
    body: { color: theme.text, fontSize: 15, lineHeight: 22 },
    strong: { fontWeight: '600' as const },
    paragraph: { marginVertical: 4 },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.chatHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onBack}>
            <Text style={[styles.backText, { color: theme.text }]}>← Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.chatHeaderTitle, { color: theme.text }]}>New Goal</Text>
          <View style={{ width: 50 }} />
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
                <View style={[styles.aiIndicator, { backgroundColor: theme.bgSecondary }]}>
                  <Text style={styles.aiIndicatorText}>AI</Text>
                </View>
              )}
              {msg.role === 'assistant' ? (
                <View style={{ flex: 1 }}>
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
              <View style={[styles.aiIndicator, { backgroundColor: theme.bgSecondary }]}>
                <Text style={styles.aiIndicatorText}>AI</Text>
              </View>
              <ActivityIndicator size="small" color={theme.accent} />
            </View>
          )}

          {goalData.isComplete && (
            <TouchableOpacity style={[styles.createButton, { backgroundColor: theme.accent }]} onPress={createGoal}>
              <Text style={styles.createButtonText}>✓ Create Goal</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.bgSecondary, color: theme.text }]}
            placeholder="Describe your goal..."
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
      // Call AI to verify the photo matches the goal
      const API_BASE = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

      const response = await fetch(`${API_BASE}/ai/verify-checkin`, {
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
    // Update the goal's streak and mark as checked today
    setGoals(prevGoals => prevGoals.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          current_streak: g.current_streak + 1,
          checkedToday: true,
          lastCheckIn: new Date().toISOString()
        };
      }
      return g;
    }));

    // Find the goal to get its title and new streak
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    // Add to myCheckIns
    const newCheckIn: CheckIn = {
      id: `checkin-${Date.now()}`,
      goalId,
      goalTitle: goal.title,
      photoUri,
      caption: caption || `Day ${goal.current_streak + 1}! 💪`,
      streak: goal.current_streak + 1,
      timestamp: new Date()
    };
    setMyCheckIns(prev => [newCheckIn, ...prev]);
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
          {tab === 'settings' && <SettingsScreen />}
        </SafeAreaView>
        <TabBar activeTab={tab} onTabPress={setTab} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
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
  goalCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginRight: 14, justifyContent: 'center', alignItems: 'center' },
  checkboxInner: { width: 10, height: 10, borderRadius: 3, opacity: 0 },
  checkboxPulse: { width: 10, height: 10, borderRadius: 5 },
  goalContent: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  goalMeta: { fontSize: 13 },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  streakText: { fontSize: 12, fontWeight: '600' },

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
  feedCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  feedUser: { flexDirection: 'row', alignItems: 'center' },
  feedAvatar: { fontSize: 32, marginRight: 10 },
  feedUserName: { fontSize: 15, fontWeight: '600' },
  feedGoal: { fontSize: 13 },
  feedStreak: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  feedStreakText: { fontSize: 12, fontWeight: '600' },
  feedImagePlaceholder: { height: 200, justifyContent: 'center', alignItems: 'center' },
  feedImage: { width: '100%', height: 300, resizeMode: 'cover' },
  feedCaption: { fontSize: 15, padding: 14, paddingTop: 10 },
  feedFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 0 },
  likeButton: { padding: 4 },
  feedTime: { fontSize: 12 },

  // Empty state
  emptyState: { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyStateTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptyStateText: { fontSize: 14, textAlign: 'center' },

  // Settings
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  settingInfo: { flex: 1, marginRight: 16 },
  settingTitle: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  settingDesc: { fontSize: 13 },
  logoutButton: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  logoutText: { fontSize: 15, fontWeight: '600' },

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
