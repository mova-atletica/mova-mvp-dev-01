"use client";
import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Define pages that should NOT have a footer
  const excludeFooterPaths = [
    '/test-foundation',
    '/test-phase2',
    '/try',
    '/admin'
  ];
  
  // Check if current path should exclude footer
  const shouldExcludeFooter = excludeFooterPaths.some(path => 
    pathname.startsWith(path)
  );
  
  if (shouldExcludeFooter) {
    return null;
  }
  
  return <Footer />;
}
