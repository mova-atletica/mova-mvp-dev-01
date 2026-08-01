# Mova - Advanced Exercise Analysis Platform

A web-based platform for real-time exercise analysis using computer vision and machine learning.

## 🚀 Features

### Core Analysis
- **Real-time Pose Detection**: Live camera analysis using TensorFlow.js and MoveNet
- **Angle Calculation**: Precise joint angle measurements for biomechanical analysis
- **Reference Comparison**: Compare user performance against reference videos
- **Advanced Metrics**: DTW, cosine similarity, range of motion, tempo analysis, and balance metrics

### Session Summary & Creative Assets
- **Session Summary Card**: Comprehensive overview of workout performance
- **Creative Asset Generation**: Generate visual assets from your workout session:
  - **Muybridge Sequence**: Grid of key frames with pose overlays
  - **Motion Trail Video**: Animated skeleton with trailing effect
  - **Composite Image**: All poses stacked with transparency
  - **Geometric Overlay**: Artistic overlays with golden ratios
  - **Session Summary Card**: Trading card style with stats
- **Download & Share**: Save assets locally or share via device-native sharing
- **No Account Required**: All assets generated client-side, no external links

### Exercise Management
- **Exercise Library**: Browse and search exercises with detailed information
- **Reference Videos**: Upload reference videos for comparison
- **Custom Exercises**: Create and manage your own exercise library
- **Google Cloud Storage**: Secure video and image storage

### Advanced Analysis System
- **Live Analysis (Browser-based)**: Real-time feedback during recording with basic angle comparison
- **Advanced Analysis (Python Backend)**: DTW, cosine similarity, repetition detection, tempo analysis, balance metrics
- **Comprehensive Scoring**: Multiple metrics with improvement suggestions
- **Privacy-focused**: Live analysis happens in browser, advanced analysis requires backend

## 🏗️ Architecture

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **TensorFlow.js**: Client-side pose detection
- **Recharts**: Data visualization

### Backend
- **Python FastAPI**: Advanced analysis server
- **NumPy/SciPy**: Scientific computing
- **scikit-learn**: Machine learning algorithms
- **OpenCV**: Computer vision processing

### Database
- **SQLite**: Local development database
- **Prisma ORM**: Type-safe database access

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mova-mvp-dev-01
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Install Python backend dependencies**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. **Start the development servers**
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend (optional, for advanced analysis)
   cd backend
   source venv/bin/activate
   python main.py
   ```

### Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:8000
GOOGLE_CLOUD_PROJECT_ID=your-actual-project-id
GOOGLE_CLOUD_BUCKET_NAME=your-actual-bucket-name
GOOGLE_CLOUD_KEY_FILE=./google-cloud-key.json
DATABASE_URL="file:./dev.db"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe Pro (local = test mode + Stripe CLI listener — do not add a sandbox Dashboard webhook)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Stripe local:** `stripe listen --forward-to localhost:3000/api/stripe/webhook` and paste the CLI signing secret into `STRIPE_WEBHOOK_SECRET`.

**Stripe production (after deploy):** Live Workbench → Webhooks → Add destination → `https://app.mova-atletica.xyz/api/stripe/webhook` (events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`) → put the live `whsec_...` in Vercel. Also set live `STRIPE_SECRET_KEY`, live price IDs, and `NEXT_PUBLIC_SITE_URL=https://app.mova-atletica.xyz`.

**Supabase:** Run `supabase/migrations/20260731_profiles_entitlement_lock.sql` in the SQL Editor so entitlement columns cannot be client-written.
## 📊 Advanced Analysis Features

### DTW (Dynamic Time Warping)
- **Purpose**: Handles different movement speeds and body types
- **How it works**: Aligns two time series by finding optimal matching path
- **Benefits**: 
  - Compares movements regardless of speed differences
  - Accounts for individual body proportions
  - More robust than frame-by-frame comparison

### Cosine Similarity
- **Purpose**: Pattern matching for movement sequences
- **How it works**: Compares normalized angle sequences
- **Benefits**:
  - Focuses on movement shape, not absolute values
  - Handles different body types effectively
  - Provides pattern-based scoring

### Repetition Analysis
- **Purpose**: Detects and analyzes exercise repetitions
- **How it works**: 
  - Finds peaks and valleys in angle data
  - Groups movements into repetitions
  - Calculates consistency metrics
- **Benefits**:
  - Counts actual repetitions performed
  - Measures consistency between reps
  - Provides tempo analysis

### Balance & Stability
- **Purpose**: Analyzes postural stability during exercise
- **How it works**:
  - Calculates center of mass movement
  - Measures sway variance and velocity
  - Analyzes symmetry between left/right sides
- **Benefits**:
  - Identifies balance issues
  - Measures postural control
  - Provides stability scoring

## 🎯 Usage

### Basic Analysis
1. Navigate to an exercise in the library
2. Click "Try Exercise"
3. Record a video or upload an existing one
4. View results in the Basic Analysis tab

### Advanced Analysis
1. Ensure the Python backend is running
2. Complete a workout session
3. View advanced metrics in the Advanced Analysis tab

### Session Summary & Assets
1. Complete a workout session
2. Navigate to the "Session Summary & Assets" tab
3. Generate creative assets from your session
4. Download or share your assets

### Asset Generation
The platform supports generating creative visual assets from workout sessions:
- **Canvas-based generation**: Uses HTML5 Canvas for image creation
- **Client-side processing**: All generation happens in the browser
- **Download support**: Direct download of generated assets
- **Native sharing**: Device-native sharing when available

## 🔧 API Endpoints

### Exercises
- `GET /api/exercises` - List all exercises
- `GET /api/exercises/[id]` - Get exercise details
- `POST /api/exercises` - Create new exercise
- `PUT /api/exercises/[id]` - Update exercise
- `DELETE /api/exercises/[id]` - Delete exercise

### Upload
- `POST /api/upload/video` - Upload reference video
- `POST /api/upload/image` - Upload exercise image
- `POST /api/upload/keypoints` - Upload pose keypoints

### Storage
- `POST /api/storage/signed-url` - Get signed URL for upload
- `POST /api/storage/proxy` - Proxy file access

### Advanced Analysis
- `POST /analyze` - Analyzes exercise data and returns comprehensive results
- `GET /health` - Health check endpoint

## 🎨 Theme Customization

### Quick Color Adjustments
- **Light Mode Colors**: `src/app/globals.css` (lines 1-50)
- **Dark Mode Colors**: `src/contexts/ThemeContext.tsx` (lines 30-120)

### Key Color Variables
```css
:root {
  --background: #f6f1e3;     /* Main page background */
  --foreground: #17150f;     /* Primary text color */
  --surface: #f6f1e2;        /* Card/section backgrounds */
  --surface-hover: #f4eedd;  /* Hover states */
  --muted: #7d765f;          /* Secondary text */
}
```

## 📁 Project Structure
```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── exercises/      # Exercise pages
│   ├── try/           # Exercise recording
│   └── results/       # Analysis results
├── components/         # React components
├── lib/               # Utility functions
│   ├── effects/       # Visual effects (muybridge, motion-trails, stats)
│   └── exportService.ts # Asset export functionality
├── data/              # Static data
└── types/             # TypeScript types
```

### Key Components
- `SessionSummaryTab`: Session summary and asset generation
- `ExerciseCard`: Exercise display component
- `Layout`: Main layout wrapper
- `AssetGenerationModal`: Creative asset generation interface

## 🔍 Troubleshooting

### Backend Not Starting
```bash
# Check Python version
python3 --version

# Install missing dependencies
pip install -r requirements.txt

# Check if port 8000 is available
lsof -i :8000
```

### Frontend Can't Connect to Backend
```bash
# Check if backend is running
curl http://localhost:8000/health

# Verify environment variable
echo $NEXT_PUBLIC_PYTHON_BACKEND_URL
```

### Analysis Not Working
- Ensure reference data exists for the exercise
- Check browser console for errors
- Verify pose detection is working
- Check network connectivity to backend

## 🚀 Performance Considerations

### Browser Performance
- **Live analysis**: Optimized for real-time processing
- **Memory usage**: Efficient data structures for angle storage
- **GPU acceleration**: Uses WebGL for TensorFlow.js

### Backend Performance
- **Async processing**: Non-blocking analysis
- **Memory efficient**: Streaming data processing
- **Scalable**: Can handle multiple concurrent requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation
- Contact the development team
