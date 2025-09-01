"use client";
import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer style={{
      width: '100%',
      maxWidth: '2560px',
      marginLeft: '0%',
      marginRight: '0%',
      borderTop: '1px solid var(--border)',
      //backgroundColor: 'var(--surface)',
      padding: '21px',
      position: 'relative',
      zIndex: 10,
      boxSizing: 'border-box',
      display: 'block',
      clear: 'both',
      marginTop: '20px'
    }}>
      <div style={{ 
        maxWidth: '2560px', 
        paddingLeft: '0px', 
        paddingRight: '0px',
        boxSizing: 'border-box',
        margin: '0 auto',
        paddingTop: '12px',
        paddingBottom: '12px'
      }}>
        <div style={{ 
          maxWidth: '2560px', 
          margin: '0 auto', 
          paddingLeft: '24px', 
          paddingRight: '24px' 
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            {/* Brand Section */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px' 
            }}>
              <Link href="/" style={{ display: 'inline-block' }}>
                <Logo className="w-8" style={{ height: 'auto' }} />
              </Link>
              <span style={{ 
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                color: 'var(--section-subtitle)'
              }}>
                © {currentYear} Mova Atletica, Inc.
              </span>          
            </div>
            
            {/* Legal Links */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '24px',
              fontSize: '12px'
            }}>
              <Link 
                href="https://app.termly.io/policy-viewer/policy.html?policyUUID=4d4ccf3e-a802-44df-aa73-51822d5d7f9d " 
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: 'var(--section-subtitle)',
                  textDecoration: 'none',
                  fontFamily: 'Arial, sans-serif',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                Privacy Policy
              </Link>
              <Link 
                href="https://app.termly.io/policy-viewer/policy.html?policyUUID=fdbd3538-3be4-42d1-8c89-ba7676b7d238" 
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  color: 'var(--section-subtitle)',
                  textDecoration: 'none',
                  fontFamily: 'Arial, sans-serif',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}