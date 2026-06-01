import { useState, useEffect } from 'react';

export interface AalstEvent {
  id: string;
  type: 'PETRI_NET' | 'ALIGNMENT' | 'OCEL_TELEMETRY' | 'CONVERSATION_FEED';
  payload: string;
  timestamp: number;
}

export function useAalstStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<AalstEvent[]>([]);

  useEffect(() => {
    setIsConnected(true);
    let eventId = 0;
    
    const interval = setInterval(() => {
      eventId++;
      const types: AalstEvent['type'][] = ['PETRI_NET', 'ALIGNMENT', 'OCEL_TELEMETRY', 'CONVERSATION_FEED'];
      const type = types[eventId % types.length];
      
      const newEvent: AalstEvent = {
        id: eventId.toString(),
        type,
        payload: `Sample payload for ${type} ${eventId}`,
        timestamp: Date.now(),
      };
      
      setLogs((prev) => [newEvent, ...prev].slice(0, 50));
    }, 1000);

    return () => {
      clearInterval(interval);
      setIsConnected(false);
    };
  }, []);

  return { isConnected, logs };
}
