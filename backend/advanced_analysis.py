from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import numpy as np
import pandas as pd
from scipy import signal
from scipy.spatial.distance import cosine
from dtaidistance import dtw
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import json
import io
import base64
from datetime import datetime

app = FastAPI(title="Advanced Exercise Analysis API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class AnalysisRequest(BaseModel):
    user_angles: Dict[str, List[float]]
    reference_angles: Dict[str, List[float]]
    joints_of_interest: List[str]
    exercise_name: str
    exercise_type: Optional[str] = "repetition"
    exercise_data: Optional[Dict[str, Any]] = None
    pose_analysis: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class AdvancedAnalysisResult(BaseModel):
    overall_score: float
    grade: str
    confidence: float
    joint_analysis: Dict[str, Dict[str, Any]]
    tempo_analysis: Dict[str, Any]
    balance_metrics: Dict[str, Any]
    repetition_analysis: Dict[str, Any]
    pose_analysis: Optional[Dict[str, Any]] = None
    flow_analysis: Optional[Dict[str, Any]] = None
    improvement_suggestions: List[str]
    detailed_charts: Dict[str, str]  # Base64 encoded charts

class AdvancedAnalysisService:
    def __init__(self):
        self.scaler = StandardScaler()
    
    def analyze_exercise(self, request: AnalysisRequest) -> AdvancedAnalysisResult:
        """Main analysis function that orchestrates all analysis components"""
        
        # Check exercise type and route to appropriate analysis
        if request.exercise_type == "pose":
            return self._analyze_pose_exercise(request)
        elif request.exercise_type == "flow":
            return self._analyze_flow_exercise(request)
        else:
            return self._analyze_repetition_exercise(request)
    
    def _analyze_pose_exercise(self, request: AnalysisRequest) -> AdvancedAnalysisResult:
        """Pose-specific analysis using target poses and angle ranges"""
        
        print(f"🔍 Backend: Analyzing pose exercise with data:")
        print(f"  - User angles keys: {list(request.user_angles.keys()) if request.user_angles else 'None'}")
        print(f"  - Pose analysis keys: {list(request.pose_analysis.keys()) if request.pose_analysis else 'None'}")
        print(f"  - Target poses: {request.pose_analysis.get('targetPoses', {}) if request.pose_analysis else 'None'}")
        print(f"  - Angle ranges: {request.pose_analysis.get('angleRanges', {}) if request.pose_analysis else 'None'}")
        print(f"  - Joints of interest: {request.joints_of_interest}")
        
        # 1. Pose accuracy analysis
        pose_accuracy = self._pose_accuracy_analysis(
            request.user_angles, 
            request.pose_analysis.get("targetPoses", {}),
            request.pose_analysis.get("angleRanges", {}),
            request.joints_of_interest
        )
        
        # 2. Hold duration analysis
        hold_analysis = self._hold_duration_analysis(
            request.user_angles, 
            request.pose_analysis.get("targetPoses", []),
            request.pose_analysis.get("angleRanges", {}),
            request.joints_of_interest
        )
        
        # 3. Balance and stability analysis (reuse existing)
        balance_metrics = self._balance_analysis(request.user_angles, request.joints_of_interest)
        
        # 4. Calculate overall pose score
        overall_score, grade, confidence = self._calculate_pose_score(pose_accuracy, hold_analysis, balance_metrics)
        
        # 5. Generate pose-specific suggestions
        suggestions = self._generate_pose_suggestions(pose_accuracy, hold_analysis, balance_metrics)
        
        # 6. Create pose-specific charts
        charts = self._create_pose_charts(request.user_angles, pose_accuracy, hold_analysis)
        
        return AdvancedAnalysisResult(
            overall_score=overall_score,
            grade=grade,
            confidence=confidence,
            joint_analysis=self._combine_pose_joint_analysis(pose_accuracy),
            tempo_analysis={},  # Not applicable for poses
            balance_metrics=balance_metrics,
            repetition_analysis={},  # Not applicable for poses
            pose_analysis={
                "overall_accuracy": pose_accuracy.get("overall_accuracy", 0),
                "joint_accuracy": pose_accuracy.get("joint_accuracy", {}),
                "hold_periods": hold_analysis.get("hold_periods", []),
                "pose_quality": {
                    "balance_score": balance_metrics.get("stability_score", 0),
                    "symmetry_score": balance_metrics.get("symmetry_score", 0),
                    "stability_score": balance_metrics.get("stability_score", 0)
                }
            },
            improvement_suggestions=suggestions,
            detailed_charts=charts
        )
    
    def _analyze_flow_exercise(self, request: AnalysisRequest) -> AdvancedAnalysisResult:
        """Flow-specific analysis using DTW and cosine similarity"""
        
        print(f"🌊 Backend: Analyzing flow exercise with data:")
        print(f"  - User angles keys: {list(request.user_angles.keys()) if request.user_angles else 'None'}")
        print(f"  - Reference angles keys: {list(request.reference_angles.keys()) if request.reference_angles else 'None'}")
        print(f"  - Joints of interest: {request.joints_of_interest}")
        
        # 1. DTW analysis (already implemented)
        dtw_analysis = self._dtw_analysis(
            request.user_angles, 
            request.reference_angles, 
            request.joints_of_interest
        )
        
        # 2. Cosine similarity analysis (already implemented)
        cosine_analysis = self._cosine_similarity_analysis(
            request.user_angles, 
            request.reference_angles, 
            request.joints_of_interest
        )
        
        # 3. Movement quality analysis (removed for flow exercises)
        movement_quality = {}
        
        # 4. Balance and stability analysis (not needed for flow exercises)
        balance_metrics = {"stability_score": 0, "symmetry_score": 0, "balance_score": 0}
        
        # 5. Calculate overall flow score
        overall_score, grade, confidence = self._calculate_flow_score(
            dtw_analysis, cosine_analysis, balance_metrics
        )
        
        # 6. Generate flow-specific suggestions
        suggestions = self._generate_flow_suggestions(
            dtw_analysis, cosine_analysis, balance_metrics
        )
        
        # 7. Create flow-specific charts
        charts = self._create_flow_charts(
            request.user_angles, request.reference_angles, dtw_analysis, cosine_analysis
        )
        
        return AdvancedAnalysisResult(
            overall_score=overall_score,
            grade=grade,
            confidence=confidence,
            joint_analysis=self._combine_flow_joint_analysis(dtw_analysis, cosine_analysis),
            tempo_analysis={},  # Not applicable for flow
            balance_metrics=balance_metrics,
            repetition_analysis={},  # Not applicable for flow
            pose_analysis={},  # Not applicable for flow
            flow_analysis={  # NEW: Flow-specific analysis
                "dtw_scores": dtw_analysis,
                "cosine_scores": cosine_analysis,
                "overall_flow_score": overall_score,
                "flow_quality": {
                    "balance_score": balance_metrics.get("stability_score", 0),
                    "symmetry_score": balance_metrics.get("symmetry_score", 0),
                    "stability_score": balance_metrics.get("stability_score", 0)
                }
            },
            improvement_suggestions=suggestions,
            detailed_charts=charts
        )
    
    def _analyze_repetition_exercise(self, request: AnalysisRequest) -> AdvancedAnalysisResult:
        """Repetition-specific analysis using reference video comparison"""
        
        # 1. DTW-based comparison
        dtw_results = self._dtw_analysis(request.user_angles, request.reference_angles, request.joints_of_interest)
        
        # 2. Cosine similarity analysis
        cosine_results = self._cosine_similarity_analysis(request.user_angles, request.reference_angles, request.joints_of_interest)
        
        # 3. Repetition detection and analysis
        rep_analysis = self._repetition_analysis(request.user_angles, request.joints_of_interest)
        
        # 4. Tempo analysis
        tempo_analysis = self._tempo_analysis(request.user_angles, request.reference_angles, request.joints_of_interest)
        
        # 5. Balance and stability analysis
        balance_metrics = self._balance_analysis(request.user_angles, request.joints_of_interest)
        
        # 6. Range of motion analysis
        rom_analysis = self._range_of_motion_analysis(request.user_angles, request.reference_angles, request.joints_of_interest)
        
        # 7. Combine all metrics for final score
        overall_score, grade, confidence = self._calculate_overall_score(
            dtw_results, cosine_results, rep_analysis, tempo_analysis, balance_metrics, rom_analysis
        )
        
        # 8. Generate improvement suggestions
        suggestions = self._generate_suggestions(
            dtw_results, cosine_results, rep_analysis, tempo_analysis, balance_metrics, rom_analysis
        )
        
        # 9. Create detailed charts
        charts = self._create_analysis_charts(
            request.user_angles, request.reference_angles, dtw_results, rep_analysis, tempo_analysis
        )
        
        return AdvancedAnalysisResult(
            overall_score=overall_score,
            grade=grade,
            confidence=confidence,
            joint_analysis=self._combine_joint_analysis(dtw_results, cosine_results, rom_analysis),
            tempo_analysis=tempo_analysis,
            balance_metrics=balance_metrics,
            repetition_analysis=rep_analysis,
            improvement_suggestions=suggestions,
            detailed_charts=charts
        )
    
    def _dtw_analysis(self, user_angles: Dict[str, List[float]], 
                     reference_angles: Dict[str, List[float]], 
                     joints_of_interest: List[str]) -> Dict[str, Any]:
        """DTW-based analysis for handling different speeds and body types"""
        
        results = {}
        
        for joint in joints_of_interest:
            user_seq = user_angles.get(f"{joint}Angles", [])
            ref_seq = reference_angles.get(f"{joint}Angles", [])
            
            if not user_seq or not ref_seq:
                results[joint] = {"score": 0, "distance": float('inf'), "path": []}
                continue
            
            # Convert to numpy arrays and handle NaN values
            user_array = np.array(user_seq)
            ref_array = np.array(ref_seq)
            
            # Remove NaN values
            user_clean = user_array[~np.isnan(user_array)]
            ref_clean = ref_array[~np.isnan(ref_array)]
            
            if len(user_clean) < 5 or len(ref_clean) < 5:
                results[joint] = {"score": 0, "distance": float('inf'), "path": []}
                continue
            
            # Calculate DTW distance
            try:
                distance = dtw.distance(user_clean, ref_clean)
                
                # Normalize distance by sequence length
                normalized_distance = distance / max(len(user_clean), len(ref_clean))
                
                # Convert to score (lower distance = higher score)
                score = max(0, 100 - (normalized_distance * 50))
                
                results[joint] = {
                    "score": score,
                    "distance": distance,
                    "normalized_distance": normalized_distance,
                    "user_length": len(user_clean),
                    "ref_length": len(ref_clean)
                }
                
            except Exception as e:
                results[joint] = {"score": 0, "distance": float('inf'), "error": str(e)}
        
        return results
    
    def _cosine_similarity_analysis(self, user_angles: Dict[str, List[float]], 
                                  reference_angles: Dict[str, List[float]], 
                                  joints_of_interest: List[str]) -> Dict[str, Any]:
        """Cosine similarity analysis for pattern matching"""
        
        results = {}
        
        for joint in joints_of_interest:
            user_seq = user_angles.get(f"{joint}Angles", [])
            ref_seq = reference_angles.get(f"{joint}Angles", [])
            
            if not user_seq or not ref_seq:
                results[joint] = {"similarity": 0, "score": 0}
                continue
            
            # Convert to numpy arrays and handle NaN values
            user_array = np.array(user_seq)
            ref_array = np.array(ref_seq)
            
            # Remove NaN values
            user_clean = user_array[~np.isnan(user_array)]
            ref_clean = ref_array[~np.isnan(ref_array)]
            
            if len(user_clean) < 5 or len(ref_clean) < 5:
                results[joint] = {"similarity": 0, "score": 0}
                continue
            
            # Normalize sequences
            user_norm = (user_clean - np.mean(user_clean)) / (np.std(user_clean) + 1e-8)
            ref_norm = (ref_clean - np.mean(ref_clean)) / (np.std(ref_clean) + 1e-8)
            
            # Pad shorter sequence to match longer one
            max_len = max(len(user_norm), len(ref_norm))
            user_padded = np.pad(user_norm, (0, max_len - len(user_norm)), mode='edge')
            ref_padded = np.pad(ref_norm, (0, max_len - len(ref_norm)), mode='edge')
            
            # Calculate cosine similarity
            similarity = 1 - cosine(user_padded, ref_padded)
            score = max(0, similarity * 100)
            
            results[joint] = {
                "similarity": similarity,
                "score": score,
                "user_mean": float(np.mean(user_clean)),
                "ref_mean": float(np.mean(ref_clean)),
                "user_std": float(np.std(user_clean)),
                "ref_std": float(np.std(ref_clean))
            }
        
        return results
    
    def _repetition_analysis(self, user_angles: Dict[str, List[float]], 
                           joints_of_interest: List[str]) -> Dict[str, Any]:
        """Detect and analyze repetitions"""
        
        results = {}
        
        for joint in joints_of_interest:
            angles = user_angles.get(f"{joint}Angles", [])
            if not angles:
                results[joint] = {"rep_count": 0, "reps": [], "consistency": 0}
                continue
            
            # Convert to numpy array
            angle_array = np.array(angles)
            angle_clean = angle_array[~np.isnan(angle_array)]
            
            if len(angle_clean) < 10:
                results[joint] = {"rep_count": 0, "reps": [], "consistency": 0}
                continue
            
            # Find peaks and valleys
            peaks, _ = signal.find_peaks(angle_clean, height=np.mean(angle_clean), distance=5)
            valleys, _ = signal.find_peaks(-angle_clean, height=-np.mean(angle_clean), distance=5)
            
            # Combine and sort extrema
            extrema = np.sort(np.concatenate([peaks, valleys]))
            
            # Group into repetitions
            reps = []
            for i in range(len(extrema) - 1):
                start_idx = extrema[i]
                end_idx = extrema[i + 1]
                
                if end_idx - start_idx < 5:  # Skip very short movements
                    continue
                
                rep_angles = angle_clean[start_idx:end_idx]
                rom = np.max(rep_angles) - np.min(rep_angles)
                
                if rom < 20:  # Skip movements with insufficient ROM
                    continue
                
                reps.append({
                    "start_frame": int(start_idx),
                    "end_frame": int(end_idx),
                    "duration": float(end_idx - start_idx) / 30,  # Assuming 30fps
                    "rom": float(rom),
                    "mean_angle": float(np.mean(rep_angles)),
                    "std_angle": float(np.std(rep_angles))
                })
            
            # Calculate consistency
            if len(reps) > 1:
                durations = [rep["duration"] for rep in reps]
                roms = [rep["rom"] for rep in reps]
                
                duration_cv = np.std(durations) / np.mean(durations) if np.mean(durations) > 0 else 0
                rom_cv = np.std(roms) / np.mean(roms) if np.mean(roms) > 0 else 0
                
                consistency = max(0, 100 - (duration_cv + rom_cv) * 50)
            else:
                consistency = 0
            
            results[joint] = {
                "rep_count": len(reps),
                "reps": reps,
                "consistency": consistency,
                "avg_duration": float(np.mean([rep["duration"] for rep in reps])) if reps else 0,
                "avg_rom": float(np.mean([rep["rom"] for rep in reps])) if reps else 0
            }
        
        return results
    
    def _tempo_analysis(self, user_angles: Dict[str, List[float]], 
                       reference_angles: Dict[str, List[float]], 
                       joints_of_interest: List[str]) -> Dict[str, Any]:
        """Analyze movement tempo and timing"""
        
        results = {}
        
        for joint in joints_of_interest:
            user_seq = user_angles.get(f"{joint}Angles", [])
            ref_seq = reference_angles.get(f"{joint}Angles", [])
            
            if not user_seq or not ref_seq:
                results[joint] = {"tempo_score": 0, "velocity_ratio": 0}
                continue
            
            # Calculate velocity (rate of change)
            user_velocities = np.diff(user_seq)
            ref_velocities = np.diff(ref_seq)
            
            # Remove NaN values
            user_vel_clean = user_velocities[~np.isnan(user_velocities)]
            ref_vel_clean = ref_velocities[~np.isnan(ref_velocities)]
            
            if len(user_vel_clean) < 5 or len(ref_vel_clean) < 5:
                results[joint] = {"tempo_score": 0, "velocity_ratio": 0}
                continue
            
            # Calculate average velocities
            user_avg_vel = np.mean(np.abs(user_vel_clean))
            ref_avg_vel = np.mean(np.abs(ref_vel_clean))
            
            # Calculate velocity ratio
            velocity_ratio = user_avg_vel / ref_avg_vel if ref_avg_vel > 0 else 0
            
            # Score based on how close the ratio is to 1
            tempo_score = max(0, 100 - abs(velocity_ratio - 1) * 50)
            
            results[joint] = {
                "tempo_score": tempo_score,
                "velocity_ratio": velocity_ratio,
                "user_avg_velocity": float(user_avg_vel),
                "ref_avg_velocity": float(ref_avg_vel)
            }
        
        return results
    
    def _balance_analysis(self, user_angles: Dict[str, List[float]], 
                         joints_of_interest: List[str]) -> Dict[str, Any]:
        """Analyze balance and stability"""
        
        # Focus on trunk and hip angles for balance
        trunk_angles = user_angles.get("trunkAngles", [])
        left_hip_angles = user_angles.get("leftHipAngles", [])
        right_hip_angles = user_angles.get("rightHipAngles", [])
        
        if not trunk_angles:
            return {"stability_score": 0, "sway_metrics": {}}
        
        # Convert to numpy array
        trunk_array = np.array(trunk_angles)
        trunk_clean = trunk_array[~np.isnan(trunk_array)]
        
        if len(trunk_clean) < 10:
            return {"stability_score": 0, "sway_metrics": {}}
        
        # Calculate sway metrics
        sway_variance = np.var(trunk_clean)
        sway_velocity = np.mean(np.abs(np.diff(trunk_clean)))
        
        # Calculate stability score (lower sway = higher stability)
        stability_score = max(0, 100 - (sway_variance * 0.1) - (sway_velocity * 0.5))
        
        # Calculate symmetry if both hip angles are available
        symmetry_score = 0
        if left_hip_angles and right_hip_angles:
            left_array = np.array(left_hip_angles)
            right_array = np.array(right_hip_angles)
            
            left_clean = left_array[~np.isnan(left_array)]
            right_clean = right_array[~np.isnan(right_array)]
            
            if len(left_clean) > 5 and len(right_clean) > 5:
                # Pad to same length
                min_len = min(len(left_clean), len(right_clean))
                left_padded = left_clean[:min_len]
                right_padded = right_clean[:min_len]
                
                # Calculate symmetry
                symmetry_diff = np.mean(np.abs(left_padded - right_padded))
                symmetry_score = max(0, 100 - symmetry_diff)
        
        return {
            "stability_score": stability_score,
            "symmetry_score": symmetry_score,
            "sway_metrics": {
                "variance": float(sway_variance),
                "velocity": float(sway_velocity),
                "mean_angle": float(np.mean(trunk_clean)),
                "std_angle": float(np.std(trunk_clean))
            }
        }
    
    def _range_of_motion_analysis(self, user_angles: Dict[str, List[float]], 
                                 reference_angles: Dict[str, List[float]], 
                                 joints_of_interest: List[str]) -> Dict[str, Any]:
        """Analyze range of motion"""
        
        results = {}
        
        for joint in joints_of_interest:
            user_seq = user_angles.get(f"{joint}Angles", [])
            ref_seq = reference_angles.get(f"{joint}Angles", [])
            
            if not user_seq or not ref_seq:
                results[joint] = {"rom_score": 0, "user_rom": 0, "ref_rom": 0}
                continue
            
            # Calculate ROM
            user_array = np.array(user_seq)
            ref_array = np.array(ref_seq)
            
            user_clean = user_array[~np.isnan(user_array)]
            ref_clean = ref_array[~np.isnan(ref_array)]
            
            if len(user_clean) < 5 or len(ref_clean) < 5:
                results[joint] = {"rom_score": 0, "user_rom": 0, "ref_rom": 0}
                continue
            
            user_rom = np.max(user_clean) - np.min(user_clean)
            ref_rom = np.max(ref_clean) - np.min(ref_clean)
            
            # Score based on ROM ratio
            rom_ratio = user_rom / ref_rom if ref_rom > 0 else 0
            rom_score = max(0, min(100, rom_ratio * 100))
            
            results[joint] = {
                "rom_score": rom_score,
                "user_rom": float(user_rom),
                "ref_rom": float(ref_rom),
                "rom_ratio": rom_ratio
            }
        
        return results
    
    def _calculate_overall_score(self, dtw_results: Dict, cosine_results: Dict, 
                               rep_analysis: Dict, tempo_analysis: Dict, 
                               balance_metrics: Dict, rom_analysis: Dict) -> tuple:
        """Calculate overall score from all analysis components"""
        
        # Weight the different components
        weights = {
            "dtw": 0.3,
            "cosine": 0.2,
            "repetition": 0.2,
            "tempo": 0.15,
            "balance": 0.1,
            "rom": 0.05
        }
        
        # Calculate component scores
        dtw_score = np.mean([result["score"] for result in dtw_results.values() if "score" in result])
        cosine_score = np.mean([result["score"] for result in cosine_results.values() if "score" in result])
        rep_score = np.mean([result["consistency"] for result in rep_analysis.values() if "consistency" in result])
        tempo_score = np.mean([result["tempo_score"] for result in tempo_analysis.values() if "tempo_score" in result])
        balance_score = balance_metrics.get("stability_score", 0)
        rom_score = np.mean([result["rom_score"] for result in rom_analysis.values() if "rom_score" in result])
        
        # Calculate weighted overall score
        overall_score = (
            dtw_score * weights["dtw"] +
            cosine_score * weights["cosine"] +
            rep_score * weights["repetition"] +
            tempo_score * weights["tempo"] +
            balance_score * weights["balance"] +
            rom_score * weights["rom"]
        )
        
        # Calculate confidence based on data quality
        confidence = min(100, overall_score * 0.8 + 20)  # Base confidence of 20%
        
        # Determine grade
        if overall_score >= 90:
            grade = "A"
        elif overall_score >= 80:
            grade = "B"
        elif overall_score >= 70:
            grade = "C"
        elif overall_score >= 60:
            grade = "D"
        else:
            grade = "F"
        
        return overall_score, grade, confidence
    
    def _combine_joint_analysis(self, dtw_results: Dict, cosine_results: Dict, 
                               rom_analysis: Dict) -> Dict[str, Dict[str, Any]]:
        """Combine all joint-specific analysis results"""
        
        combined = {}
        
        for joint in set(dtw_results.keys()) | set(cosine_results.keys()) | set(rom_analysis.keys()):
            combined[joint] = {
                "dtw_score": dtw_results.get(joint, {}).get("score", 0),
                "cosine_similarity": cosine_results.get(joint, {}).get("similarity", 0),
                "cosine_score": cosine_results.get(joint, {}).get("score", 0),
                "rom_score": rom_analysis.get(joint, {}).get("rom_score", 0),
                "user_rom": rom_analysis.get(joint, {}).get("user_rom", 0),
                "ref_rom": rom_analysis.get(joint, {}).get("ref_rom", 0)
            }
        
        return combined
    
    def _generate_suggestions(self, dtw_results: Dict, cosine_results: Dict, 
                            rep_analysis: Dict, tempo_analysis: Dict, 
                            balance_metrics: Dict, rom_analysis: Dict) -> List[str]:
        """Generate improvement suggestions based on analysis results"""
        
        suggestions = []
        
        # DTW-based suggestions
        for joint, result in dtw_results.items():
            if result.get("score", 0) < 70:
                suggestions.append(f"Improve {joint.replace('Angles', '')} movement pattern")
        
        # Repetition-based suggestions
        for joint, result in rep_analysis.items():
            if result.get("consistency", 0) < 70:
                suggestions.append(f"Maintain more consistent {joint.replace('Angles', '')} movement")
        
        # Tempo-based suggestions
        for joint, result in tempo_analysis.items():
            if result.get("tempo_score", 0) < 70:
                suggestions.append(f"Adjust {joint.replace('Angles', '')} movement speed")
        
        # Balance suggestions
        if balance_metrics.get("stability_score", 0) < 70:
            suggestions.append("Improve balance and stability during exercise")
        
        # ROM suggestions
        for joint, result in rom_analysis.items():
            if result.get("rom_score", 0) < 70:
                suggestions.append(f"Increase {joint.replace('Angles', '')} range of motion")
        
        return suggestions[:5]  # Limit to top 5 suggestions
    
    def _create_analysis_charts(self, user_angles: Dict[str, List[float]], 
                              reference_angles: Dict[str, List[float]], 
                              dtw_results: Dict, rep_analysis: Dict, 
                              tempo_analysis: Dict) -> Dict[str, str]:
        """Create detailed analysis charts (placeholder for now)"""
        
        # This would create matplotlib charts and convert to base64
        # For now, return placeholder
        return {
            "angle_comparison": "base64_placeholder",
            "dtw_path": "base64_placeholder",
            "repetition_analysis": "base64_placeholder",
            "tempo_analysis": "base64_placeholder"
        }
    
    def _pose_accuracy_analysis(self, user_angles: Dict[str, List[float]], 
                               target_poses: List[Dict[str, Any]], 
                               angle_ranges: Dict[str, Dict[str, float]], 
                               joints_of_interest: List[str]) -> Dict[str, Any]:
        """Analyze pose accuracy against target poses and angle ranges"""
        
        if not target_poses or len(target_poses) == 0:
            return {"overall_accuracy": 0, "joint_accuracy": {}}
        
        # Extract target angles from the first pose
        first_pose = target_poses[0]
        target_angles = first_pose.get("targetAngles", {})
        
        joint_accuracy = {}
        total_accuracy = 0
        valid_joints = 0
        
        for joint in joints_of_interest:
            joint_key = joint.replace("Angles", "")
            user_seq = user_angles.get(f"{joint}Angles", [])
            
            if not user_seq or joint_key not in target_angles:
                joint_accuracy[joint_key] = {
                    "accuracy_score": 0,
                    "target_angle": 0,
                    "user_avg_angle": 0,
                    "angle_deviation": 0,
                    "in_range_percentage": 0,
                    "hold_duration": 0,
                    "stability_score": 0
                }
                continue
            
            target_angle = target_angles.get(joint_key, 0)
            angle_range = angle_ranges.get(joint_key, {"min": target_angle - 10, "max": target_angle + 10})
            
            # Calculate accuracy for each frame
            accuracies = []
            in_range_frames = 0
            
            for angle in user_seq:
                if angle is not None and not np.isnan(angle):
                    deviation = abs(angle - target_angle)
                    
                    # Check if angle is within range
                    if angle_range["min"] <= angle <= angle_range["max"]:
                        in_range_frames += 1
                        accuracy = 100  # Perfect score if within range
                    else:
                        # Calculate penalty based on distance from range
                        distance_from_range = min(
                            abs(angle - angle_range["min"]),
                            abs(angle - angle_range["max"])
                        )
                        max_penalty = 20  # Maximum penalty distance
                        accuracy = max(0, 100 - (distance_from_range / max_penalty) * 100)
                    
                    accuracies.append(accuracy)
            
            if accuracies:
                avg_accuracy = np.mean(accuracies)
                in_range_percentage = (in_range_frames / len(accuracies)) * 100
                user_avg_angle = np.mean([a for a in user_seq if a is not None and not np.isnan(a)])
                angle_deviation = abs(user_avg_angle - target_angle)
                
                joint_accuracy[joint_key] = {
                    "accuracy_score": avg_accuracy,
                    "target_angle": target_angle,
                    "user_avg_angle": user_avg_angle,
                    "angle_deviation": angle_deviation,
                    "in_range_percentage": in_range_percentage,
                    "hold_duration": 0,  # Will be calculated in balance analysis
                    "stability_score": 0  # Will be calculated in balance analysis
                }
                
                total_accuracy += avg_accuracy
                valid_joints += 1
        
        overall_accuracy = total_accuracy / valid_joints if valid_joints > 0 else 0
        
        return {
            "overall_accuracy": overall_accuracy,
            "joint_accuracy": joint_accuracy
        }
    
    def _hold_duration_analysis(self, user_angles: Dict[str, List[float]], 
                               target_poses: List[Dict[str, Any]], 
                               angle_ranges: Dict[str, Dict[str, float]], 
                               joints_of_interest: List[str]) -> Dict[str, Any]:
        """Analyze hold duration periods for pose exercises"""
        
        if not target_poses or len(target_poses) == 0:
            return {"hold_periods": []}
        
        # Extract target angles from the first pose
        first_pose = target_poses[0]
        target_angles = first_pose.get("targetAngles", {})
        hold_periods = []
        
        for joint in joints_of_interest:
            joint_key = joint.replace("Angles", "")
            user_seq = user_angles.get(f"{joint}Angles", [])
            
            if not user_seq or joint_key not in target_angles:
                continue
            
            target_angle = target_angles.get(joint_key, 0)
            angle_range = angle_ranges.get(joint_key, {"min": target_angle - 10, "max": target_angle + 10})
            
            # Find hold periods
            hold_start = None
            hold_end = None
            
            for i, angle in enumerate(user_seq):
                if angle is not None and not np.isnan(angle):
                    in_pose = angle_range["min"] <= angle <= angle_range["max"]
                    
                    if in_pose and hold_start is None:
                        hold_start = i
                    elif not in_pose and hold_start is not None:
                        hold_end = i - 1
                        if hold_end > hold_start:
                            duration = (hold_end - hold_start + 1) / 30  # Assuming 30fps
                            hold_periods.append({
                                "joint": joint_key,
                                "start_frame": hold_start,
                                "end_frame": hold_end,
                                "duration": duration,
                                "accuracy": 85  # Placeholder
                            })
                        hold_start = None
            
            # Handle hold that extends to end of data
            if hold_start is not None:
                hold_end = len(user_seq) - 1
                if hold_end > hold_start:
                    duration = (hold_end - hold_start + 1) / 30
                    hold_periods.append({
                        "joint": joint_key,
                        "start_frame": hold_start,
                        "end_frame": hold_end,
                        "duration": duration,
                        "accuracy": 85  # Placeholder
                    })
        
        return {"hold_periods": hold_periods}
    
    def _calculate_pose_score(self, pose_accuracy: Dict[str, Any], 
                            hold_analysis: Dict[str, Any], 
                            balance_metrics: Dict[str, Any]) -> tuple:
        """Calculate overall pose score"""
        
        accuracy_score = pose_accuracy.get("overall_accuracy", 0)
        
        # Calculate hold score based on total hold duration
        hold_periods = hold_analysis.get("hold_periods", [])
        total_hold_duration = sum(period["duration"] for period in hold_periods)
        hold_score = min(100, total_hold_duration * 10)  # 10 seconds = 100% score
        
        # Balance score
        balance_score = balance_metrics.get("stability_score", 0)
        
        # Weighted combination
        overall_score = (
            accuracy_score * 0.6 +  # 60% weight for accuracy
            hold_score * 0.3 +      # 30% weight for hold duration
            balance_score * 0.1     # 10% weight for balance
        )
        
        # Calculate confidence
        confidence = min(100, overall_score * 0.8 + 20)
        
        # Determine grade
        if overall_score >= 90:
            grade = "A"
        elif overall_score >= 80:
            grade = "B"
        elif overall_score >= 70:
            grade = "C"
        elif overall_score >= 60:
            grade = "D"
        else:
            grade = "F"
        
        return overall_score, grade, confidence
    
    def _generate_pose_suggestions(self, pose_accuracy: Dict[str, Any], 
                                 hold_analysis: Dict[str, Any], 
                                 balance_metrics: Dict[str, Any]) -> List[str]:
        """Generate pose-specific improvement suggestions"""
        
        suggestions = []
        
        # Accuracy-based suggestions
        overall_accuracy = pose_accuracy.get("overall_accuracy", 0)
        if overall_accuracy < 70:
            suggestions.append("Focus on maintaining target pose angles more precisely")
        
        joint_accuracy = pose_accuracy.get("joint_accuracy", {})
        for joint, accuracy in joint_accuracy.items():
            if accuracy.get("accuracy_score", 0) < 70:
                joint_name = joint.replace("Angles", "").replace("_", " ").title()
                suggestions.append(f"Improve {joint_name} angle accuracy")
        
        # Hold duration suggestions
        hold_periods = hold_analysis.get("hold_periods", [])
        if not hold_periods:
            suggestions.append("Try to hold the pose for longer periods")
        elif len(hold_periods) < 2:
            suggestions.append("Maintain pose holds more consistently")
        
        # Balance suggestions
        if balance_metrics.get("stability_score", 0) < 70:
            suggestions.append("Improve balance and stability during pose holds")
        
        return suggestions[:5]  # Limit to top 5 suggestions
    
    def _create_pose_charts(self, user_angles: Dict[str, List[float]], 
                          pose_accuracy: Dict[str, Any], 
                          hold_analysis: Dict[str, Any]) -> Dict[str, str]:
        """Create pose-specific analysis charts"""
        
        # Placeholder for pose charts
        return {
            "pose_accuracy": "base64_placeholder",
            "hold_duration": "base64_placeholder",
            "angle_deviation": "base64_placeholder"
        }
    
    def _combine_pose_joint_analysis(self, pose_accuracy: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Combine pose joint analysis results"""
        
        joint_accuracy = pose_accuracy.get("joint_accuracy", {})
        combined = {}
        
        for joint, accuracy in joint_accuracy.items():
            combined[joint] = {
                "pose_accuracy": accuracy.get("accuracy_score", 0),
                "angle_compliance": accuracy.get("in_range_percentage", 0),
                "hold_stability": accuracy.get("stability_score", 0)
            }
        
        return combined
    
    def _movement_quality_analysis(self, user_angles: Dict[str, List[float]], 
                                 joints_of_interest: List[str]) -> Dict[str, Any]:
        """Analyze movement quality for flow exercises"""
        
        results = {}
        
        for joint in joints_of_interest:
            angles = user_angles.get(f"{joint}Angles", [])
            
            if not angles or len(angles) < 10:
                results[joint] = {"score": 0, "smoothness": 0, "consistency": 0}
                continue
            
            # Convert to numpy array and remove NaN values
            angle_array = np.array(angles)
            clean_angles = angle_array[~np.isnan(angle_array)]
            
            if len(clean_angles) < 10:
                results[joint] = {"score": 0, "smoothness": 0, "consistency": 0}
                continue
            
            # Calculate movement smoothness (lower variance = smoother)
            variance = np.var(clean_angles)
            smoothness = max(0, 100 - (variance * 2))
            
            # Calculate movement consistency (how similar consecutive movements are)
            if len(clean_angles) > 1:
                differences = np.diff(clean_angles)
                consistency = max(0, 100 - (np.std(differences) * 5))
            else:
                consistency = 100
            
            # Overall movement quality score
            quality_score = (smoothness + consistency) / 2
            
            results[joint] = {
                "score": quality_score,
                "smoothness": smoothness,
                "consistency": consistency,
                "variance": variance,
                "mean_angle": float(np.mean(clean_angles)),
                "std_angle": float(np.std(clean_angles))
            }
        
        return results
    
    def _calculate_flow_score(self, dtw_analysis: Dict[str, Any], 
                            cosine_analysis: Dict[str, Any], 
                            balance_metrics: Dict[str, Any]) -> tuple:
        """Calculate overall flow score"""
        
        # Extract scores from each analysis
        dtw_scores = [result["score"] for result in dtw_analysis.values() if "score" in result]
        cosine_scores = [result["score"] for result in cosine_analysis.values() if "score" in result]
        
        # Calculate averages
        avg_dtw = np.mean(dtw_scores) if dtw_scores else 0
        avg_cosine = np.mean(cosine_scores) if cosine_scores else 0
        
        # Balance score
        balance_score = balance_metrics.get("stability_score", 0)
        
        # Weighted combination for flow exercises (no balance)
        overall_score = (
            avg_dtw * 0.6 +        # 60% weight for DTW (sequence alignment)
            avg_cosine * 0.4       # 40% weight for cosine similarity (pattern matching)
        )
        
        # Calculate confidence
        confidence = min(100, overall_score * 0.8 + 20)
        
        # Determine grade
        if overall_score >= 90:
            grade = "A"
        elif overall_score >= 80:
            grade = "B"
        elif overall_score >= 70:
            grade = "C"
        elif overall_score >= 60:
            grade = "D"
        else:
            grade = "F"
        
        return overall_score, grade, confidence
    
    def _generate_flow_suggestions(self, dtw_analysis: Dict[str, Any], 
                                 cosine_analysis: Dict[str, Any], 
                                 balance_metrics: Dict[str, Any]) -> List[str]:
        """Generate flow-specific improvement suggestions"""
        
        suggestions = []
        
        # DTW-based suggestions (sequence alignment)
        dtw_scores = [result["score"] for result in dtw_analysis.values() if "score" in result]
        avg_dtw = np.mean(dtw_scores) if dtw_scores else 0
        
        if avg_dtw < 70:
            suggestions.append("Work on matching the reference movement sequence more closely")
        
        # Cosine similarity suggestions (pattern matching)
        cosine_scores = [result["score"] for result in cosine_analysis.values() if "score" in result]
        avg_cosine = np.mean(cosine_scores) if cosine_scores else 0
        
        if avg_cosine < 70:
            suggestions.append("Focus on maintaining similar movement patterns to the reference")
        
        # No movement quality suggestions for flow exercises
        
        # No balance suggestions for flow exercises
        
        return suggestions[:5]  # Limit to top 5 suggestions
    
    def _create_flow_charts(self, user_angles: Dict[str, List[float]], 
                          reference_angles: Dict[str, List[float]],
                          dtw_analysis: Dict[str, Any], 
                          cosine_analysis: Dict[str, Any]) -> Dict[str, str]:
        """Create flow-specific analysis charts"""
        
        # Placeholder for flow charts
        return {
            "flow_sequence": "base64_placeholder",
            "movement_quality": "base64_placeholder",
            "dtw_comparison": "base64_placeholder"
        }
    
    def _combine_flow_joint_analysis(self, dtw_analysis: Dict[str, Any], 
                                   cosine_analysis: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        """Combine flow joint analysis results"""
        
        combined = {}
        
        # Get all unique joints from all analyses
        all_joints = set(dtw_analysis.keys()) | set(cosine_analysis.keys())
        
        for joint in all_joints:
            dtw_result = dtw_analysis.get(joint, {})
            cosine_result = cosine_analysis.get(joint, {})
            
            combined[joint] = {
                "dtw_score": dtw_result.get("score", 0),
                "cosine_score": cosine_result.get("score", 0)
            }
        
        return combined

# Initialize the analysis service
analysis_service = AdvancedAnalysisService()

@app.post("/analyze", response_model=AdvancedAnalysisResult)
async def analyze_exercise(request: AnalysisRequest):
    """Main endpoint for advanced exercise analysis"""
    try:
        result = analysis_service.analyze_exercise(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 