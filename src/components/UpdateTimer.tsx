'use client';

import { useState, useEffect } from 'react';

interface UpdateTimerProps {
  lastUpdateTime?: string;
  className?: string;
}

export default function UpdateTimer({ lastUpdateTime, className = "" }: UpdateTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    canUpdate: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, canUpdate: true });

  useEffect(() => {
    if (!lastUpdateTime) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0, canUpdate: true });
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const lastUpdate = new Date(lastUpdateTime);
      const nextUpdate = new Date(lastUpdate.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
      
      const timeDiff = nextUpdate.getTime() - now.getTime();
      
      if (timeDiff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, canUpdate: true });
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, canUpdate: false });
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000); // Update every second

    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  if (timeLeft.canUpdate) {
    return (
      <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">Ready to update</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-gray-600">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-medium">Next update in:</span>
      </div>
      
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-3 py-1">
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold text-gray-900 w-8 text-center">
            {timeLeft.hours.toString().padStart(2, '0')}
          </span>
          <span className="text-gray-500 text-sm">h</span>
        </div>
        
        <span className="text-gray-400 mx-1">:</span>
        
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold text-gray-900 w-8 text-center">
            {timeLeft.minutes.toString().padStart(2, '0')}
          </span>
          <span className="text-gray-500 text-sm">m</span>
        </div>
        
        <span className="text-gray-400 mx-1">:</span>
        
        <div className="flex items-center gap-1">
          <span className="text-xl font-bold text-gray-900 w-8 text-center">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </span>
          <span className="text-gray-500 text-sm">s</span>
        </div>
      </div>
    </div>
  );
} 