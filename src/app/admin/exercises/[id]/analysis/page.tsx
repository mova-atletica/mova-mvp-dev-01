'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import AnalysisDetailPage from '@/components/admin/AnalysisDetailPage';

export default function ExerciseAnalysisPage() {
  const params = useParams();
  const exerciseId = params.id as string;

  return <AnalysisDetailPage exerciseId={exerciseId} />;
}
