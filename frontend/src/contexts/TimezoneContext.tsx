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
  const [timezone, setTimezoneState] = useState<string>(() => {
    // Try to get saved timezone, fallback to browser timezone, then to Asia/Shanghai
    const saved = localStorage.getItem('timezone');
    if (saved) return saved;
    
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Asia/Shanghai';
    }
  });

  useEffect(() => {
    localStorage.setItem('timezone', timezone);
  }, [timezone]);

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
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