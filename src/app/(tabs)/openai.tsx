/**
 * @fileoverview OpenAI Assistant Avatar-Relative Projection
 * Provides a chat interface for users to interact with OpenAI's GPT-3.5-turbo model
 * via Supabase Edge Functions. Features professional UI with loading states and error handling.
 *
 * @author Your Name
 * @version 1.1.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Easing,
  Clipboard,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Stack } from '@/src/components/AvatarRelativeProjection';
import { useSession } from '@/context/SessionProvider';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface CodeToken {
  text: string;
  type: 'plain' | 'comment' | 'string' | 'keyword' | 'type' | 'value';
}

interface Segment {
  type: 'text' | 'code';
  language?: string;
  code?: string;
  content?: string;
}

/**
 * Parses markdown code blocks and segments
 */
function parseMarkdown(text: string): Segment[] {
  const segments: Segment[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9+#-]*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const index = match.index;
    const language = match[1] || 'plaintext';
    const code = match[2];

    if (index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.substring(lastIndex, index),
      });
    }

    segments.push({
      type: 'code',
      language,
      code,
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  return segments;
}

/**
 * Formats inline code and bold styling
 */
function FormattedText({ text, textColorClass }: { text: string; textColorClass: string }) {
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  const parts = text.split(regex);

  return (
    <Text className={`text-base leading-6 ${textColorClass}`}>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          const codeVal = part.slice(1, -1);
          return (
            <Text
              key={i}
              className="bg-slate-200 dark:bg-slate-800 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-mono text-sm font-semibold">
              {codeVal}
            </Text>
          );
        } else if (part.startsWith('**') && part.endsWith('**')) {
          const boldVal = part.slice(2, -2);
          return (
            <Text key={i} className="font-bold">
              {boldVal}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
}

/**
 * CodeBlock component with dark styling, language badge, copy button, and syntax highlighting
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const tokens: CodeToken[] = [];

  // Basic Syntax highlighting regex
  const combinedRegex = new RegExp(
    '(' +
    '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*' + // comments
    ')|(' +
    '"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`' + // strings
    ')|(\\b' +
    '(?:const|let|var|function|return|if|else|import|export|class|from|as|for|while|await|async|try|catch|finally|new|this|typeof|instanceof|extends|super|def|elif|in|is|not|and|or|except|with|lambda)' +
    '\\b)|(\\b' +
    '(?:string|number|boolean|any|void|unknown|never|object|Array|Promise|React|useState|useEffect|useRef|useMemo|useCallback|Response|Request|fetch|console|Deno)' +
    '\\b)|(\\b' +
    '(?:\\d+|true|false|null|undefined)' +
    '\\b)',
    'g'
  );

  let lastIndex = 0;
  let match;
  const trimmedCode = code.trim();

  while ((match = combinedRegex.exec(trimmedCode)) !== null) {
    const index = match.index;
    const text = match[0];

    if (index > lastIndex) {
      tokens.push({ text: trimmedCode.substring(lastIndex, index), type: 'plain' });
    }

    if (match[1]) {
      tokens.push({ text, type: 'comment' });
    } else if (match[2]) {
      tokens.push({ text, type: 'string' });
    } else if (match[3]) {
      tokens.push({ text, type: 'keyword' });
    } else if (match[4]) {
      tokens.push({ text, type: 'type' });
    } else if (match[5]) {
      tokens.push({ text, type: 'value' });
    }

    lastIndex = combinedRegex.lastIndex;
  }

  if (lastIndex < trimmedCode.length) {
    tokens.push({ text: trimmedCode.substring(lastIndex), type: 'plain' });
  }

  const copyToClipboard = () => {
    try {
      if (Platform.OS === 'web') {
        navigator.clipboard.writeText(trimmedCode);
        Alert.alert('Copied', 'Code copied to clipboard!');
        return;
      }
      Clipboard.setString(trimmedCode);
      Alert.alert('Copied', 'Code copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const isIos = Platform.OS === 'ios';
  const monoFont = isIos ? 'Courier New' : 'monospace';

  return (
    <View className="my-2 bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
      <View className="bg-slate-900 px-4 py-2 flex-row justify-between items-center border-b border-slate-800">
        <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {language}
        </Text>
        <TouchableOpacity
          onPress={copyToClipboard}
          className="flex-row items-center bg-slate-800 px-2.5 py-1 rounded"
          activeOpacity={0.7}
        >
          <Ionicons name="copy-outline" size={12} color="#94A3B8" />
          <Text className="text-xs text-slate-300 ml-1">Copy</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} className="p-4 bg-slate-950">
        <Text style={{ fontFamily: monoFont }}>
          {tokens.map((token, i) => {
            let color = '#E2E8F0'; // plain text color
            let fontStyle: 'normal' | 'italic' = 'normal';

            switch (token.type) {
              case 'comment':
                color = '#64748B'; // slate-500
                fontStyle = 'italic';
                break;
              case 'string':
                color = '#34D399'; // emerald-400
                break;
              case 'keyword':
                color = '#F472B6'; // pink-400
                break;
              case 'type':
                color = '#60A5FA'; // blue-400
                break;
              case 'value':
                color = '#F59E0B'; // amber-500
                break;
            }

            return (
              <Text key={i} style={{ color, fontStyle }} className="text-sm">
                {token.text}
              </Text>
            );
          })}
        </Text>
      </ScrollView>
    </View>
  );
}

/**
 * Custom MarkdownRenderer to display assistant responses beautifully
 */
function MarkdownRenderer({ content, isUser }: { content: string; isUser: boolean }) {
  const segments = parseMarkdown(content);
  const textColorClass = isUser ? 'text-white' : 'text-slate-800';

  return (
    <View>
      {segments.map((segment, index) => {
        if (segment.type === 'code' && segment.code && segment.language) {
          return (
            <CodeBlock
              key={index}
              language={segment.language}
              code={segment.code}
            />
          );
        } else {
          const textVal = segment.content || '';
          const lines = textVal.split('\n');
          return (
            <View key={index} className="space-y-1">
              {lines.map((line, lineIdx) => {
                const trimmed = line.trim();
                const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*');

                if (isBullet) {
                  const bulletText = trimmed.replace(/^[•\-*]\s*/, '');
                  return (
                    <View key={lineIdx} className="flex-row items-start pl-2 py-0.5">
                      <Text className={`mr-2 text-base ${textColorClass}`}>•</Text>
                      <View className="flex-1">
                        <FormattedText text={bulletText} textColorClass={textColorClass} />
                      </View>
                    </View>
                  );
                }

                if (trimmed === '') {
                  return <View key={lineIdx} className="h-2" />;
                }

                return (
                  <View key={lineIdx} className="py-0.5">
                    <FormattedText text={line} textColorClass={textColorClass} />
                  </View>
                );
              })}
            </View>
          );
        }
      })}
    </View>
  );
}

interface MessageItemProps {
  message: Message;
  userAvatarUrl?: string;
  userInitials: string;
}

/**
 * Chat bubble wrapper component
 */
function MessageItem({ message, userAvatarUrl, userInitials }: MessageItemProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <View className="flex-row items-end justify-end my-2 self-end max-w-[85%]">
        <View className="mr-2 flex-1 items-end">
          <View className="bg-indigo-600 rounded-2xl rounded-tr-none px-4 py-3 shadow-sm border border-indigo-500">
            <MarkdownRenderer content={message.content} isUser={true} />
          </View>
          <Text className="text-[10px] text-slate-400 mt-1 px-1">
            {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View className="w-8 h-8 rounded-full bg-indigo-100 items-center justify-center border border-indigo-200 overflow-hidden shadow-sm">
          {userAvatarUrl ? (
            <Image source={{ uri: userAvatarUrl }} className="w-8 h-8" />
          ) : (
            <Text className="text-xs font-bold text-indigo-700 uppercase">{userInitials}</Text>
          )}
        </View>
      </View>
    );
  } else {
    return (
      <View className="flex-row items-end justify-start my-2 self-start max-w-[85%]">
        <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center border border-slate-300 mr-2 overflow-hidden shadow-sm">
          <Text className="text-base">🤖</Text>
        </View>
        <View className="flex-1">
          <View className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-slate-200">
            <MarkdownRenderer content={message.content} isUser={false} />
          </View>
          <Text className="text-[10px] text-slate-400 mt-1 px-1">
            {message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }
}

/**
 * Pulsing skeleton loading indicator for assistant responses
 */
function TypingSkeleton() {
  const [pulseAnim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View className="flex-row items-end justify-start my-2 self-start max-w-[80%]">
      <View className="w-8 h-8 rounded-full bg-slate-200 items-center justify-center border border-slate-300 mr-2 shadow-sm">
        <Text className="text-base">🤖</Text>
      </View>
      <View className="bg-slate-100 rounded-2xl rounded-tl-none p-4 border border-slate-200 shadow-sm flex-row items-center">
        <Animated.View style={{ opacity: pulseAnim }} className="w-2.5 h-2.5 rounded-full bg-slate-400" />
        <Animated.View style={{ opacity: pulseAnim }} className="w-2.5 h-2.5 rounded-full bg-slate-400 mx-1.5" />
        <Animated.View style={{ opacity: pulseAnim }} className="w-2.5 h-2.5 rounded-full bg-slate-400" />
      </View>
    </View>
  );
}

/**
 * Main OpenAI Avatar-Relative Projection Component
 */
export default function OpenAIAvatarRelativeProjection() {
  const { session } = useSession();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const [userProfile, setUserProfile] = useState<{ avatarUrl: string; initials: string }>({
    avatarUrl: '',
    initials: 'AI',
  });

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Initialize welcome message once on mount
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I am your AI assistant. How can I help you today? \n\nTry asking me a question or paste code here! **Example:**\n```typescript\nconst greet = () => {\n  console.log('Hello truex app!');\n};\n```",
        createdAt: new Date(),
      },
    ]);
  }, []);

  // Load user profile details for avatar pictures
  useEffect(() => {
    async function loadUserProfile() {
      try {
        if (!session?.user) return;
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.warn('Error fetching avatar profile details:', error.message);
        }

        const email = session.user.email || '';
        const username = data?.username || '';
        let initials = 'ME';

        if (username) {
          initials = username.substring(0, 2).toUpperCase();
        } else if (email) {
          initials = email.substring(0, 2).toUpperCase();
        }

        setUserProfile({
          avatarUrl: data?.avatar_url || '',
          initials,
        });
      } catch (err) {
        console.warn('Could not fetch user avatar profile details:', err);
      }
    }

    if (session) {
      loadUserProfile();
    }
  }, [session]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const paddingToBottom = 150;
    const isCloseToBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y <= paddingToBottom;

    if (!isCloseToBottom && contentSize.height > layoutMeasurement.height) {
      setShowScrollBottomBtn(true);
    } else {
      setShowScrollBottomBtn(false);
    }
  };

  const callOpenAIFunction = async () => {
    if (!prompt.trim()) {
      Alert.alert('Please enter a prompt');
      return;
    }

    const currentPrompt = prompt.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentPrompt,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);
    scrollToBottom();

    try {
      const { data, error } = await supabase.functions.invoke('openai', {
        body: { message: currentPrompt },
      });

      if (error) {
        Alert.alert('Error', error.message || 'Failed to get AI response');
        // Add error notification message in chat
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again. details: ' + (error.message || 'Function execution failed'),
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } else {
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.message || 'No response message returned.',
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'A network error occurred');
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const clearChat = () => {
    Alert.alert('Clear Chat', 'Are you sure you want to clear conversation history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          setMessages([
            {
              id: 'welcome',
              role: 'assistant',
              content: "Hello! I am your AI assistant. How can I help you today? \n\nTry asking me a question or paste code here! **Example:**\n```typescript\nconst greet = () => {\n  console.log('Hello truex app!');\n};\n```",
              createdAt: new Date(),
            },
          ]);
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      className="flex-1 bg-slate-50"
    >
      <Stack.AvatarRelativeProjection options={{ title: 'AI Assistant' }} />

      {/* Header Info */}
      <View className="bg-white px-4 py-3 border-b border-slate-200 flex-row justify-between items-center shadow-sm">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2" />
          <View>
            <Text className="font-bold text-slate-800 text-sm">GPT Assistant</Text>
            <Text className="text-[10px] text-slate-500">Always active & ready to help</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={clearChat}
          className="flex-row items-center px-2 py-1 rounded bg-slate-100 border border-slate-200"
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={14} color="#64748B" />
          <Text className="text-xs text-slate-600 ml-1 font-medium">Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Message List */}
      <View className="flex-1 relative">
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}
          onContentSizeChange={scrollToBottom}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {messages.map((item) => (
            <MessageItem
              key={item.id}
              message={item}
              userAvatarUrl={userProfile.avatarUrl}
              userInitials={userProfile.initials}
            />
          ))}

          {loading && <TypingSkeleton />}
        </ScrollView>

        {/* Scroll to Bottom Button */}
        {showScrollBottomBtn && (
          <TouchableOpacity
            onPress={scrollToBottom}
            className="absolute bottom-4 right-4 bg-indigo-600 w-10 h-10 rounded-full items-center justify-center shadow-lg border border-indigo-500"
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-down" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Input Tray */}
      <View className="p-3 bg-white border-t border-slate-200">
        <View className="flex-row items-end bg-slate-50 border border-slate-200 rounded-2xl p-1.5 pl-3.5 pr-1.5 shadow-sm">
          <TextInput
            className="flex-1 text-slate-800 text-base py-1.5 max-h-24 bg-transparent"
            placeholder="Ask AI anything..."
            placeholderTextColor="#94A3B8"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            textAlignVertical="center"
          />
          <TouchableOpacity
            className={`rounded-xl p-2.5 items-center justify-center ${
              loading || !prompt.trim() ? 'bg-slate-100' : 'bg-indigo-600 shadow-sm'
            }`}
            onPress={callOpenAIFunction}
            disabled={loading || !prompt.trim()}
            activeOpacity={0.7}
          >
            <Ionicons
              name={loading ? 'ellipsis-horizontal' : 'send'}
              size={16}
              color={loading || !prompt.trim() ? '#94A3B8' : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
