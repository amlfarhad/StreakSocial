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
              style={[styles.checkbox, { borderColor: theme.accent }]}
              onPress={() => onCheckIn(goal)}
            >
              <View style={[styles.checkboxInner, { backgroundColor: theme.accent }]} />
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
function FeedScreen() {
  const { theme } = useContext(ThemeContext);

  const feedItems: FeedItem[] = [
    { id: '1', user: 'Sarah K.', avatar: '👩‍🦰', goal: 'Morning yoga', streak: 45, caption: 'Day 45! 🧘‍♀️ Feeling stronger every day', timeAgo: '2h ago', likes: 12 },
    { id: '2', user: 'Mike R.', avatar: '👨‍🦱', goal: 'Read daily', streak: 23, caption: 'Just finished Atomic Habits 📚', timeAgo: '4h ago', likes: 8 },
    { id: '3', user: 'Emma L.', avatar: '👩', goal: 'Run 5K', streak: 14, caption: 'Rainy run but made it happen! 🌧️', timeAgo: '5h ago', likes: 24 },
    { id: '4', user: 'Alex T.', avatar: '🧑', goal: 'Learn guitar', streak: 30, caption: 'Finally nailed that chord progression 🎸', timeAgo: '8h ago', likes: 31 },
  ];

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.pageTitle, { color: theme.text }]}>Community</Text>
      <Text style={[styles.subGreeting, { color: theme.textSecondary, marginBottom: 24 }]}>
        See what others are achieving
      </Text>

      {feedItems.map(item => (
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

          <View style={[styles.feedImagePlaceholder, { backgroundColor: theme.bgSecondary }]}>
            <Text style={{ fontSize: 48 }}>📷</Text>
          </View>

          <Text style={[styles.feedCaption, { color: theme.text }]}>{item.caption}</Text>

          <View style={styles.feedFooter}>
            <TouchableOpacity style={styles.likeButton}>
              <Text style={{ fontSize: 16 }}>❤️ {item.likes}</Text>
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

      <TouchableOpacity style={[styles.logoutButton, { borderColor: theme.accent }]}>
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
  const today = new Date().getDay();
  const completedDays = weekDays.map((_, i) => i < today - 1);
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
                index === today - 1 && { borderColor: theme.text, borderWidth: 2 }
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
      content: `I'm your coach for "${goal.title}".\n\nYou're on a ${goal.current_streak} day streak — keep it up!\n\nHow can I help you today?`
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
// CHECK-IN SCREEN (Camera)
// ============================================
function CheckInScreen({ goal, onBack, onComplete }: { goal: Goal; onBack: () => void; onComplete: () => void }) {
  const { theme } = useContext(ThemeContext);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    if (cameraRef.current) {
      const result = await cameraRef.current.takePictureAsync();
      if (result) setPhoto(result.uri);
    }
  };

  const submitCheckIn = async () => {
    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsUploading(false);
    Alert.alert('✓ Check-in complete', `Your streak is now ${goal.current_streak + 1} days!`, [{ text: 'Done', onPress: onComplete }]);
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

  return (
    <View style={styles.cameraContainer}>
      {!photo ? (
        <>
          <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
            <SafeAreaView style={styles.cameraOverlay}>
              <View style={styles.cameraTopBar}>
                <TouchableOpacity onPress={onBack}>
                  <Text style={styles.cameraClose}>✕</Text>
                </TouchableOpacity>
                <View style={styles.goalBadge}>
                  <Text style={styles.goalBadgeText}>🎯 {goal.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                  <Text style={styles.cameraFlip}>⟳</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </CameraView>
          <View style={styles.captureRow}>
            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <SafeAreaView style={[styles.reviewContainer, { backgroundColor: theme.bg }]}>
          <Text style={[styles.reviewTitle, { color: theme.text }]}>Looking good!</Text>
          <View style={[styles.reviewPhoto, { backgroundColor: theme.bgSecondary }]}>
            <Text style={{ fontSize: 64 }}>📸</Text>
          </View>
          <View style={styles.reviewActions}>
            <TouchableOpacity style={[styles.retakeBtn, { borderColor: theme.border }]} onPress={() => setPhoto(null)}>
              <Text style={{ color: theme.text }}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: theme.accent }]} onPress={submitCheckIn} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');
  const [tab, setTab] = useState('feed');
  const [screen, setScreen] = useState<'tabs' | 'goal' | 'coach' | 'checkin' | 'create'>('tabs');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', title: 'Run 3x per week', category: 'fitness', current_streak: 12, frequency: 'daily', description: '' },
    { id: '2', title: 'Read 30 minutes', category: 'learning', current_streak: 5, frequency: 'daily', description: '' },
    { id: '3', title: 'Meditate daily', category: 'wellness', current_streak: 3, frequency: 'daily', description: '' },
  ]);

  const theme = isDark ? darkTheme : lightTheme;

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
        <CheckInScreen goal={selectedGoal} onBack={() => setScreen('goal')} onComplete={() => setScreen('tabs')} />
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
    return (
      <ThemeContext.Provider value={{ theme, isDark, toggle: () => setIsDark(!isDark) }}>
        <GoalDetailScreen
          goal={selectedGoal}
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
          {tab === 'feed' && <FeedScreen />}
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
  goalContent: { flex: 1 },
  goalTitle: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  goalMeta: { fontSize: 13 },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  streakText: { fontSize: 12, fontWeight: '600' },

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
  feedCaption: { fontSize: 15, padding: 14, paddingTop: 10 },
  feedFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingTop: 0 },
  likeButton: { padding: 4 },
  feedTime: { fontSize: 12 },

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
  cameraFlip: { color: '#FFF', fontSize: 28 },
  goalBadge: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  goalBadgeText: { color: '#FFF', fontSize: 14 },
  captureRow: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF' },
  reviewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  reviewTitle: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  reviewPhoto: { width: 200, height: 200, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  reviewActions: { flexDirection: 'row', gap: 16 },
  retakeBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  submitBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  submitBtnText: { color: '#FFF', fontWeight: '600' },

  // Permission
  permissionText: { fontSize: 16, marginBottom: 20, textAlign: 'center', paddingHorizontal: 40 },
  permissionButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 16 },
  permissionButtonText: { color: '#FFF', fontWeight: '600' },
});
