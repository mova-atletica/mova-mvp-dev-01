# Enhanced Exercise Analysis System

This document describes the enhanced exercise analysis system that combines fast browser-based analysis with powerful Python backend analysis for comprehensive motion insights.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Python Backend │    │   Analysis      │
│   (Next.js)     │◄──►│   (FastAPI)      │    │   Results       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Live Feedback   │    │ DTW Analysis     │    │ Advanced Charts │
│ Basic Comparison│    │ Cosine Similarity│    │ Repetition Count│
│ Real-time       │    │ Tempo Analysis   │    │ Balance Metrics │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Features

### **Live Analysis (Browser-based)**
- **Real-time feedback** during recording
- **Basic angle comparison** with reference data
- **Immediate results** for quick feedback
- **Privacy-focused** - no data leaves the browser

### **Advanced Analysis (Python Backend)**
- **DTW (Dynamic Time Warping)** for speed-invariant comparison
- **Cosine Similarity** for pattern matching
- **Repetition Detection** and consistency analysis
- **Tempo Analysis** for movement timing
- **Balance & Stability** metrics
- **Range of Motion** analysis
- **Comprehensive scoring** with multiple metrics

## 📋 Prerequisites

### Frontend (Next.js)
- Node.js 18+
- npm or yarn
- Modern browser with WebRTC support

### Backend (Python)
- Python 3.8+
- pip
- Virtual environment (recommended)

## 🛠️ Setup Instructions

### 1. Frontend Setup
```bash
# Install dependencies
npm install

# Add recharts for enhanced charts
npm install recharts

# Start development server
npm run dev
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Make startup script executable
chmod +x start_backend.sh

# Run startup script (installs dependencies and starts server)
./start_backend.sh
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:8000
```

## 🔧 How It Works

### **Live Recording Flow**
1. **User starts recording** → Browser captures video
2. **Real-time pose detection** → TensorFlow.js processes frames
3. **Live feedback** → Basic comparison with reference data
4. **Immediate results** → User sees feedback during exercise

### **Advanced Analysis Flow**
1. **Recording completes** → Video and pose data stored
2. **Backend check** → Frontend checks if Python backend is available
3. **Data preparation** → Angles and metadata formatted for backend
4. **Advanced processing** → Python backend runs comprehensive analysis
5. **Results display** → Enhanced charts and insights shown

## 📊 Analysis Components

### **DTW (Dynamic Time Warping)**
- **Purpose**: Handles different movement speeds and body types
- **How it works**: Aligns two time series by finding optimal matching path
- **Benefits**: 
  - Compares movements regardless of speed differences
  - Accounts for individual body proportions
  - More robust than frame-by-frame comparison

### **Cosine Similarity**
- **Purpose**: Pattern matching for movement sequences
- **How it works**: Compares normalized angle sequences
- **Benefits**:
  - Focuses on movement shape, not absolute values
  - Handles different body types effectively
  - Provides pattern-based scoring

### **Repetition Analysis**
- **Purpose**: Detects and analyzes exercise repetitions
- **How it works**: 
  - Finds peaks and valleys in angle data
  - Groups movements into repetitions
  - Calculates consistency metrics
- **Benefits**:
  - Counts actual repetitions performed
  - Measures consistency between reps
  - Provides tempo analysis

### **Balance & Stability**
- **Purpose**: Analyzes postural stability during exercise
- **How it works**:
  - Calculates center of mass movement
  - Measures sway variance and velocity
  - Analyzes symmetry between left/right sides
- **Benefits**:
  - Identifies balance issues
  - Measures postural control
  - Provides stability scoring

## 🎯 Usage Examples

### **Basic Analysis (Always Available)**
```typescript
// Basic comparison runs in browser
const basicComparison = calculateComparison(userAngles, referenceAngles, jointsOfInterest);
```

### **Advanced Analysis (Requires Backend)**
```typescript
// Check if backend is available
const isBackendHealthy = await advancedAnalysisService.checkBackendHealth();

if (isBackendHealthy) {
  // Run advanced analysis
  const advancedResult = await advancedAnalysisService.analyzeExercise(analysisData);
}
```

## 📈 Results Interpretation

### **Score Ranges**
- **90-100%**: Excellent form
- **80-89%**: Good form with minor adjustments needed
- **70-79%**: Fair form, some improvements recommended
- **60-69%**: Needs work, significant improvements needed
- **Below 60%**: Poor form, requires attention

### **Key Metrics**
- **DTW Score**: Movement pattern similarity (higher = better)
- **Cosine Similarity**: Shape matching (0-1, higher = better)
- **Tempo Score**: Movement timing accuracy
- **Stability Score**: Balance and postural control
- **Repetition Consistency**: Consistency between reps

## 🔍 Troubleshooting

### **Backend Not Starting**
```bash
# Check Python version
python3 --version

# Install missing dependencies
pip install -r requirements.txt

# Check if port 8000 is available
lsof -i :8000
```

### **Frontend Can't Connect to Backend**
```bash
# Check if backend is running
curl http://localhost:8000/health

# Verify environment variable
echo $NEXT_PUBLIC_PYTHON_BACKEND_URL
```

### **Analysis Not Working**
- Ensure reference data exists for the exercise
- Check browser console for errors
- Verify pose detection is working
- Check network connectivity to backend

## 🚀 Performance Considerations

### **Browser Performance**
- **Live analysis**: Optimized for real-time processing
- **Memory usage**: Efficient data structures for angle storage
- **GPU acceleration**: Uses WebGL for TensorFlow.js

### **Backend Performance**
- **Async processing**: Non-blocking analysis
- **Memory efficient**: Streaming data processing
- **Scalable**: Can handle multiple concurrent requests

## 🔮 Future Enhancements

### **Planned Features**
- **Machine Learning Models**: Custom trained models for specific exercises
- **3D Analysis**: Depth-based motion analysis
- **Gait Analysis**: Walking and running pattern analysis
- **Injury Prevention**: Risk assessment and recommendations
- **Progress Tracking**: Long-term improvement monitoring

### **Technical Improvements**
- **WebAssembly**: Faster computation in browser
- **Edge Computing**: Distributed analysis processing
- **Real-time Streaming**: Live backend analysis
- **Mobile Optimization**: Native mobile app support

## 📚 API Documentation

### **Backend Endpoints**

#### `POST /analyze`
Analyzes exercise data and returns comprehensive results.

**Request Body:**
```json
{
  "user_angles": {
    "leftKneeAngles": [120, 125, 130, ...],
    "rightKneeAngles": [118, 123, 128, ...],
    ...
  },
  "reference_angles": {
    "leftKneeAngles": [122, 127, 132, ...],
    "rightKneeAngles": [120, 125, 130, ...],
    ...
  },
  "joints_of_interest": ["leftKnee", "rightKnee", "leftHip"],
  "exercise_name": "Squat",
  "metadata": {
    "video_duration": 10.5,
    "frame_count": 315,
    "recording_timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "overall_score": 85.2,
  "grade": "B",
  "confidence": 92.1,
  "joint_analysis": {
    "leftKnee": {
      "dtw_score": 88.5,
      "cosine_similarity": 0.92,
      "cosine_score": 92.0,
      "rom_score": 87.3,
      "user_rom": 65.2,
      "ref_rom": 70.1
    }
  },
  "tempo_analysis": {
    "leftKnee": {
      "tempo_score": 82.1,
      "velocity_ratio": 0.95,
      "user_avg_velocity": 12.3,
      "ref_avg_velocity": 12.9
    }
  },
  "balance_metrics": {
    "stability_score": 78.5,
    "symmetry_score": 85.2,
    "sway_metrics": {
      "variance": 2.1,
      "velocity": 0.8,
      "mean_angle": 45.2,
      "std_angle": 1.5
    }
  },
  "repetition_analysis": {
    "leftKnee": {
      "rep_count": 8,
      "reps": [...],
      "consistency": 85.7,
      "avg_duration": 1.2,
      "avg_rom": 65.2
    }
  },
  "improvement_suggestions": [
    "Improve left knee movement pattern",
    "Maintain more consistent movement speed",
    "Increase range of motion"
  ],
  "detailed_charts": {
    "angle_comparison": "base64_encoded_chart",
    "dtw_path": "base64_encoded_chart",
    "repetition_analysis": "base64_encoded_chart",
    "tempo_analysis": "base64_encoded_chart"
  }
}
```

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation
- Contact the development team 