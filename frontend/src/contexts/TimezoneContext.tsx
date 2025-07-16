import React, { createContext, useContext, useState, useEffect } from 'react';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  formatDateTime: (dateString: string, options?: Intl.DateTimeFormatOptions) => string;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

// Common timezone options
export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (CST, UTC+8)' },
  { value: 'Asia/Tokyo', label: '日本标准时间 (JST, UTC+9)' },
  { value: 'Asia/Seoul', label: '韩国标准时间 (KST, UTC+9)' },
  { value: 'Asia/Hong_Kong', label: '香港时间 (HKT, UTC+8)' },
  { value: 'Asia/Taipei', label: '台北时间 (CST, UTC+8)' },
  { value: 'America/New_York', label: '美国东部时间 (EST/EDT)' },
  { value: 'America/Los_Angeles', label: '美国西部时间 (PST/PDT)' },
  { value: 'America/Chicago', label: '美国中部时间 (CST/CDT)' },
  { value: 'Europe/London', label: '英国时间 (GMT/BST)' },
  { value: 'Europe/Paris', label: '欧洲中部时间 (CET/CEST)' },
  { value: 'Europe/Berlin', label: '德国时间 (CET/CEST)' },
  { value: 'Australia/Sydney', label: '澳大利亚东部时间 (AEST/AEDT)' },
  { value: 'UTC', label: '协调世界时 (UTC)' },
];

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [timezone] = useState<string>(() => {
    // Read timezone from environment variable (set via Docker Compose)
    const envTimezone = import.meta.env.VITE_TIMEZONE;
    
    if (envTimezone) {
      console.log('Using timezone from Docker environment:', envTimezone);
      return envTimezone;
    }
    
    // Fallback to browser timezone or default
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('Using browser timezone:', browserTimezone);
      return browserTimezone;
    } catch {
      console.log('Using default timezone: Asia/Shanghai');
      return 'Asia/Shanghai';
    }
  });

  // Remove setTimezone function since timezone is now read-only from environment
  const setTimezone = (newTimezone: string) => {
    console.warn('Timezone is configured via Docker Compose environment variable (VITE_TIMEZONE) and cannot be changed at runtime');
  };

  const formatDateTime = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
        ...options
      };
      
      return date.toLocaleString('zh-CN', defaultOptions);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const formatDate = (dateString: string): string => {
    return formatDateTime(dateString, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatTime = (dateString: string): string => {
    return formatDateTime(dateString, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <TimezoneContext.Provider value={{ 
      timezone, 
      setTimezone, 
      formatDateTime, 
      formatDate, 
      formatTime 
    }}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = () => {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};