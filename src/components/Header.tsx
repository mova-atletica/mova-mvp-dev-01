"use client";
import Link from "next/link";
import ThemeToggle from './ThemeToggle';
import Image from 'next/image';
import { useTheme } from '../contexts/ThemeContext';
import { usePathname } from 'next/navigation';

export default function Header() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const isMotionExplorePage = pathname === '/motion-explore';
  
  return (
    <header className={`${isMotionExplorePage ? 'relative' : 'fixed top-0 left-0 right-0'} z-50 backdrop-blur-sm py-4 flex items-center justify-between mx-auto rounded-lg`} style={{ 
      backgroundColor: 'var(--header-bg)', 
      color: 'var(--header-text)',
      border: '1px solid var(--header-border)',
      paddingLeft:'21px',
      paddingRight:'21px',
      maxWidth: '2560px', 
      marginTop: isMotionExplorePage ? '0px' : '3vh',
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
            filter: 'var(--logo-color)',
          }}
        />
      </Link>
      <div className="flex items-center gap-4">
        <Link 
          href="/open-move" 
          className="px-2 py-2 rounded-md font-medium text-xs transition cursor-pointer"
          style={{
            background: 'var(--primary-button-bg)',
            color: 'var(--primary-button-text)',
            border: '2px solid var(--primary-button-border)'
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary-button-hover-bg)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary-button-hover-text)';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--primary-button-hover-border)';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'var(--primary-button-bg)';
            (e.currentTarget as HTMLAnchorElement).style.color = 'var(--primary-button-text)';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--primary-button-border)';
          }}
        >
          Record/Upload
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
