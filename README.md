# 🚀 Expo + Supabase + OpenAI Template

A modern, production-ready React Native template built with Expo Router, Supabase authentication, and OpenAI integration. Features a professional UI built with NativeWind and comprehensive user management.

## ✨ Features

### 🔐 **Authentication & User Management**

- Complete Supabase authentication flow (sign up, sign in, sign out)
- Protected routes with Expo Router v6
- User profile management with database persistence
- Row Level Security (RLS) for secure data access

### 🤖 **AI Integration**

- OpenAI GPT-3.5-turbo integration via Supabase Edge Functions
- Professional AI assistant interface
- Secure API key management through environment variables

### 🎨 **Modern UI/UX**

- Professional design system with NativeWind (Tailwind CSS for React Native)
- Responsive layouts for mobile and web
- Card-based design patterns
- Consistent typography and spacing
- Custom TouchableOpacity components

### 🏗️ **Architecture**

- **Expo SDK 54** - Latest stable release
- **Expo Router v6** - File-based routing with Protected Routes
- **Supabase** - Backend as a Service with PostgreSQL
- **TypeScript** - Full type safety
- **NativeWind v4** - Tailwind CSS for React Native

## 📁 Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication Avatar-Relative Projections
│   │   └── index.tsx      # Sign in/Sign up
│   ├── (tabs)/            # Main app tabs
<<<<<<< HEAD
│   │   ├── index.tsx      # Consequence Supervision screen
=======
│   │   ├── index.tsx      # Home Avatar-Relative Projection
>>>>>>> subagent-UI-Projection-Rebrander-agi-expo-supabase-swarm-b3d80ab0
│   │   ├── openai.tsx     # AI assistant
│   │   └── account.tsx    # User profile
│   ├── _layout.tsx        # Root layout with auth protection
│   ├── modal.tsx          # Modal demo
│   └── +not-found.tsx     # 404 page
├── components/            # Reusable UI components
├── constants/             # App constants and themes
└── utils/                 # Utility functions

supabase/
├── functions/openai/      # Edge Function for OpenAI integration
├── migrations/            # Database schema migrations
├── config.toml           # Supabase configuration
├── .env.local            # Local environment variables (not committed)
└── .env.local.example    # Example environment file (committed)

# Environment Files
.env                      # Main environment file (not committed)
.env.example             # Example main environment file (committed)
```

## 🛠️ Tech Stack

| Category      | Technology                             |
| ------------- | -------------------------------------- |
| **Framework** | Expo SDK 54 + React Native             |
| **Routing**   | Expo Router v6 (file-based)            |
| **Styling**   | NativeWind v4 (Tailwind CSS)           |
| **Backend**   | Supabase (Auth + Database + Functions) |
| **Database**  | PostgreSQL with Row Level Security     |
| **AI**        | OpenAI GPT-3.5-turbo                   |
| **Language**  | TypeScript                             |
| **State**     | React Context + Hooks                  |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- Supabase CLI: [Installation Guide](https://supabase.com/docs/guides/cli/getting-started)
- OpenAI API Key: [Get one here](https://platform.openai.com/api-keys)

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd gemini-expo-supabase

# Install dependencies
npm install
```

### 2. Set Up Supabase

```bash
# Start local Supabase
supabase start

# Apply database migrations
supabase db reset
```

### 3. Configure Environment

```bash
# Copy example environment files
cp .env.example .env
cp supabase/.env.local.example supabase/.env.local
```

Add your OpenAI API key to `supabase/.env.local`:

```bash
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

The `.env` file will be automatically populated with local Supabase URLs when you run `supabase start`.

### 4. Start Edge Functions

```bash
# Start the OpenAI Edge Function
supabase functions serve openai --env-file supabase/.env.local
```

### 5. Run the App

```bash
# Start Expo development server
npm start

# Run on specific platforms
npm run ios     # iOS simulator
npm run android # Android emulator
npm run web     # Web browser
```

## 🔧 Development

### Environment Configuration

This project uses environment files to manage configuration:

| File                          | Purpose                                       | Committed |
| ----------------------------- | --------------------------------------------- | --------- |
| `.env.example`                | Example main environment variables            | ✅ Yes    |
| `.env`                        | Actual environment variables (auto-generated) | ❌ No     |
| `supabase/.env.local.example` | Example Supabase Edge Function variables      | ✅ Yes    |
| `supabase/.env.local`         | Actual Edge Function environment variables    | ❌ No     |

**First-time setup:**

```bash
# Copy example files
cp .env.example .env
cp supabase/.env.local.example supabase/.env.local

# Edit supabase/.env.local and add your OpenAI API key
OPENAI_API_KEY=sk-your-actual-openai-api-key-here
```

### Local Supabase URLs

After running `supabase start`, you'll have:

- **API URL**: `http://127.0.0.1:54321`
- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio**: `http://127.0.0.1:54323` (Database management UI)
- **Edge Functions**: `http://127.0.0.1:54321/functions/v1/openai`

### Database Management

```bash
# View database schema
supabase db diff

# Reset database (applies all migrations)
supabase db reset

# Create new migration
supabase migration new <migration_name>

# View database in browser
open http://127.0.0.1:54323
```

### Testing Edge Functions

```bash
# Test the OpenAI function
curl -X POST http://127.0.0.1:54321/functions/v1/openai \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, AI!"}'
```

## 📱 App Features

### 🏠 **Consequence Supervision Avatar-Relative Projection**

- Welcome message with user info
- Quick action cards for navigation
- Feature overview and checklist
- Professional card-based layout

### 🤖 **AI Assistant**

- Chat interface with OpenAI GPT-3.5-turbo
- Professional messaging UI
- Loading states and error handling
- Copy suggestions and examples

### 👤 **Account Management**

- User profile editing (username, website, full name)
- Avatar URL management
- Account information display
- Secure sign out functionality

### 🔐 **Authentication**

- Email/password sign up and sign in
- Form validation and error handling
- Automatic profile creation
- Protected route navigation

## 🚀 Deployment

### Supabase Production Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Push your schema: `supabase db push`
3. Deploy Edge Functions: `supabase functions deploy openai`
4. Set production secrets: `supabase secrets set OPENAI_API_KEY=your-key`

### Expo App Deployment

```bash
# Build for production
eas build --platform all

# Submit to app stores
eas submit --platform all
```

## 📚 Documentation

- [DATABASE.md](./DATABASE.md) - Database schema and setup
- [Expo Router Docs](https://docs.expo.dev/router/)
- [Supabase Docs](https://supabase.com/docs)
- [NativeWind Docs](https://www.nativewind.dev/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Powered by [Supabase](https://supabase.com/)
- AI by [OpenAI](https://openai.com/)
- Styled with [NativeWind](https://www.nativewind.dev/)

---

**Ready to build something amazing?** 🚀
This template gives you everything you need for a modern, scalable mobile app with authentication, database, and AI features!
