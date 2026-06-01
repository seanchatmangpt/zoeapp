import { useState, useCallback, useRef } from 'react';
import { generateBlake3ReceiptHash } from '../../../lib/crypto/receipts';

export type SensorData = {
  eegAlpha: number; // 8-12 Hz
  eegBeta: number;  // 12-30 Hz
  eegGamma: number; // >30 Hz
  fnirsO2: number;  // Oxygenation
  timestamp: number;
};

export type IntentCommand = 'NONE' | 'SCROLL_UP' | 'SCROLL_DOWN' | 'SELECT' | 'BACK';

export interface AlarmEvent {
  intent: IntentCommand;
  stress: number;
  fatigue: number;
  cognitiveLoad: number;
  timestamp: number;
  receipt: string;
}

export interface UseNeuralIntentConfig {
  alphaThreshold?: number;
  betaThreshold?: number;
  gammaThreshold?: number;
  fnirsThreshold?: number;
  smoothingWindow?: number;
  artifactThreshold?: number;
  stressThreshold?: number;
  fatigueThreshold?: number;
  extremeStressThreshold?: number;
  extremeFatigueThreshold?: number;
  onAlarm?: (event: AlarmEvent) => void;
}

export function useNeuralIntent(config: UseNeuralIntentConfig = {}) {
  const {
    alphaThreshold = 0.6,
    betaThreshold = 0.7,
    gammaThreshold = 0.8,
    fnirsThreshold = 0.5,
    smoothingWindow = 5,
    artifactThreshold = 2.0, // Values above this are considered artifacts
    stressThreshold = 0.6,
    fatigueThreshold = 0.6,
    extremeStressThreshold = 0.8,
    extremeFatigueThreshold = 0.8,
    onAlarm,
  } = config;

  const [intent, setIntent] = useState<IntentCommand>('NONE');
  const [stress, setStress] = useState<number>(0);
  const [fatigue, setFatigue] = useState<number>(0);
  const [cognitiveLoad, setCognitiveLoad] = useState<number>(0);
  
  const [layoutDensity, setLayoutDensity] = useState<'compact' | 'comfortable' | 'spacious'>('compact');
  const [parallaxIntensity, setParallaxIntensity] = useState<number>(15);

  const [isConfirmationRequired, setIsConfirmationRequired] = useState<boolean>(false);
  const [pendingIntent, setPendingIntent] = useState<IntentCommand>('NONE');
  const [quarantinedIntent, setQuarantinedIntent] = useState<IntentCommand>('NONE');
  const [alarmActive, setAlarmActive] = useState<boolean>(false);
  const [latestReceipt, setLatestReceipt] = useState<string>('genesis-bci-receipt-hash');

  const buffer = useRef<SensorData[]>([]);
  const prevReceipt = useRef<string>('genesis-bci-receipt-hash');

  const processSignal = useCallback((data: SensorData) => {
    // Artifact Rejection
    if (
      data.eegAlpha > artifactThreshold ||
      data.eegBeta > artifactThreshold ||
      data.eegGamma > artifactThreshold
    ) {
      // Artifact detected, ignore this sample
      return;
    }

    buffer.current.push(data);
    if (buffer.current.length > smoothingWindow) {
      buffer.current.shift();
    }

    if (buffer.current.length < smoothingWindow) {
      return;
    }

    // Smoothing (Moving Average)
    let avgAlpha = 0;
    let avgBeta = 0;
    let avgGamma = 0;
    let avgFnirs = 0;

    for (const sample of buffer.current) {
      avgAlpha += sample.eegAlpha;
      avgBeta += sample.eegBeta;
      avgGamma += sample.eegGamma;
      avgFnirs += sample.fnirsO2;
    }

    avgAlpha /= smoothingWindow;
    avgBeta /= smoothingWindow;
    avgGamma /= smoothingWindow;
    avgFnirs /= smoothingWindow;

    // High-fidelity cognitive load simulation telemetry model
    const computedStress = Math.min(1, Math.max(0, avgBeta * 0.5 + avgGamma * 0.3 + Math.max(0, 1 - avgAlpha) * 0.2));
    const computedFatigue = Math.min(1, Math.max(0, avgAlpha * 0.6 + Math.max(0, 1 - avgFnirs) * 0.4));
    const computedCognitiveLoad = Math.min(1, Math.max(0, avgBeta * 0.4 + avgGamma * 0.4 + avgFnirs * 0.2));

    setStress(computedStress);
    setFatigue(computedFatigue);
    setCognitiveLoad(computedCognitiveLoad);

    // Layout Density and Parallax Intensity adjustments
    let computedDensity: 'compact' | 'comfortable' | 'spacious' = 'compact';
    let computedParallax = 15;

    if (computedStress >= extremeStressThreshold || computedFatigue >= extremeFatigueThreshold) {
      computedDensity = 'spacious';
      computedParallax = 2;
    } else if (computedStress >= stressThreshold || computedFatigue >= fatigueThreshold) {
      computedDensity = 'comfortable';
      computedParallax = 8;
    }

    setLayoutDensity(computedDensity);
    setParallaxIntensity(computedParallax);

    // If confirmation or alarm is already active, quarantine/hold new intents
    if (isConfirmationRequired || alarmActive) {
      return;
    }

    // Translation to Semantic Navigation Commands
    let newIntent: IntentCommand = 'NONE';

    // High Gamma & fNIRS typically implies strong focus/selection
    if (avgGamma > gammaThreshold && avgFnirs > fnirsThreshold) {
      newIntent = 'SELECT';
    } 
    // High Beta implies active thinking, mapped to scrolling down
    else if (avgBeta > betaThreshold) {
      newIntent = 'SCROLL_DOWN';
    }
    // High Alpha implies relaxation, mapped to scrolling up
    else if (avgAlpha > alphaThreshold) {
      newIntent = 'SCROLL_UP';
    }
    // Very low activation mapped to going back (disengagement)
    else if (avgAlpha < 0.2 && avgBeta < 0.2 && avgGamma < 0.2 && avgFnirs < 0.2) {
      newIntent = 'BACK';
    }

    if (newIntent !== 'NONE') {
      // 3-tier confirmation gate
      if (computedStress >= extremeStressThreshold || computedFatigue >= extremeFatigueThreshold) {
        setQuarantinedIntent(newIntent);
        setAlarmActive(true);

        const newReceipt = generateBlake3ReceiptHash(prevReceipt.current, {
          intent: newIntent,
          stress: computedStress,
          fatigue: computedFatigue,
          cognitiveLoad: computedCognitiveLoad,
          timestamp: Date.now(),
          actionState: 'quarantined_alarm'
        });
        prevReceipt.current = newReceipt;
        setLatestReceipt(newReceipt);

        if (onAlarm) {
          onAlarm({
            intent: newIntent,
            stress: computedStress,
            fatigue: computedFatigue,
            cognitiveLoad: computedCognitiveLoad,
            timestamp: Date.now(),
            receipt: newReceipt,
          });
        }
      } else if (computedStress >= stressThreshold || computedFatigue >= fatigueThreshold) {
        setPendingIntent(newIntent);
        setIsConfirmationRequired(true);

        const newReceipt = generateBlake3ReceiptHash(prevReceipt.current, {
          intent: newIntent,
          stress: computedStress,
          fatigue: computedFatigue,
          cognitiveLoad: computedCognitiveLoad,
          timestamp: Date.now(),
          actionState: 'pending_confirmation'
        });
        prevReceipt.current = newReceipt;
        setLatestReceipt(newReceipt);
      } else {
        setIntent(newIntent);

        const newReceipt = generateBlake3ReceiptHash(prevReceipt.current, {
          intent: newIntent,
          stress: computedStress,
          fatigue: computedFatigue,
          cognitiveLoad: computedCognitiveLoad,
          timestamp: Date.now(),
          actionState: 'executed'
        });
        prevReceipt.current = newReceipt;
        setLatestReceipt(newReceipt);
      }
    } else {
      setIntent('NONE');
    }
  }, [
    alphaThreshold,
    betaThreshold,
    gammaThreshold,
    fnirsThreshold,
    smoothingWindow,
    artifactThreshold,
    stressThreshold,
    fatigueThreshold,
    extremeStressThreshold,
    extremeFatigueThreshold,
    onAlarm,
    isConfirmationRequired,
    alarmActive
  ]);

  // Expose a way to inject simulated data
  const injectData = useCallback((data: SensorData) => {
    processSignal(data);
  }, [processSignal]);

  const confirmIntent = useCallback(() => {
    if (pendingIntent !== 'NONE') {
      setIntent(pendingIntent);
      
      const newReceipt = generateBlake3ReceiptHash(prevReceipt.current, {
        intent: pendingIntent,
        stress,
        fatigue,
        cognitiveLoad,
        timestamp: Date.now(),
        actionState: 'confirmed'
      });
      prevReceipt.current = newReceipt;
      setLatestReceipt(newReceipt);
      
      setPendingIntent('NONE');
      setIsConfirmationRequired(false);
    }
  }, [pendingIntent, stress, fatigue, cognitiveLoad]);

  const rejectIntent = useCallback(() => {
    if (pendingIntent !== 'NONE') {
      const newReceipt = generateBlake3ReceiptHash(prevReceipt.current, {
        intent: pendingIntent,
        stress,
        fatigue,
        cognitiveLoad,
        timestamp: Date.now(),
        actionState: 'rejected'
      });
      prevReceipt.current = newReceipt;
      setLatestReceipt(newReceipt);

      setPendingIntent('NONE');
      setIsConfirmationRequired(false);
    }
  }, [pendingIntent, stress, fatigue, cognitiveLoad]);

  // Reset intent manually
  const resetIntent = useCallback(() => {
    setIntent('NONE');
    setPendingIntent('NONE');
    setIsConfirmationRequired(false);
    setQuarantinedIntent('NONE');
    setAlarmActive(false);
    buffer.current = [];
    setStress(0);
    setFatigue(0);
    setCognitiveLoad(0);
    setLayoutDensity('compact');
    setParallaxIntensity(15);
  }, []);

  return {
    intent,
    stress,
    fatigue,
    cognitiveLoad,
    layoutDensity,
    parallaxIntensity,
    isConfirmationRequired,
    pendingIntent,
    quarantinedIntent,
    alarmActive,
    latestReceipt,
    injectData,
    confirmIntent,
    rejectIntent,
    resetIntent,
  };
}