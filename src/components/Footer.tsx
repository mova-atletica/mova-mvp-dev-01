"use client";
import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-auto border-t-1" style={{ 
      borderColor: 'var(--border)',
      paddingLeft:'21px',
      paddingRight:'21px',
      maxWidth: '2560px',
      //backgroundColor: 'var(--surface)',
      color: 'var(--foreground)'
    }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand Section */}
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-block">
              <Logo className="w-8" style={{ height: 'auto' }} />
            </Link>
{/*             <span className="text-sm" style={{ color: 'var(--section-subtitle)' }}>
              Advanced exercise analysis and movement tracking
            </span> */}
          <span className="font-regular text-sm" style={{ color: 'var(--section-subtitle)' }}>
              © {currentYear} Mova Atletica, Inc.
          </span>          
          </div>


          
          {/* Legal Links */}
          <div className="flex items-center gap-6 text-xs">
            <Link 
              href="https://app.termly.io/policy-viewer/policy.html?policyUUID=4d4ccf3e-a802-44df-aa73-51822d5d7f9d " 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-regular tracking-wide transition-all duration-200 hover:text-opacity-80" 
              style={{ color: 'var(--section-subtitle)' }}
            >
              Privacy Policy
            </Link>
            <Link 
              href="https://app.termly.io/policy-viewer/policy.html?policyUUID=fdbd3538-3be4-42d1-8c89-ba7676b7d238" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-regular tracking-wide transition-all duration-200 hover:text-opacity-80" 
              style={{ color: 'var(--section-subtitle)' }}
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
