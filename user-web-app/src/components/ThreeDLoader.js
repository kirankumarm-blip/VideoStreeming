import React from 'react';

const ThreeDLoader = ({ text = "Loading telemetry data..." }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 20px',
      minHeight: '280px',
      perspective: '1000px',
      width: '100%'
    }}>
      {/* 3D Orbiting Gyroscope Atom Animation */}
      <div style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        transformStyle: 'preserve-3d',
        animation: 'rotate3dScene 8s linear infinite'
      }}>
        {/* Outer Ring 1 */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#e50914',
          borderRightColor: '#e50914',
          boxShadow: '0 0 18px rgba(229, 9, 20, 0.7)',
          animation: 'spin3dRing1 2s linear infinite',
          transformStyle: 'preserve-3d'
        }} />

        {/* Middle Ring 2 */}
        <div style={{
          position: 'absolute',
          inset: '12px',
          borderRadius: '50%',
          border: '3px solid transparent',
          borderBottomColor: '#6366f1',
          borderLeftColor: '#6366f1',
          boxShadow: '0 0 18px rgba(99, 102, 241, 0.7)',
          animation: 'spin3dRing2 1.6s linear infinite reverse',
          transformStyle: 'preserve-3d'
        }} />

        {/* Inner Ring 3 */}
        <div style={{
          position: 'absolute',
          inset: '24px',
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTopColor: '#38bdf8',
          borderRightColor: '#38bdf8',
          boxShadow: '0 0 18px rgba(56, 189, 248, 0.7)',
          animation: 'spin3dRing3 1.2s ease-in-out infinite',
          transformStyle: 'preserve-3d'
        }} />

        {/* Central Pulsing 3D Core Sphere */}
        <div style={{
          position: 'absolute',
          inset: '40px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #ffffff, #e50914 60%, #800000 100%)',
          boxShadow: '0 0 25px rgba(229, 9, 20, 0.9), inset 0 0 10px rgba(255, 255, 255, 0.8)',
          animation: 'pulse3dCore 1.5s ease-in-out infinite alternate'
        }} />
      </div>

      {/* Embedded CSS Animations */}
      <style>{`
        @keyframes rotate3dScene {
          0% { transform: rotateX(20deg) rotateY(0deg); }
          100% { transform: rotateX(20deg) rotateY(360deg); }
        }
        @keyframes spin3dRing1 {
          0% { transform: rotateX(65deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(65deg) rotateY(0deg) rotateZ(360deg); }
        }
        @keyframes spin3dRing2 {
          0% { transform: rotateX(-45deg) rotateY(65deg) rotateZ(0deg); }
          100% { transform: rotateX(-45deg) rotateY(65deg) rotateZ(360deg); }
        }
        @keyframes spin3dRing3 {
          0% { transform: rotateX(75deg) rotateY(-45deg) rotateZ(0deg); }
          100% { transform: rotateX(75deg) rotateY(-45deg) rotateZ(360deg); }
        }
        @keyframes pulse3dCore {
          0% { transform: scale(0.85); box-shadow: 0 0 15px rgba(229, 9, 20, 0.6); }
          100% { transform: scale(1.15); box-shadow: 0 0 35px rgba(229, 9, 20, 1), 0 0 50px rgba(99, 102, 241, 0.6); }
        }
        @keyframes shimmer3dText {
          0% { opacity: 0.6; text-shadow: 0 0 5px rgba(229, 9, 20, 0.3); }
          100% { opacity: 1; text-shadow: 0 0 15px rgba(229, 9, 20, 0.8); }
        }
      `}</style>

      {/* Loading Label with Shimmer */}
      <div style={{
        marginTop: '28px',
        fontSize: '15px',
        fontWeight: 700,
        letterSpacing: '0.8px',
        color: 'var(--text-primary, #ffffff)',
        animation: 'shimmer3dText 1.5s ease-in-out infinite alternate',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>⚡</span> {text}
      </div>
    </div>
  );
};

export default ThreeDLoader;
