"use client";
import React, { useState, useRef, useEffect } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import * as tf from "@tensorflow/tfjs-core";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Exercise } from '../../../data/exercises';
import { generateAndUploadThumbnail } from '@/lib/thumbnailGenerator';

// Utility to calculate angle at point b (in degrees)
function getAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  const angleRad = Math.acos(dot / (magAB * magCB));
  return (angleRad * 180) / Math.PI;
}

// Utility to calculate trunk angle (shoulder-hip line vs. vertical)
function getTrunkAngle(shoulder: { x: number; y: number }, hip: { x: number; y: number }) {
  const dx = hip.x - shoulder.x;
  const dy = hip.y - shoulder.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag === 0) return null;
  const cosTheta = dy / mag;
  const angleRad = Math.acos(cosTheta);
  return (angleRad * 180) / Math.PI;
}

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "letmein";

export default function AdminUpload() {
  // Security
  const [authorized, setAuthorized] = useState(false);
  const [input, setInput] = useState("");

  // Video/keypoints
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [keypoints, setKeypoints] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [showMetadataForm, setShowMetadataForm] = useState(false);

  // Exercise management state
  const [exercises, setExercises] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExercise, setEditingExercise] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingExerciseId, setDeletingExerciseId] = useState<string | null>(null);

  // Curated sections state
  const [curatedSections, setCuratedSections] = useState<any[]>([]);
  const [showCuratedSectionForm, setShowCuratedSectionForm] = useState(false);
  const [editingCuratedSection, setEditingCuratedSection] = useState<any>(null);
  const [curatedSectionData, setCuratedSectionData] = useState({
    title: '',
    description: '',
    order: 0,
    exercises: [] as string[]
  });
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [viewMode, setViewMode] = useState<'upload' | 'manage' | 'curate' | 'featured'>('upload');

  // Featured content state
  const [featuredContent, setFeaturedContent] = useState<any[]>([]);
  const [showFeaturedForm, setShowFeaturedForm] = useState(false);
  const [editingFeatured, setEditingFeatured] = useState<any>(null);
  const [featuredData, setFeaturedData] = useState({
    title: '',
    description: '',
    heroImage: '',
    exerciseId: '',
    ctaText: 'Try Now',
    ctaUrl: '',
    badgeText: 'Featured Exercise',
    isActive: true,
    order: 0
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Metadata form state
  const [metadata, setMetadata] = useState<{
    title: string;
    description: string;
    level: string;
    tags: string[];
    equipment: string[];
    muscleGroups: string[];
    jointsOfInterest: string[];
    instructions: string[];
    authorName: string;
    authorProfileUrl: string;
    relatedExercises: string[];
    image: string;
    referenceVideoUrl: string;
    referenceKeypointsUrl: string;
    id: string;
    createdBy: string;
    dateAdded: string;
    [key: string]: any; // Allow for any additional fields
  }>({
    title: "",
    description: "",
    level: "beginner",
    tags: [],
    equipment: [],
    muscleGroups: [],
    jointsOfInterest: [],
    instructions: [""],
    authorName: "",
    authorProfileUrl: "",
    relatedExercises: [],
    image: "/images/squat.jpg", // Default image
    // Add additional fields that might exist in exercise data
    referenceVideoUrl: "",
    referenceKeypointsUrl: "",
    id: "",
    createdBy: "",
    dateAdded: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [equipmentInput, setEquipmentInput] = useState("");
  const [muscleGroupInput, setMuscleGroupInput] = useState("");
  const [jointInput, setJointInput] = useState("");
  const [relatedExerciseInput, setRelatedExerciseInput] = useState("");

  // Add state for original referenceVideoUrl
  const [originalReferenceVideoUrl, setOriginalReferenceVideoUrl] = useState<string | null>(null);

  // Add state for original exercise data
  const [originalExerciseData, setOriginalExerciseData] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load exercises from database
  const loadExercises = async () => {
    try {
      const res = await fetch('/api/exercises');
      if (!res.ok) throw new Error('Failed to load exercises');
      const data = await res.json();
      setExercises(data);
    } catch (err) {
      console.error('Error loading exercises:', err);
    }
  };

  // Load curated sections from database
  const loadCuratedSections = async () => {
    try {
      const res = await fetch('/api/curated-sections');
      if (!res.ok) throw new Error('Failed to load curated sections');
      const data = await res.json();
      setCuratedSections(data);
    } catch (err) {
      console.error('Error loading curated sections:', err);
    }
  };

  // Load featured content from database
  const loadFeaturedContent = async () => {
    try {
      const res = await fetch('/api/featured-content');
      if (!res.ok) throw new Error('Failed to load featured content');
      const data = await res.json();
      setFeaturedContent(data);
    } catch (err) {
      console.error('Error loading featured content:', err);
    }
  };

  // Handle edit featured content
  const handleEditFeatured = (item: any) => {
    setEditingFeatured(item);
    setFeaturedData({
      title: item.title,
      description: item.description,
      heroImage: item.heroImage,
      exerciseId: item.exerciseId || '',
      ctaText: item.ctaText,
      ctaUrl: item.ctaUrl || '',
      badgeText: item.badgeText,
      isActive: item.isActive,
      order: item.order
    });
    
    // Set image preview for existing images
    if (item.heroImage) {
      if (item.heroImage.startsWith('http')) {
        setImagePreview(item.heroImage);
      } else {
        // For GCS images, get a signed URL for preview
        fetch('/api/storage/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: item.heroImage }),
        })
        .then(res => res.json())
        .then(data => {
          if (data.signedUrl) {
            setImagePreview(data.signedUrl);
          }
        })
        .catch(console.error);
      }
    }
    
    setShowFeaturedForm(true);
  };

  // Handle delete featured content
  const handleDeleteFeatured = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this featured content?')) return;
    
    try {
      const res = await fetch(`/api/featured-content/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete featured content');
      
      alert('Featured content deleted successfully!');
      loadFeaturedContent();
    } catch (err) {
      alert('Error deleting featured content: ' + (err as Error).message);
    }
  };

  // Handle image upload for featured content
  const handleFeaturedImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const result = await response.json();
      
      // Get a signed URL for immediate display
      const signedUrlResponse = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: result.imageUrl }),
      });
      
      let displayUrl = result.imageUrl;
      if (signedUrlResponse.ok) {
        const { signedUrl } = await signedUrlResponse.json();
        displayUrl = signedUrl;
      }
      
      // Update the hero image with the uploaded file path
      setFeaturedData(prev => ({
        ...prev,
        heroImage: result.imageUrl
      }));
      
      // Set preview for immediate display
      setImagePreview(displayUrl);
      
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image: ' + (error as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Save featured content
  const saveFeaturedContent = async () => {
    if (!featuredData.title.trim()) {
      alert("Please enter a title");
      return;
    }

    if (!featuredData.heroImage.trim()) {
      alert("Please upload a hero image");
      return;
    }

    try {
      const url = editingFeatured ? `/api/featured-content/${editingFeatured.id}` : '/api/featured-content';
      const method = editingFeatured ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(featuredData),
      });
      
      if (!res.ok) throw new Error(`Failed to ${editingFeatured ? 'update' : 'save'} featured content`);
      
      alert(`Featured content ${editingFeatured ? 'updated' : 'saved'} successfully!`);
      setShowFeaturedForm(false);
      setEditingFeatured(null);
      setFeaturedData({
        title: '',
        description: '',
        heroImage: '',
        exerciseId: '',
        ctaText: 'Try Now',
        ctaUrl: '',
        badgeText: 'Featured Exercise',
        isActive: true,
        order: 0
      });
      setImagePreview(null);
      
      loadFeaturedContent();
    } catch (err) {
      alert(`Error ${editingFeatured ? 'updating' : 'saving'} featured content: ` + (err as Error).message);
    }
  };

  // Handle edit curated section
  const handleEditCuratedSection = (section: any) => {
    setEditingCuratedSection(section);
    
    // Handle both old format (comma-separated) and new format (JSON with order)
    let exerciseIds: string[] = [];
    try {
      const parsedExercises = JSON.parse(section.exercises);
      if (Array.isArray(parsedExercises)) {
        if (parsedExercises.length > 0 && typeof parsedExercises[0] === 'object') {
          // New format: [{id: "exerciseId", order: 0}, ...]
          exerciseIds = parsedExercises
            .sort((a: any, b: any) => a.order - b.order)
            .map((item: any) => item.id);
        } else {
          // Array of strings
          exerciseIds = parsedExercises;
        }
      }
    } catch {
      // Fallback to old comma-separated format
      exerciseIds = section.exercises ? section.exercises.split(',').filter(Boolean) : [];
    }
    
    setCuratedSectionData({
      title: section.title,
      description: section.description || '',
      order: section.order || 0,
      exercises: exerciseIds
    });
    setShowCuratedSectionForm(true);
  };

  // Handle delete curated section
  const handleDeleteCuratedSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this curated section?')) return;
    
    try {
      const res = await fetch(`/api/curated-sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete curated section');
      
      alert('Curated section deleted successfully!');
      loadCuratedSections();
    } catch (err) {
      alert('Error deleting curated section: ' + (err as Error).message);
    }
  };

  // Save curated section
  const saveCuratedSection = async () => {
    if (!curatedSectionData.title.trim()) {
      alert("Please enter a section title");
      return;
    }

    try {
      // Convert exercises array to format with order
      const exercisesWithOrder = curatedSectionData.exercises.map((exerciseId, index) => ({
        id: exerciseId,
        order: index
      }));

      const url = editingCuratedSection ? `/api/curated-sections/${editingCuratedSection.id}` : '/api/curated-sections';
      const method = editingCuratedSection ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...curatedSectionData,
          exercises: exercisesWithOrder
        }),
      });
      
      if (!res.ok) throw new Error(`Failed to ${editingCuratedSection ? 'update' : 'save'} curated section`);
      
      alert(`Curated section ${editingCuratedSection ? 'updated' : 'saved'} successfully!`);
      setShowCuratedSectionForm(false);
      setEditingCuratedSection(null);
      setCuratedSectionData({
        title: '',
        description: '',
        order: 0,
        exercises: []
      });
      
      loadCuratedSections();
    } catch (err) {
      alert(`Error ${editingCuratedSection ? 'updating' : 'saving'} curated section: ` + (err as Error).message);
    }
  };

  // Handle edit exercise
  const handleEditExercise = (exercise: any) => {
    setEditingExercise(exercise);
    setIsEditMode(true);
    setOriginalReferenceVideoUrl(exercise.referenceVideoUrl || null);
    setOriginalExerciseData(exercise); // Store all original fields
    
    // Merge all fields from the exercise data into metadata
    const mergedMetadata = {
      title: exercise.title || "",
      description: exercise.description || "",
      level: exercise.level || "beginner",
      tags: Array.isArray(exercise.tags) ? exercise.tags : (exercise.tags ? exercise.tags.split(',').filter((t: string) => t.trim()) : []),
      equipment: Array.isArray(exercise.equipment) ? exercise.equipment : (exercise.equipment ? exercise.equipment.split(',').filter((e: string) => e.trim()) : []),
      muscleGroups: Array.isArray(exercise.muscleGroups) ? exercise.muscleGroups : (exercise.muscleGroups ? exercise.muscleGroups.split(',').filter((m: string) => m.trim()) : []),
      jointsOfInterest: Array.isArray(exercise.jointsOfInterest) ? exercise.jointsOfInterest : (exercise.jointsOfInterest ? exercise.jointsOfInterest.split(',').filter((j: string) => j.trim()) : []),
      instructions: Array.isArray(exercise.instructions) ? exercise.instructions : (exercise.instructions ? JSON.parse(exercise.instructions) : ['']),
      authorName: exercise.authorName || "",
      authorProfileUrl: exercise.authorProfileUrl || "",
      relatedExercises: Array.isArray(exercise.relatedExercises) ? exercise.relatedExercises : (exercise.relatedExercises ? exercise.relatedExercises.split(',').filter((r: string) => r.trim()) : []),
      image: exercise.image || "/images/squat.jpg",
      referenceVideoUrl: exercise.referenceVideoUrl || "",
      referenceKeypointsUrl: exercise.referenceKeypointsUrl || "",
      id: exercise.id || "",
      createdBy: exercise.createdBy || "",
      dateAdded: exercise.dateAdded || "",
      // Include all other fields from the exercise data
      ...exercise,
    };
    
    setMetadata(mergedMetadata);
    setShowMetadataForm(true);
  };

  // Handle delete exercise
  const handleDeleteExercise = async (exerciseId: string) => {
    setDeletingExerciseId(exerciseId);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!deletingExerciseId) return;
    
    try {
      const res = await fetch(`/api/exercises/${deletingExerciseId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete exercise');
      
      alert('Exercise deleted successfully!');
      loadExercises(); // Reload the list
    } catch (err) {
      alert('Error deleting exercise: ' + (err as Error).message);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingExerciseId(null);
    }
  };

  // Helper functions for managing form arrays
  const addToArray = (array: string[], value: string, setter: (arr: string[]) => void, inputSetter: (val: string) => void) => {
    if (value.trim() && !array.includes(value.trim())) {
      setter([...array, value.trim()]);
      inputSetter("");
    }
  };

  const removeFromArray = (array: string[], index: number, setter: (arr: string[]) => void) => {
    setter(array.filter((_, i) => i !== index));
  };

  const addInstruction = () => {
    setMetadata(prev => ({
      ...prev,
      instructions: [...prev.instructions, ""]
    }));
  };

  const updateInstruction = (index: number, value: string) => {
    setMetadata(prev => ({
      ...prev,
      instructions: prev.instructions.map((instruction, i) => i === index ? value : instruction)
    }));
  };

  const removeInstruction = (index: number) => {
    setMetadata(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index)
    }));
  };

  // Pre-populate joints of interest based on available angle data
  const prePopulateJoints = () => {
    const availableJoints: string[] = [];
    if (leftKneeAngles.some(angle => angle !== null)) availableJoints.push("leftKnee");
    if (rightKneeAngles.some(angle => angle !== null)) availableJoints.push("rightKnee");
    if (leftHipAngles.some(angle => angle !== null)) availableJoints.push("leftHip");
    if (rightHipAngles.some(angle => angle !== null)) availableJoints.push("rightHip");
    if (leftElbowAngles.some(angle => angle !== null)) availableJoints.push("leftElbow");
    if (rightElbowAngles.some(angle => angle !== null)) availableJoints.push("rightElbow");
    if (leftShoulderAbdAngles.some(angle => angle !== null)) availableJoints.push("leftShoulder");
    if (rightShoulderAbdAngles.some(angle => angle !== null)) availableJoints.push("rightShoulder");
    if (trunkAngles.some(angle => angle !== null)) availableJoints.push("trunk");
    
    setMetadata(prev => ({
      ...prev,
      jointsOfInterest: availableJoints
    }));
  };

  // Save exercise function
  const saveExercise = async () => {
    if (!metadata.title.trim()) {
      alert("Please enter an exercise title");
      return;
    }

    let finalVideoUrl = videoUrl || originalReferenceVideoUrl;
    let finalKeypointsUrl = "";
    let finalImageUrl = metadata.image;

    // Upload video if we have one and it's a blob URL (not already uploaded)
    if (videoUrl && videoUrl.startsWith('blob:')) {
      try {
        const response = await fetch(videoUrl);
        const videoBlob = await response.blob();
        const formData = new FormData();
        formData.append('video', videoBlob, 'exercise-video.mp4');

        const uploadResponse = await fetch('/api/upload/video', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const { videoUrl: uploadedVideoUrl } = await uploadResponse.json();
          finalVideoUrl = uploadedVideoUrl;
          
          // Generate thumbnail from the uploaded video
          try {
            const thumbnailFileName = `${metadata.title.toLowerCase().replace(/\s+/g, "-")}-thumbnail.jpg`;
            const thumbnailUrl = await generateAndUploadThumbnail(uploadedVideoUrl, thumbnailFileName, 2);
            finalImageUrl = thumbnailUrl;
            console.log('Thumbnail generated successfully:', thumbnailUrl);
          } catch (thumbnailError) {
            console.error('Error generating thumbnail:', thumbnailError);
            // Continue without thumbnail - use default image
          }
        }
      } catch (error) {
        console.error('Error uploading video:', error);
        alert('Warning: Video upload failed, but exercise will be saved');
      }
    }

    // Upload keypoints if we have them
    if (keypoints.length > 0) {
      try {
        const keypointsResponse = await fetch('/api/upload/keypoints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            keypoints,
            exerciseId: isEditMode ? editingExercise.id : metadata.title.toLowerCase().replace(/\s+/g, "-")
          }),
        });

        if (keypointsResponse.ok) {
          const { keypointsUrl } = await keypointsResponse.json();
          finalKeypointsUrl = keypointsUrl;
        }
      } catch (error) {
        console.error('Error uploading keypoints:', error);
        alert('Warning: Keypoints upload failed, but exercise will be saved');
      }
    }

    const exerciseData = {
      ...(originalExerciseData || {}), // preserve all original fields
      id: isEditMode ? editingExercise.id : metadata.title.toLowerCase().replace(/\s+/g, "-"),
      title: metadata.title,
      description: metadata.description,
      image: finalImageUrl,
      referenceVideoUrl: finalVideoUrl,
      referenceKeypointsUrl: finalKeypointsUrl || originalExerciseData?.referenceKeypointsUrl,
      tags: metadata.tags.join(','),
      equipment: metadata.equipment.join(','),
      level: metadata.level,
      muscleGroups: metadata.muscleGroups.join(','),
      jointsOfInterest: metadata.jointsOfInterest.join(','),
      createdBy: "admin",
      dateAdded: new Date().toISOString(),
      instructions: JSON.stringify(metadata.instructions.filter(instruction => instruction.trim())),
      authorName: metadata.authorName,
      authorProfileUrl: metadata.authorProfileUrl || undefined,
      relatedExercises: metadata.relatedExercises.join(','),
    };

    try {
      const url = isEditMode ? `/api/exercises/${editingExercise.id}` : '/api/exercises';
      const method = isEditMode ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exerciseData),
      });
      
      if (!res.ok) throw new Error(`Failed to ${isEditMode ? 'update' : 'save'} exercise`);
      
      alert(`Exercise ${isEditMode ? 'updated' : 'saved'} successfully!`);
      setShowMetadataForm(false);
      setIsEditMode(false);
      setEditingExercise(null);
      
      // Reset form
      setMetadata({
        title: "",
        description: "",
        level: "beginner",
        tags: [],
        equipment: [],
        muscleGroups: [],
        jointsOfInterest: [],
        instructions: [""],
        authorName: "",
        authorProfileUrl: "",
        relatedExercises: [],
        image: "/images/squat.jpg",
        referenceVideoUrl: "",
        referenceKeypointsUrl: "",
        id: "",
        createdBy: "",
        dateAdded: "",
      });
      
      // Reload exercises list if in manage mode
      if (viewMode === 'manage') {
        loadExercises();
      }
    } catch (err) {
      alert(`Error ${isEditMode ? 'updating' : 'saving'} exercise: ` + (err as Error).message);
    }
  };

  // Handle video file upload
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
      setKeypoints([]);
      setSelectedFrame(0);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to upload image');
      }

      const { imageUrl } = await response.json();
      
      // Get a signed URL for immediate display
      const signedUrlResponse = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: imageUrl }),
      });
      
      if (signedUrlResponse.ok) {
        const { signedUrl } = await signedUrlResponse.json();
        setMetadata(prev => ({ ...prev, image: signedUrl }));
      } else {
        // Fallback to storing the file path
        setMetadata(prev => ({ ...prev, image: imageUrl }));
      }
      
      alert('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + (error as Error).message);
    }
  };

  // Extract keypoints from video
  const extractKeypoints = async () => {
    if (!videoRef.current) return;
    setProcessing(true);
    await tf.setBackend("webgl");
    await tf.ready();
    const detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );
    const video = videoRef.current;
    const poses: any[] = [];
    video.currentTime = 0;

    await new Promise((resolve) => {
      if (video.readyState >= 1) resolve(true);
      else video.onloadedmetadata = () => resolve(true);
    });

    const step = 3; // Process every 3rd frame (10fps) for efficiency
    const frameRate = 30;
    for (let t = 0; t < video.duration; t += step / frameRate) {
      video.currentTime = t;
      await new Promise((resolve) => (video.onseeked = resolve));
      const pose = await detector.estimatePoses(video);
      poses.push(pose[0] || null);
    }
    setKeypoints(poses);
    setProcessing(false);
    setSelectedFrame(0);
  };

  // Download keypoints as JSON
  const downloadKeypoints = () => {
    const blob = new Blob([JSON.stringify(keypoints, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keypoints.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // MoveNet keypoints indices
  const indices = {
    leftShoulder: 5,
    rightShoulder: 6,
    leftHip: 11,
    rightHip: 12,
    leftKnee: 13,
    rightKnee: 14,
    leftAnkle: 15,
    rightAnkle: 16,
    leftElbow: 7,
    rightElbow: 8,
    leftWrist: 9,
    rightWrist: 10,
  };

  // Calculate angles for each frame
  const leftKneeAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const hip = pose.keypoints[indices.leftHip];
    const knee = pose.keypoints[indices.leftKnee];
    const ankle = pose.keypoints[indices.leftAnkle];
    if (hip?.score > 0.4 && knee?.score > 0.4 && ankle?.score > 0.4) {
      return getAngle(hip, knee, ankle);
    }
    return null;
  });

  const rightKneeAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const hip = pose.keypoints[indices.rightHip];
    const knee = pose.keypoints[indices.rightKnee];
    const ankle = pose.keypoints[indices.rightAnkle];
    if (hip?.score > 0.4 && knee?.score > 0.4 && ankle?.score > 0.4) {
      return getAngle(hip, knee, ankle);
    }
    return null;
  });

  const leftHipAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const shoulder = pose.keypoints[indices.leftShoulder];
    const hip = pose.keypoints[indices.leftHip];
    const knee = pose.keypoints[indices.leftKnee];
    if (shoulder?.score > 0.4 && hip?.score > 0.4 && knee?.score > 0.4) {
      return getAngle(shoulder, hip, knee);
    }
    return null;
  });

  const rightHipAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const shoulder = pose.keypoints[indices.rightShoulder];
    const hip = pose.keypoints[indices.rightHip];
    const knee = pose.keypoints[indices.rightKnee];
    if (shoulder?.score > 0.4 && hip?.score > 0.4 && knee?.score > 0.4) {
      return getAngle(shoulder, hip, knee);
    }
    return null;
  });

  const leftElbowAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const shoulder = pose.keypoints[indices.leftShoulder];
    const elbow = pose.keypoints[indices.leftElbow];
    const wrist = pose.keypoints[indices.leftWrist];
    if (shoulder?.score > 0.4 && elbow?.score > 0.4 && wrist?.score > 0.4) {
      return getAngle(shoulder, elbow, wrist);
    }
    return null;
  });

  const rightElbowAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const shoulder = pose.keypoints[indices.rightShoulder];
    const elbow = pose.keypoints[indices.rightElbow];
    const wrist = pose.keypoints[indices.rightWrist];
    if (shoulder?.score > 0.4 && elbow?.score > 0.4 && wrist?.score > 0.4) {
      return getAngle(shoulder, elbow, wrist);
    }
    return null;
  });

  const leftShoulderAbdAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const elbow = pose.keypoints[indices.leftElbow];
    const shoulder = pose.keypoints[indices.leftShoulder];
    const hip = pose.keypoints[indices.leftHip];
    if (elbow?.score > 0.4 && shoulder?.score > 0.4 && hip?.score > 0.4) {
      return getAngle(elbow, shoulder, hip);
    }
    return null;
  });

  const rightShoulderAbdAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const elbow = pose.keypoints[indices.rightElbow];
    const shoulder = pose.keypoints[indices.rightShoulder];
    const hip = pose.keypoints[indices.rightHip];
    if (elbow?.score > 0.4 && shoulder?.score > 0.4 && hip?.score > 0.4) {
      return getAngle(elbow, shoulder, hip);
    }
    return null;
  });

  const trunkAngles = keypoints.map((pose) => {
    if (!pose || !pose.keypoints) return null;
    const leftShoulder = pose.keypoints[indices.leftShoulder];
    const leftHip = pose.keypoints[indices.leftHip];
    const rightHip = pose.keypoints[indices.rightHip];
    if (leftShoulder?.score > 0.4 && leftHip?.score > 0.4 && rightHip?.score > 0.4) {
      const midHip = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
      };
      return getTrunkAngle(leftShoulder, midHip);
    }
    return null;
  });

  // Draw skeleton for selected frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !keypoints[selectedFrame]) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pose = keypoints[selectedFrame];
    if (!pose || !pose.keypoints) return;

    const adjacentPairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet);
    adjacentPairs.forEach(([i, j]) => {
      const kp1 = pose.keypoints[i];
      const kp2 = pose.keypoints[j];
      if (
        kp1 &&
        kp2 &&
        kp1.score !== undefined &&
        kp2.score !== undefined &&
        kp1.score > 0.4 &&
        kp2.score > 0.4
      ) {
        ctx.beginPath();
        ctx.moveTo(kp1.x, kp1.y);
        ctx.lineTo(kp2.x, kp2.y);
        ctx.strokeStyle = "#64FF58";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    pose.keypoints.forEach((keypoint: any) => {
      if (keypoint.score && keypoint.score > 0.4) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "#1E3A8A";
        ctx.fill();
      }
    });

    // Helper to draw angle text with background for legibility
    function drawAngleText(text: string, x: number, y: number, color: string = "#222", bg: string = "#fff") {
      if (!ctx) return;
      ctx.font = "bold 22px Inter, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Draw background for legibility
      ctx.save();
      ctx.fillStyle = bg;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x - 28, y - 16, 56, 32);
      ctx.restore();
      
      // Draw text
      ctx.fillStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.fillText(text, x, y);
    }

    // Helper to draw angle if valid
    const drawIfValid = (angle: number | null, kp: any, label: string) => {
      if (angle !== null && kp?.score > 0.4) {
        drawAngleText(`${Math.round(angle)}°`, kp.x + 30, kp.y - 30, "#1E3A8A", "#fff");
      }
    };

    // Draw knee angles
    drawIfValid(leftKneeAngles[selectedFrame], pose.keypoints[indices.leftKnee], "Left Knee");
    drawIfValid(rightKneeAngles[selectedFrame], pose.keypoints[indices.rightKnee], "Right Knee");

    // Draw hip angles
    drawIfValid(leftHipAngles[selectedFrame], pose.keypoints[indices.leftHip], "Left Hip");
    drawIfValid(rightHipAngles[selectedFrame], pose.keypoints[indices.rightHip], "Right Hip");

    // Draw elbow angles
    drawIfValid(leftElbowAngles[selectedFrame], pose.keypoints[indices.leftElbow], "Left Elbow");
    drawIfValid(rightElbowAngles[selectedFrame], pose.keypoints[indices.rightElbow], "Right Elbow");

    // Draw shoulder abduction angles
    drawIfValid(leftShoulderAbdAngles[selectedFrame], pose.keypoints[indices.leftShoulder], "Left Shoulder");
    drawIfValid(rightShoulderAbdAngles[selectedFrame], pose.keypoints[indices.rightShoulder], "Right Shoulder");

    // Draw trunk angle (place near mid-hip)
    const leftHip = pose.keypoints[indices.leftHip];
    const rightHip = pose.keypoints[indices.rightHip];
    if (trunkAngles[selectedFrame] !== null && leftHip?.score > 0.4 && rightHip?.score > 0.4) {
      const midHip = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
      };
      drawAngleText(`${Math.round(trunkAngles[selectedFrame])}°`, midHip.x, midHip.y - 40, "#9b9a5a", "#fff");
    }
  }, [selectedFrame, keypoints, leftKneeAngles, rightKneeAngles, leftHipAngles, rightHipAngles, leftElbowAngles, rightElbowAngles, leftShoulderAbdAngles, rightShoulderAbdAngles, trunkAngles]);

  useEffect(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const updateCanvasSize = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      };
      video.addEventListener("loadedmetadata", updateCanvasSize);
      return () => video.removeEventListener("loadedmetadata", updateCanvasSize);
    }
  }, [videoUrl]);

  function getStats(arr: (number | null)[]) {
    const valid = arr.filter((v): v is number => v !== null);
    if (valid.length === 0) return { min: null, max: null, avg: null };
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return { min, max, avg };
  }
  const leftKneeStats = getStats(leftKneeAngles);
  const rightKneeStats = getStats(rightKneeAngles);
  const leftHipStats = getStats(leftHipAngles);
  const rightHipStats = getStats(rightHipAngles);
  const leftElbowStats = getStats(leftElbowAngles);
  const rightElbowStats = getStats(rightElbowAngles);
  const leftShoulderAbdStats = getStats(leftShoulderAbdAngles);
  const rightShoulderAbdStats = getStats(rightShoulderAbdAngles);
  const trunkStats = getStats(trunkAngles);

  const angleChartData = leftKneeAngles.map((_, idx) => ({
    frame: idx + 1,
    leftKnee: leftKneeAngles[idx],
    rightKnee: rightKneeAngles[idx],
    leftHip: leftHipAngles[idx],
    rightHip: rightHipAngles[idx],
    leftElbow: leftElbowAngles[idx],
    rightElbow: rightElbowAngles[idx],
    leftShoulderAbd: leftShoulderAbdAngles[idx],
    rightShoulderAbd: rightShoulderAbdAngles[idx],
    trunk: trunkAngles[idx],
  }));

  const summary = `
Left knee flexion: avg ${leftKneeStats.avg?.toFixed(1) ?? "N/A"}° (min: ${leftKneeStats.min?.toFixed(1) ?? "N/A"}°, max: ${leftKneeStats.max?.toFixed(1) ?? "N/A"}°)
Right knee flexion: avg ${rightKneeStats.avg?.toFixed(1) ?? "N/A"}° (min: ${rightKneeStats.min?.toFixed(1) ?? "N/A"}°, max: ${rightKneeStats.max?.toFixed(1) ?? "N/A"}°)
Left hip flexion: avg ${leftHipStats.avg?.toFixed(1) ?? "N/A"}° (min: ${leftHipStats.min?.toFixed(1) ?? "N/A"}°, max: ${leftHipStats.max?.toFixed(1) ?? "N/A"}°)
Right hip flexion: avg ${rightHipStats.avg?.toFixed(1) ?? "N/A"}° (min: ${rightHipStats.min?.toFixed(1) ?? "N/A"}°, max: ${rightHipStats.max?.toFixed(1) ?? "N/A"}°)
Left elbow flexion: avg ${leftElbowStats.avg?.toFixed(1) ?? "N/A"}° (min: ${leftElbowStats.min?.toFixed(1) ?? "N/A"}°, max: ${leftElbowStats.max?.toFixed(1) ?? "N/A"}°)
Right elbow flexion: avg ${rightElbowStats.avg?.toFixed(1) ?? "N/A"}° (min: ${rightElbowStats.min?.toFixed(1) ?? "N/A"}°, max: ${rightElbowStats.max?.toFixed(1) ?? "N/A"}°)
Left shoulder abduction: avg ${leftShoulderAbdStats.avg?.toFixed(1) ?? "N/A"}° (min: ${leftShoulderAbdStats.min?.toFixed(1) ?? "N/A"}°, max: ${leftShoulderAbdStats.max?.toFixed(1) ?? "N/A"}°)
Right shoulder abduction: avg ${rightShoulderAbdStats.avg?.toFixed(1) ?? "N/A"}° (min: ${rightShoulderAbdStats.min?.toFixed(1) ?? "N/A"}°, max: ${rightShoulderAbdStats.max?.toFixed(1) ?? "N/A"}°)
Trunk angle: avg ${trunkStats.avg?.toFixed(1) ?? "N/A"}° (min: ${trunkStats.min?.toFixed(1) ?? "N/A"}°, max: ${trunkStats.max?.toFixed(1) ?? "N/A"}°)
`.trim();

  const numFrames = keypoints.length;
  const framesWithPerson = keypoints.filter(
    (pose) => pose && pose.keypoints && pose.keypoints.some((kp: any) => kp.score > 0.4)
  ).length;
  const avgConfidence =
    numFrames > 0
      ? (
          keypoints
            .map(
              (pose) =>
                pose &&
                pose.keypoints &&
                pose.keypoints
                  .filter((kp: any) => typeof kp.score === "number")
                  .reduce((sum: number, kp: any) => sum + kp.score, 0) /
                  pose.keypoints.length
            )
            .filter(Boolean)
            .reduce((a, b) => a + b, 0) / numFrames
        ).toFixed(2)
      : 0;

  // Load data when entering different modes
  useEffect(() => {
    if (viewMode === 'curate') {
      loadExercises();
      loadCuratedSections();
    } else if (viewMode === 'featured') {
      loadExercises();
      loadFeaturedContent();
    }
  }, [viewMode]);

  // Update selected exercises when curatedSectionData.exercises changes
  useEffect(() => {
    // Create a map for quick lookup
    const exerciseMap = new Map(exercises.map(ex => [ex.id, ex]));
    
    // Maintain the order from curatedSectionData.exercises
    const selected = curatedSectionData.exercises
      .map(exerciseId => exerciseMap.get(exerciseId))
      .filter(Boolean); // Remove any undefined exercises
    
    setSelectedExercises(selected);
  }, [curatedSectionData.exercises, exercises]);

  // Move exercise up or down in order
  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newExercises = [...curatedSectionData.exercises];
    const [movedExercise] = newExercises.splice(fromIndex, 1);
    newExercises.splice(toIndex, 0, movedExercise);

    setCuratedSectionData(prev => ({
      ...prev,
      exercises: newExercises
    }));
  };

    return (
    <main className="bg-onyx-100">
      {/* Spacer for sticky header */}
      <div style={{ height: '60px', marginTop: '30px' }}></div>
      <div className="pt-32">
        <div className="mx-auto py-12" style={{ maxWidth: '2560px', marginLeft: '45px', marginRight: '45px' }}>
          {/* Header */}
          <div className="px-4 mb-8">
            <h1 className="text-3xl font-bold text-onyx-10 mb-2">Admin Panel</h1>
            <p className="text-onyx-30 text-lg">
              Upload and manage exercises, curated sections, and featured content
            </p>
          </div>

          {/* Security Check */}
          {!authorized ? (
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-bold text-onyx-10 mb-4">Admin Access</h2>
          <input
            type="password"
            value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter admin password"
                className="w-full p-3 border border-onyx-30 rounded-lg mb-4"
                onKeyPress={(e) => e.key === 'Enter' && setAuthorized(input === ADMIN_PASSWORD)}
          />
          <button
                onClick={() => setAuthorized(input === ADMIN_PASSWORD)}
                className="w-full bg-blue-100 text-white py-3 rounded-lg font-bold hover:bg-blue-90 transition"
              >
                Login
          </button>
        </div>
          ) : (
            <div className="space-y-8">
      {/* Navigation Tabs */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex gap-4 mb-6 flex-wrap">
        <button
                    onClick={() => setViewMode('upload')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === 'upload'
              ? 'bg-blue-100 text-white'
              : 'bg-onyx-20 text-onyx-10 hover:bg-onyx-30'
          }`}
        >
                    Upload Exercise
        </button>
        <button
                    onClick={() => setViewMode('manage')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === 'manage'
              ? 'bg-blue-100 text-white'
              : 'bg-onyx-20 text-onyx-10 hover:bg-onyx-30'
          }`}
        >
                    Manage Exercises
        </button>
        <button
                    onClick={() => setViewMode('curate')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === 'curate'
              ? 'bg-blue-100 text-white'
              : 'bg-onyx-20 text-onyx-10 hover:bg-onyx-30'
          }`}
        >
                    Curated Sections
        </button>
        <button
                    onClick={() => setViewMode('featured')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
            viewMode === 'featured'
              ? 'bg-blue-100 text-white'
              : 'bg-onyx-20 text-onyx-10 hover:bg-onyx-30'
          }`}
        >
                    Featured Content
        </button>
        <button
          onClick={() => window.location.href = '/admin/thumbnails'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
        >
                    Generate Thumbnails
        </button>
      </div>

                {/* Content based on view mode */}
      {viewMode === 'upload' && (
                  <div className="bg-onyx-20 rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-onyx-10 mb-6">Upload New Exercise</h2>
                    
                    {/* Video Upload Section */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-onyx-10 mb-4">Video Upload</h3>
                      <div className="bg-white rounded-lg p-6 border-2 border-dashed border-onyx-30">
          <input
            type="file"
                          ref={fileInputRef}
            onChange={handleUpload}
                          accept="video/*"
            className="hidden"
          />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full bg-blue-100 text-white py-4 rounded-lg font-bold hover:bg-blue-90 transition"
                        >
                          Choose Video File
                        </button>
          {videoUrl && (
                          <div className="mt-4">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
                              className="w-full max-w-md rounded-lg"
            />
                          </div>
          )}
                      </div>
                    </div>

                    {/* Keypoints Extraction */}
          {videoUrl && (
                      <div className="mb-8">
                        <h3 className="text-lg font-semibold text-onyx-10 mb-4">Pose Analysis</h3>
                        <div className="bg-white rounded-lg p-6">
            <button
              onClick={extractKeypoints}
              disabled={processing}
                            className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50"
            >
                            {processing ? 'Processing...' : 'Extract Keypoints'}
            </button>
          {keypoints.length > 0 && (
                            <div className="mt-4">
                <canvas
                  ref={canvasRef}
                                className="border border-onyx-30 rounded-lg"
                                style={{ maxWidth: '100%' }}
                />
              </div>
                          )}
                        </div>
                      </div>
      )}

                    {/* Metadata Form */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-onyx-10 mb-4">Exercise Metadata</h3>
                      <div className="bg-white rounded-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-onyx-10 mb-2">Title</label>
                            <input
                              type="text"
                              value={metadata.title}
                              onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                              className="w-full p-3 border border-onyx-30 rounded-lg"
                              placeholder="Exercise title"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-onyx-10 mb-2">Level</label>
                            <select
                              value={metadata.level}
                              onChange={(e) => setMetadata({...metadata, level: e.target.value})}
                              className="w-full p-3 border border-onyx-30 rounded-lg"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="intermediate">Intermediate</option>
                              <option value="advanced">Advanced</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-onyx-10 mb-2">Description</label>
                            <textarea
                              value={metadata.description}
                              onChange={(e) => setMetadata({...metadata, description: e.target.value})}
                              className="w-full p-3 border border-onyx-30 rounded-lg"
                              rows={3}
                              placeholder="Exercise description"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-6">
              <button
                            onClick={saveExercise}
                            disabled={!metadata.title || !videoUrl}
                            className="bg-blue-100 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-90 transition disabled:opacity-50"
              >
                            Save Exercise
              </button>
            </div>
              </div>
                    </div>
                  </div>
                )}

                {viewMode === 'manage' && (
                  <div className="bg-onyx-20 rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-onyx-10 mb-6">Manage Exercises</h2>
              <div className="grid gap-4">
                {exercises.map((exercise) => (
                        <div key={exercise.id} className="bg-white rounded-lg p-4 border border-onyx-30">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-onyx-20 rounded flex items-center justify-center">
                                {exercise.image && exercise.image !== '/images/squat.jpg' ? (
                                  <img 
                                    src={exercise.image} 
                                    alt={exercise.title} 
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <span className="text-onyx-30 text-xs">No Image</span>
                                )}
                              </div>
                              <div>
                        <h3 className="text-lg font-semibold text-onyx-10">{exercise.title}</h3>
                                <p className="text-sm text-onyx-30">{exercise.level}</p>
                        </div>
                      </div>
                            <div className="flex gap-2">
                        <button
                          onClick={() => handleEditExercise(exercise)}
                                className="px-4 py-2 bg-blue-100 text-white rounded text-sm hover:bg-blue-90 transition"
                        >
                                Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExercise(exercise.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                        >
                                Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

      {viewMode === 'curate' && (
                  <div className="bg-onyx-20 rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-onyx-10 mb-6">Curated Sections</h2>
              <button
                      onClick={() => setShowCuratedSectionForm(true)}
                      className="bg-blue-100 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-90 transition mb-6"
              >
                      Create New Section
              </button>
              <div className="grid gap-4">
                {curatedSections.map((section) => (
                        <div key={section.id} className="bg-white rounded-lg p-4 border border-onyx-30">
                          <div className="flex justify-between items-center">
                            <div>
                        <h3 className="text-lg font-semibold text-onyx-10">{section.title}</h3>
                              <p className="text-sm text-onyx-30">{section.description}</p>
                        </div>
                            <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCuratedSection(section)}
                                className="px-4 py-2 bg-blue-100 text-white rounded text-sm hover:bg-blue-90 transition"
                        >
                                Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCuratedSection(section.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                        >
                                Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

      {viewMode === 'featured' && (
                  <div className="bg-onyx-20 rounded-lg p-6">
                    <h2 className="text-2xl font-bold text-onyx-10 mb-6">Featured Content</h2>
              <button
                      onClick={() => setShowFeaturedForm(true)}
                      className="bg-blue-100 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-90 transition mb-6"
              >
                      Create Featured Content
              </button>
              <div className="grid gap-4">
                {featuredContent.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg p-4 border border-onyx-30">
                          <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                              {item.heroImage && (
                                <div className="w-16 h-16 bg-onyx-20 rounded flex items-center justify-center">
                        <img 
                          src={item.heroImage} 
                          alt={item.title}
                                    className="w-full h-full object-cover rounded"
                        />
                                </div>
                              )}
                              <div>
                          <h3 className="text-lg font-semibold text-onyx-10">{item.title}</h3>
                                <p className="text-sm text-onyx-30">{item.description}</p>
                          </div>
                        </div>
                            <div className="flex gap-2">
                        <button
                          onClick={() => handleEditFeatured(item)}
                                className="px-4 py-2 bg-blue-100 text-white rounded text-sm hover:bg-blue-90 transition"
                        >
                                Edit
                        </button>
                        <button
                          onClick={() => handleDeleteFeatured(item.id)}
                                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                        >
                                Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                    </div>
              </div>
            )}
          </div>
        </div>
      )}

          {/* Exercise Metadata Form Modal */}
      {showMetadataForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-onyx-10">
                  {isEditMode ? 'Edit Exercise' : 'Exercise Metadata'}
                </h2>
                <button
                  onClick={() => {
                    setShowMetadataForm(false);
                    setIsEditMode(false);
                    setEditingExercise(null);
                  }}
                  className="text-onyx-30 hover:text-onyx-10 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dynamically render all non-array, non-instructions fields */}
                {Object.keys(metadata).map((key) => {
                  if (
                    Array.isArray((metadata as any)[key]) ||
                    key === 'instructions' ||
                    key === 'relatedExercises' // handled below
                  ) {
                    return null;
                  }
                  // Special handling for 'level' (dropdown) and 'description' (textarea)
                  if (key === 'level') {
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-onyx-20 mb-1">Level</label>
                        <select
                          value={metadata.level}
                          onChange={e => setMetadata(prev => ({ ...prev, level: e.target.value }))}
                      className="w-full px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                  </div>
                    );
                  }
                  if (key === 'description') {
                    return (
                      <div key={key} className="md:col-span-2">
                        <label className="block text-sm font-medium text-onyx-20 mb-1">Description</label>
                    <textarea
                      value={metadata.description}
                          onChange={e => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                      rows={3}
                      placeholder="Brief description of the exercise..."
                    />
                  </div>
                    );
                  }
                  // Title gets a required label
                  if (key === 'title') {
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-onyx-20 mb-1">Exercise Title *</label>
                        <input
                          type="text"
                          value={metadata.title}
                          onChange={e => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="e.g., Barbell Squat"
                        />
                  </div>
                    );
                  }
                  // Author fields
                  if (key === 'authorName') {
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-onyx-20 mb-1">Author Name</label>
                    <input
                      type="text"
                      value={metadata.authorName}
                          onChange={e => setMetadata(prev => ({ ...prev, authorName: e.target.value }))}
                      className="w-full px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="e.g., Coach Jane Doe"
                    />
                  </div>
                    );
                  }
                  if (key === 'authorProfileUrl') {
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-onyx-20 mb-1">Author Profile URL</label>
                    <input
                      type="url"
                      value={metadata.authorProfileUrl}
                          onChange={e => setMetadata(prev => ({ ...prev, authorProfileUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                      placeholder="https://example.com/profile"
                    />
                  </div>
                    );
                  }
                  // All other fields (string/number)
                  return (
                    <div key={key}>
                      <label className="block text-xs font-medium text-onyx-20 mb-1">{key}</label>
                      <input
                        type="text"
                        value={(metadata as any)[key] || ''}
                        onChange={e => setMetadata(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder={key}
                      />
                        </div>
                  );
                })}
                </div>

              {/* Array fields: tags, equipment, muscleGroups, jointsOfInterest */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Tags */}
                  <div>
                  <label className="block text-sm font-medium text-onyx-20 mb-1">Tags</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addToArray(metadata.tags, tagInput, arr => setMetadata(prev => ({ ...prev, tags: arr })), setTagInput)}
                        className="flex-1 px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Add tag and press Enter"
                      />
                      <button
                      onClick={() => addToArray(metadata.tags, tagInput, arr => setMetadata(prev => ({ ...prev, tags: arr })), setTagInput)}
                        className="px-3 py-2 bg-blue-100 text-white rounded hover:bg-blue-90"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata.tags.map((tag, index) => (
                        <span key={index} className="bg-onyx-20 text-onyx-10 px-2 py-1 rounded text-sm flex items-center gap-1">
                          {tag}
                        <button onClick={() => removeFromArray(metadata.tags, index, arr => setMetadata(prev => ({ ...prev, tags: arr })))}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Equipment */}
                  <div>
                  <label className="block text-sm font-medium text-onyx-20 mb-1">Equipment</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={equipmentInput}
                      onChange={e => setEquipmentInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addToArray(metadata.equipment, equipmentInput, arr => setMetadata(prev => ({ ...prev, equipment: arr })), setEquipmentInput)}
                        className="flex-1 px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Add equipment and press Enter"
                      />
                      <button
                      onClick={() => addToArray(metadata.equipment, equipmentInput, arr => setMetadata(prev => ({ ...prev, equipment: arr })), setEquipmentInput)}
                        className="px-3 py-2 bg-blue-100 text-white rounded hover:bg-blue-90"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata.equipment.map((item, index) => (
                        <span key={index} className="bg-onyx-20 text-onyx-10 px-2 py-1 rounded text-sm flex items-center gap-1">
                          {item}
                        <button onClick={() => removeFromArray(metadata.equipment, index, arr => setMetadata(prev => ({ ...prev, equipment: arr })))}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Muscle Groups */}
                  <div>
                  <label className="block text-sm font-medium text-onyx-20 mb-1">Muscle Groups</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={muscleGroupInput}
                      onChange={e => setMuscleGroupInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addToArray(metadata.muscleGroups, muscleGroupInput, arr => setMetadata(prev => ({ ...prev, muscleGroups: arr })), setMuscleGroupInput)}
                        className="flex-1 px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Add muscle group and press Enter"
                      />
                      <button
                      onClick={() => addToArray(metadata.muscleGroups, muscleGroupInput, arr => setMetadata(prev => ({ ...prev, muscleGroups: arr })), setMuscleGroupInput)}
                        className="px-3 py-2 bg-blue-100 text-white rounded hover:bg-blue-90"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata.muscleGroups.map((muscle, index) => (
                        <span key={index} className="bg-onyx-20 text-onyx-10 px-2 py-1 rounded text-sm flex items-center gap-1">
                          {muscle}
                        <button onClick={() => removeFromArray(metadata.muscleGroups, index, arr => setMetadata(prev => ({ ...prev, muscleGroups: arr })))}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Joints of Interest */}
                  <div>
                  <label className="block text-sm font-medium text-onyx-20 mb-1">Joints of Interest</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={jointInput}
                      onChange={e => setJointInput(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addToArray(metadata.jointsOfInterest, jointInput, arr => setMetadata(prev => ({ ...prev, jointsOfInterest: arr })), setJointInput)}
                        className="flex-1 px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Add joint and press Enter"
                      />
                      <button
                      onClick={() => addToArray(metadata.jointsOfInterest, jointInput, arr => setMetadata(prev => ({ ...prev, jointsOfInterest: arr })), setJointInput)}
                        className="px-3 py-2 bg-blue-100 text-white rounded hover:bg-blue-90"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata.jointsOfInterest.map((joint, index) => (
                        <span key={index} className="bg-onyx-20 text-onyx-10 px-2 py-1 rounded text-sm flex items-center gap-1">
                          {joint}
                        <button onClick={() => removeFromArray(metadata.jointsOfInterest, index, arr => setMetadata(prev => ({ ...prev, jointsOfInterest: arr })))}>×</button>
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-onyx-10 mb-4">Instructions</h3>
                <div className="space-y-3">
                  {metadata.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="text-sm font-medium text-onyx-20 mt-2">{index + 1}.</span>
                      <input
                        type="text"
                        value={instruction}
                        onChange={e => updateInstruction(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder={`Step ${index + 1}...`}
                      />
                      {metadata.instructions.length > 1 && (
                        <button
                          onClick={() => removeInstruction(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addInstruction}
                    className="text-blue-100 hover:text-blue-90 text-sm font-medium"
                  >
                    + Add Step
                  </button>
                </div>
              </div>

              {/* Related Exercises */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-onyx-10 mb-2">Related Exercises</h3>
                <label className="block text-sm font-medium text-onyx-20 mb-1">Related Exercise IDs</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={relatedExerciseInput}
                    onChange={e => setRelatedExerciseInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addToArray(metadata.relatedExercises, relatedExerciseInput, arr => setMetadata(prev => ({ ...prev, relatedExercises: arr })), setRelatedExerciseInput)}
                    className="flex-1 px-3 py-2 border border-onyx-30 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="Add related exercise ID and press Enter"
                  />
                  <button
                    onClick={() => addToArray(metadata.relatedExercises, relatedExerciseInput, arr => setMetadata(prev => ({ ...prev, relatedExercises: arr })), setRelatedExerciseInput)}
                    className="px-3 py-2 bg-blue-100 text-white rounded hover:bg-blue-90"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metadata.relatedExercises.map((exercise, index) => (
                    <span key={index} className="bg-onyx-20 text-onyx-10 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {exercise}
                      <button onClick={() => removeFromArray(metadata.relatedExercises, index, arr => setMetadata(prev => ({ ...prev, relatedExercises: arr })))}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-onyx-30">
                <button
                  onClick={() => setShowMetadataForm(false)}
                  className="px-6 py-2 border border-onyx-30 text-onyx-20 rounded hover:bg-onyx-20 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveExercise}
                  className="px-6 py-2 bg-blue-100 text-white rounded font-medium hover:bg-blue-90 transition"
                >
                  {isEditMode ? 'Update Exercise' : 'Save Exercise'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-onyx-10 mb-4">Confirm Delete</h3>
              <p className="text-onyx-20 mb-6">
                Are you sure you want to delete this exercise? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingExerciseId(null);
                  }}
                  className="px-4 py-2 border border-onyx-30 text-onyx-20 rounded hover:bg-onyx-20 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </main>
  );
}
