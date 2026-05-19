import React, { useState, useEffect } from 'react';

function LoadingSpinner({ isVisible }) {
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);

  const stages = [
    { message: 'Analyzing repository with AI...', subtext: 'Scanning files and structure' },
    { message: 'Understanding architecture...', subtext: 'Mapping components and dependencies' },
    { message: 'Generating insights using AI...', subtext: 'Creating personalized documentation' }
  ];

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCurrentStage(0);
      return;
    }

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 25); // 100 steps * 25ms = 2.5 seconds

    // Stage updates
    const stageTimeout1 = setTimeout(() => setCurrentStage(1), 833);
    const stageTimeout2 = setTimeout(() => setCurrentStage(2), 1666);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stageTimeout1);
      clearTimeout(stageTimeout2);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="progress-percentage">{progress}%</div>
        </div>
        <p className="loading-text">{stages[currentStage].message}</p>
        <p className="loading-subtext">{stages[currentStage].subtext}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;

// Made with Bob
