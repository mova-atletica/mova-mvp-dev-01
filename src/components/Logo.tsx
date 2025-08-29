"use client";
import Image from 'next/image';

export default function Logo({ className = "w-2 h-2", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <Image
      src="/images/brand/logo/Logo_Contained.svg"
      alt="Mova Atletica Logo"
      width={24}
      height={24}
      className={className}
      style={style}
    />
  );
} 