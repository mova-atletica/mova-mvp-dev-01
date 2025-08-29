"use client";
import Link from "next/link";
import ThemeToggle from './ThemeToggle';
import Image from 'next/image';
import { useTheme } from '../contexts/ThemeContext';

export default function Header() {
  const { theme } = useTheme();
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm py-4 flex items-center justify-between mx-auto rounded-lg" style={{ 
      backgroundColor: 'var(--header-bg)', 
      color: 'var(--header-text)',
      border: '1px solid var(--header-border)',
      paddingLeft:'21px',
      paddingRight:'21px',
      maxWidth: '2560px', 
      marginTop: '3vh',
      marginLeft: '3%', 
      marginRight: '3%',
      width: '94%'
      //width: 'calc(100vw - 6vw)'
    }}>
      <Link href="/" className="flex items-center">
        <Image
          src="/images/brand/logo/Logo_Horizontal.svg"
          alt="Mova Atletica Logo"
          width={120}
          height={32}
          className="w-24 transition-all duration-300"
          style={{ 
            height: 'auto',
            filter: theme === 'dark' ? 'invert(1) brightness(0.9)' : 'invert(0) brightness(1)',
          }}
        />
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
