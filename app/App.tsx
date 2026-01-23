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
  Dimensions
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import Markdown from 'react-native-markdown-display';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// API base URL - your computer's IP so phone can reach it
const API_URL = 'http://192.168.183.52:8000';

// Types
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

// ============================================
// HOME SCREEN - Notion Style
// ============================================
function HomeScreen({
  onGoalPress,
  onAddGoal,
  onCheckIn
}: {
  onGoalPress: (goal: Goal) => void;
  onAddGoal: () => void;
  onCheckIn: (goal: Goal) => void;
}) {
  const [goals] = useState<Goal[]>([
    { id: '1', title: 'Run 3x per week', category: 'fitness', current_streak: 12, frequency: 'daily', description: '' },
    { id: '2', title: 'Read 30 minutes', category: 'learning', current_streak: 5, frequency: 'daily', description: '' },
    { id: '3', title: 'Meditate daily', category: 'wellness', current_streak: 3, frequency: 'daily', description: '' },
  ]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 18) return 'Good afternoon.';
    return 'Good evening.';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Notion-style greeting */}
        <Text style={styles.greeting}>{getGreeting()}</Text>

        {/* Today section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TODAY</Text>

          {goals.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={styles.todoItem}
              onPress={() => onGoalPress(goal)}
              activeOpacity={0.6}
            >
              <TouchableOpacity
                style={styles.todoCheckbox}
                onPress={() => onCheckIn(goal)}
              >
                <View style={styles.checkboxInner} />
              </TouchableOpacity>
              <View style={styles.todoContent}>
                <Text style={styles.todoTitle}>{goal.title}</Text>
                <Text style={styles.todoMeta}>
                  🔥 {goal.current_streak} day streak
                </Text>
              </View>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>
                  {Math.min(100, Math.round((goal.current_streak / 30) * 100))}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Add new */}
          <TouchableOpacity style={styles.addNew} onPress={onAddGoal}>
            <Text style={styles.addNewIcon}>+</Text>
            <Text style={styles.addNewText}>New goal</Text>
          </TouchableOpacity>
        </View>

        {/* Community section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>COMMUNITY</Text>
          <View style={styles.communityCard}>
            <Text style={styles.communityText}>
              See what others with similar goals are doing
            </Text>
            <Text style={styles.communityArrow}>→</Text>
          </View>
        </View>
      </ScrollView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

// ============================================
// GOAL DETAIL - Notion Style
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
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  const completedDays = weekDays.map((_, i) => i < today - 1);
  const progress = Math.min(100, Math.round((goal.current_streak / 30) * 100));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Back */}
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Title - Notion style with serif */}
        <Text style={styles.pageTitle}>{goal.title}</Text>

        {/* Progress section */}
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Progress</Text>
          <View style={styles.propertyValue}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
        </View>

        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Streak</Text>
          <Text style={styles.propertyValueText}>🔥 {goal.current_streak} days</Text>
        </View>

        <View style={styles.divider} />

        {/* This Week */}
        <Text style={styles.blockTitle}>This Week</Text>
        <View style={styles.weekGrid}>
          {weekDays.map((day, index) => (
            <View key={day} style={styles.weekDay}>
              <View style={[
                styles.weekDayCircle,
                completedDays[index] && styles.weekDayComplete,
                index === today - 1 && styles.weekDayToday
              ]}>
                {completedDays[index] && <Text style={styles.weekDayCheck}>✓</Text>}
              </View>
              <Text style={styles.weekDayLabel}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Actions */}
        <TouchableOpacity style={styles.actionButton} onPress={onCheckIn}>
          <Text style={styles.actionButtonIcon}>📷</Text>
          <Text style={styles.actionButtonText}>Check in now</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButtonSecondary} onPress={onAskCoach}>
          <Text style={styles.actionButtonIcon}>💬</Text>
          <Text style={styles.actionButtonTextSecondary}>Ask AI Coach</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// AI COACH - Notion Style
// ============================================
function AICoachScreen({ goal, onBack }: { goal: Goal; onBack: () => void }) {
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.coachHeader}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.coachHeaderTitle}>AI Coach</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Goal context bar */}
        <View style={styles.contextBar}>
          <Text style={styles.contextText}>
            🎯 {goal.title} • 🔥 {goal.current_streak} days
          </Text>
        </View>

        {/* Messages - Notion style */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {conversation.map((msg, index) => (
            <View key={index} style={styles.messageBlock}>
              {msg.role === 'assistant' && (
                <View style={styles.aiIndicator}>
                  <Text style={styles.aiIndicatorText}>AI</Text>
                </View>
              )}
              {msg.role === 'assistant' ? (
                <View style={{ flex: 1 }}>
                  <Markdown style={markdownStyles}>{msg.content}</Markdown>
                </View>
              ) : (
                <Text style={[styles.messageText, styles.userMessageText]}>
                  {msg.content}
                </Text>
              )}
            </View>
          ))}

          {isLoading && (
            <View style={styles.messageBlock}>
              <View style={styles.aiIndicator}>
                <Text style={styles.aiIndicatorText}>AI</Text>
              </View>
              <ActivityIndicator size="small" color="#37352F" />
            </View>
          )}
        </ScrollView>

        {/* Input - Notion style */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your goal..."
            placeholderTextColor="#A5A5A5"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
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
// IN-APP CAMERA CHECK-IN
// ============================================
function CheckInScreen({ goal, onBack, onComplete }: { goal: Goal; onBack: () => void; onComplete: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [timeLeft, setTimeLeft] = useState(120);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      const result = await cameraRef.current.takePictureAsync();
      if (result) {
        setPhoto(result.uri);
      }
    }
  };

  const submitCheckIn = async () => {
    if (!photo) return;
    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsUploading(false);
    Alert.alert(
      '✓ Check-in complete',
      `Your streak is now ${goal.current_streak + 1} days!`,
      [{ text: 'Done', onPress: onComplete }]
    );
  };

  if (!permission) {
    return <View style={styles.cameraContainer}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.cameraContainer}>
        <Text style={styles.permissionText}>Camera access is needed for check-ins</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.permissionBack}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      {!photo ? (
        <>
          {/* Live camera */}
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          >
            {/* Header overlay */}
            <SafeAreaView style={styles.cameraOverlay}>
              <View style={styles.cameraTopBar}>
                <TouchableOpacity onPress={onBack}>
                  <Text style={styles.cameraClose}>✕</Text>
                </TouchableOpacity>
                <Text style={[
                  styles.timer,
                  timeLeft < 30 && styles.timerUrgent
                ]}>
                  {formatTime(timeLeft)}
                </Text>
                <TouchableOpacity onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                  <Text style={styles.cameraFlip}>⟳</Text>
                </TouchableOpacity>
              </View>

              {/* Goal badge */}
              <View style={styles.cameraBadge}>
                <Text style={styles.cameraBadgeText}>🎯 {goal.title}</Text>
              </View>
            </SafeAreaView>
          </CameraView>

          {/* Capture button */}
          <View style={styles.captureRow}>
            <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        /* Photo review */
        <SafeAreaView style={styles.reviewContainer}>
          <Text style={styles.reviewTitle}>Looking good!</Text>
          <View style={styles.reviewPhoto}>
            <Text style={styles.reviewPhotoText}>📸</Text>
          </View>
          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.retakeBtn} onPress={() => setPhoto(null)}>
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={submitCheckIn} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

// ============================================
// CREATE GOAL WITH AI
// ============================================
function CreateGoalScreen({
  onBack,
  onGoalCreated
}: {
  onBack: () => void;
  onGoalCreated: (goal: Goal) => void;
}) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "What goal would you like to work on?\n\nYou can say something like:\n• \"I want to exercise more\"\n• \"Learn to play guitar\"\n• \"Read more books\""
    }
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
          // Extract goal title from conversation
          const goalTitle = extractGoalTitle(data.message) || userMessage;
          setGoalData({ title: goalTitle, isComplete: true });
        }
      } else {
        throw new Error('API error');
      }
    } catch {
      setConversation(prev => [...prev, {
        role: 'assistant',
        content: "Got it! Let me help you refine that. How often would you like to work on this goal?"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const extractGoalTitle = (text: string): string | null => {
    // Look for goal definition patterns
    const patterns = [
      /🎯\s*(?:Your goal:?)?\s*(.+?)(?:\n|$)/i,
      /goal:\s*(.+?)(?:\n|$)/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  const createGoal = () => {
    if (!goalData.title) return;

    const newGoal: Goal = {
      id: Date.now().toString(),
      title: goalData.title,
      category: 'general',
      current_streak: 0,
      frequency: 'daily',
      description: ''
    };

    onGoalCreated(newGoal);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.coachHeader}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.coachHeaderTitle}>New Goal</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {conversation.map((msg, index) => (
            <View key={index} style={styles.messageBlock}>
              {msg.role === 'assistant' && (
                <View style={styles.aiIndicator}>
                  <Text style={styles.aiIndicatorText}>AI</Text>
                </View>
              )}
              {msg.role === 'assistant' ? (
                <View style={{ flex: 1 }}>
                  <Markdown style={markdownStyles}>{msg.content}</Markdown>
                </View>
              ) : (
                <Text style={[styles.messageText, styles.userMessageText]}>
                  {msg.content}
                </Text>
              )}
            </View>
          ))}

          {isLoading && (
            <View style={styles.messageBlock}>
              <View style={styles.aiIndicator}>
                <Text style={styles.aiIndicatorText}>AI</Text>
              </View>
              <ActivityIndicator size="small" color="#37352F" />
            </View>
          )}

          {/* Create button when goal is ready */}
          {goalData.isComplete && (
            <TouchableOpacity style={styles.createGoalButton} onPress={createGoal}>
              <Text style={styles.createGoalButtonText}>✓ Create Goal</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Describe your goal..."
            placeholderTextColor="#A5A5A5"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
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
// MAIN APP
// ============================================
export default function App() {
  const [screen, setScreen] = useState<'home' | 'goal' | 'coach' | 'checkin' | 'create'>('home');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', title: 'Run 3x per week', category: 'fitness', current_streak: 12, frequency: 'daily', description: '' },
    { id: '2', title: 'Read 30 minutes', category: 'learning', current_streak: 5, frequency: 'daily', description: '' },
    { id: '3', title: 'Meditate daily', category: 'wellness', current_streak: 3, frequency: 'daily', description: '' },
  ]);

  if (screen === 'create') {
    return (
      <CreateGoalScreen
        onBack={() => setScreen('home')}
        onGoalCreated={(newGoal) => {
          setGoals(prev => [...prev, newGoal]);
          setSelectedGoal(newGoal);
          setScreen('goal');
        }}
      />
    );
  }

  if (screen === 'checkin' && selectedGoal) {
    return (
      <CheckInScreen
        goal={selectedGoal}
        onBack={() => setScreen('goal')}
        onComplete={() => setScreen('home')}
      />
    );
  }

  if (screen === 'coach' && selectedGoal) {
    return <AICoachScreen goal={selectedGoal} onBack={() => setScreen('goal')} />;
  }

  if (screen === 'goal' && selectedGoal) {
    return (
      <GoalDetailScreen
        goal={selectedGoal}
        onBack={() => setScreen('home')}
        onAskCoach={() => setScreen('coach')}
        onCheckIn={() => setScreen('checkin')}
      />
    );
  }

  return (
    <HomeScreen
      onGoalPress={(goal) => { setSelectedGoal(goal); setScreen('goal'); }}
      onAddGoal={() => setScreen('create')}
      onCheckIn={(goal) => { setSelectedGoal(goal); setScreen('checkin'); }}
    />
  );
}

// ============================================
// NOTION-INSPIRED STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // Typography - Notion style
  greeting: {
    fontSize: 40,
    fontWeight: '700',
    color: '#37352F',
    marginTop: 32,
    marginBottom: 32,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  // Sections
  section: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9B9A97',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Todo items
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1EF',
  },
  todoCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D3D3D3',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    color: '#37352F',
    marginBottom: 2,
  },
  todoMeta: {
    fontSize: 13,
    color: '#9B9A97',
  },
  progressPill: {
    backgroundColor: '#F1F1EF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  progressPillText: {
    fontSize: 12,
    color: '#37352F',
    fontWeight: '500',
  },

  // Add new
  addNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  addNewIcon: {
    fontSize: 18,
    color: '#9B9A97',
    marginRight: 8,
  },
  addNewText: {
    fontSize: 15,
    color: '#9B9A97',
  },

  // Community
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F7F6F3',
    borderRadius: 8,
  },
  communityText: {
    fontSize: 14,
    color: '#37352F',
  },
  communityArrow: {
    fontSize: 16,
    color: '#9B9A97',
  },

  // Back button
  backRow: {
    paddingVertical: 16,
  },
  backText: {
    fontSize: 15,
    color: '#37352F',
  },

  // Page title
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#37352F',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  // Properties
  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  propertyLabel: {
    width: 80,
    fontSize: 14,
    color: '#9B9A97',
  },
  propertyValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyValueText: {
    fontSize: 14,
    color: '#37352F',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#F1F1EF',
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2EAADC',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 13,
    color: '#37352F',
    width: 40,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F1EF',
    marginVertical: 20,
  },

  // Block title
  blockTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37352F',
    marginBottom: 16,
  },

  // Week grid
  weekGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    alignItems: 'center',
  },
  weekDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  weekDayComplete: {
    backgroundColor: '#2EAADC',
    borderColor: '#2EAADC',
  },
  weekDayToday: {
    borderColor: '#37352F',
    borderWidth: 2,
  },
  weekDayCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  weekDayLabel: {
    fontSize: 12,
    color: '#9B9A97',
  },

  // Action buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2EAADC',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F6F3',
    paddingVertical: 14,
    borderRadius: 8,
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#37352F',
  },

  // Coach header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1EF',
  },
  coachHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#37352F',
  },
  contextBar: {
    backgroundColor: '#F7F6F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  contextText: {
    fontSize: 13,
    color: '#37352F',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageBlock: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    maxWidth: '100%',
  },
  aiIndicator: {
    backgroundColor: '#F7F6F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
  },
  aiIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9B9A97',
  },
  messageText: {
    flex: 1,
    fontSize: 15,
    color: '#37352F',
    lineHeight: 22,
  },
  userMessageText: {
    backgroundColor: '#F7F6F3',
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F1EF',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#37352F',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F7F6F3',
    borderRadius: 8,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: '#2EAADC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
  },
  cameraTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  cameraClose: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '300',
  },
  timer: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerUrgent: {
    color: '#FF3B30',
  },
  cameraFlip: {
    color: '#FFF',
    fontSize: 28,
  },
  cameraBadge: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cameraBadgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  captureRow: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
  },

  // Review
  reviewContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
  },
  reviewPhoto: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    backgroundColor: '#333',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  reviewPhotoText: {
    fontSize: 64,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 16,
  },
  retakeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  retakeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    backgroundColor: '#2EAADC',
    minWidth: 120,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Permission
  permissionText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: '#2EAADC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  permissionBack: {
    color: '#9B9A97',
    fontSize: 14,
  },

  // Create Goal
  createGoalButton: {
    backgroundColor: '#2EAADC',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center' as const,
  },
  createGoalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

// Markdown styles for AI responses
const markdownStyles = {
  body: {
    color: '#37352F',
    fontSize: 15,
    lineHeight: 22,
  },
  strong: {
    fontWeight: '600' as const,
    color: '#37352F',
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  paragraph: {
    marginVertical: 4,
  },
};
