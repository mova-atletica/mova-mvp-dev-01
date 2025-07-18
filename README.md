# Mova - Advanced Exercise Analysis Platform

A web-based platform for real-time exercise analysis using computer vision and machine learning.

## Features

### Core Analysis
- **Real-time Pose Detection**: Live camera analysis using TensorFlow.js and MoveNet
- **Angle Calculation**: Precise joint angle measurements for biomechanical analysis
- **Reference Comparison**: Compare user performance against reference videos
- **Advanced Metrics**: DTW, cosine similarity, range of motion, tempo analysis, and balance metrics

### Session Summary & Creative Assets (NEW!)
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

## Architecture

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

## Setup

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

## Usage

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

## API Endpoints

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

## Development

### Project Structure
```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── exercises/      # Exercise pages
│   ├── try/           # Exercise recording
│   └── results/       # Analysis results
├── components/         # React components
├── lib/               # Utility functions
├── data/              # Static data
└── types/             # TypeScript types
```

### Key Components
- `AdvancedResultsDisplay`: Main results display with tabs
- `SessionSummaryTab`: Session summary and asset generation
- `ExerciseCard`: Exercise display component
- `Layout`: Main layout wrapper

### Asset Generation
The platform supports generating creative visual assets from workout sessions:
- **Canvas-based generation**: Uses HTML5 Canvas for image creation
- **Client-side processing**: All generation happens in the browser
- **Download support**: Direct download of generated assets
- **Native sharing**: Device-native sharing when available

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
