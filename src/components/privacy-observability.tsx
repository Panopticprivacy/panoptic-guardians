import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Eye, 
  Lock, 
  Shield, 
  TrendingUp, 
  Users,
  Zap
} from 'lucide-react';
import { MedicalCard } from '@/components/ui/medical-card';
import { MedicalBadge } from '@/components/ui/medical-badge';
import { MedicalButton } from '@/components/ui/medical-button';

interface PrivacyMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'good' | 'warning' | 'critical';
  threshold: number;
}

interface PrivacyEvent {
  id: string;
  timestamp: string;
  type: 'access' | 'processing' | 'breach' | 'compliance';
  severity: 'info' | 'warning' | 'error';
  message: string;
  source: string;
}

const mockMetrics: PrivacyMetric[] = [
  { id: 'phi_exposure', name: 'PHI Exposure Risk', value: 2.3, unit: '%', trend: 'down', status: 'good', threshold: 5.0 },
  { id: 'pii_processing', name: 'PII Processing Rate', value: 1247, unit: '/min', trend: 'up', status: 'good', threshold: 2000 },
  { id: 'consent_violations', name: 'Consent Violations', value: 0, unit: 'incidents', trend: 'stable', status: 'good', threshold: 1 },
  { id: 'data_retention', name: 'Retention Compliance', value: 98.7, unit: '%', trend: 'up', status: 'good', threshold: 95.0 },
  { id: 'encryption_coverage', name: 'Encryption Coverage', value: 99.2, unit: '%', trend: 'stable', status: 'good', threshold: 98.0 },
  { id: 'access_anomalies', name: 'Access Anomalies', value: 3, unit: 'alerts', trend: 'down', status: 'warning', threshold: 5 },
];

const mockEvents: PrivacyEvent[] = [
  { id: '1', timestamp: '2024-01-20T10:30:00Z', type: 'processing', severity: 'info', message: 'PHI batch processing completed successfully', source: 'Panoptic Agent' },
  { id: '2', timestamp: '2024-01-20T10:25:00Z', type: 'access', severity: 'warning', message: 'Unusual access pattern detected from IP 192.168.1.100', source: 'Access Monitor' },
  { id: '3', timestamp: '2024-01-20T10:20:00Z', type: 'compliance', severity: 'info', message: 'HIPAA audit trail generated for patient ID ***-4567', source: 'Audit System' },
  { id: '4', timestamp: '2024-01-20T10:15:00Z', type: 'processing', severity: 'info', message: 'PII de-identification pipeline processed 150 records', source: 'Data Pipeline' },
];

export const PrivacyObservability: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [realTimeEvents, setRealTimeEvents] = useState(mockEvents);

  useEffect(() => {
    // Simulate real-time event updates
    const interval = setInterval(() => {
      const newEvent: PrivacyEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        type: ['access', 'processing', 'compliance'][Math.floor(Math.random() * 3)] as any,
        severity: ['info', 'warning'][Math.floor(Math.random() * 2)] as any,
        message: 'Real-time privacy event detected',
        source: 'Live Monitor'
      };
      setRealTimeEvents(prev => [newEvent, ...prev.slice(0, 9)]);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-medical-success';
      case 'warning': return 'text-medical-warning';
      case 'critical': return 'text-medical-error';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-medical-success" />;
      case 'down': return <TrendingUp className="w-3 h-3 rotate-180 text-medical-error" />;
      default: return <div className="w-3 h-3 bg-muted-foreground rounded-full" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'text-medical-info';
      case 'warning': return 'text-medical-warning';
      case 'error': return 'text-medical-error';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Privacy Metrics Overview */}
      <MedicalCard title="Privacy Metrics Dashboard" icon={Shield}>
        <div className="space-y-4">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            {['1h', '6h', '24h', '7d', '30d'].map(time => (
              <MedicalButton
                key={time}
                variant={selectedTimeframe === time ? 'primary' : 'ghost'}
                onClick={() => setSelectedTimeframe(time)}
              >
                {time}
              </MedicalButton>
            ))}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockMetrics.map(metric => (
              <div key={metric.id} className="bg-muted/20 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-foreground">{metric.name}</h4>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-bold ${getMetricStatusColor(metric.status)}`}>
                    {metric.value}
                  </span>
                  <span className="text-sm text-muted-foreground">{metric.unit}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Threshold: {metric.threshold}{metric.unit}
                </div>
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      metric.status === 'good' ? 'bg-medical-success' :
                      metric.status === 'warning' ? 'bg-medical-warning' : 'bg-medical-error'
                    }`}
                    style={{ 
                      width: `${Math.min(100, (metric.value / metric.threshold) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </MedicalCard>

      {/* Real-time Privacy Events */}
      <MedicalCard title="Real-time Privacy Events" icon={Activity}>
        <div className="space-y-3">
          {realTimeEvents.map(event => (
            <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/20 border border-border rounded-lg">
              <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(event.severity)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <MedicalBadge 
                    variant={event.type === 'breach' ? 'error' : event.type === 'access' ? 'warning' : 'default'}
                  >
                    {event.type}
                  </MedicalBadge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{event.source}</span>
                </div>
                <p className="text-sm text-foreground">{event.message}</p>
              </div>
              <MedicalButton variant="ghost" icon={Eye}>
                Details
              </MedicalButton>
            </div>
          ))}
        </div>
      </MedicalCard>

      {/* Privacy Impact Assessment */}
      <MedicalCard title="Privacy Impact Assessment" icon={AlertTriangle}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Data Processing Impact</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>PHI Processing Risk</span>
                <MedicalBadge variant="success">Low</MedicalBadge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Cross-border Transfers</span>
                <MedicalBadge variant="default">None</MedicalBadge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Third-party Sharing</span>
                <MedicalBadge variant="warning">Limited</MedicalBadge>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Compliance Status</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>HIPAA Compliance</span>
                <CheckCircle className="w-4 h-4 text-medical-success" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>GDPR Compliance</span>
                <CheckCircle className="w-4 h-4 text-medical-success" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>CCPA Compliance</span>
                <CheckCircle className="w-4 h-4 text-medical-success" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Risk Mitigation</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Encryption in Transit</span>
                <Lock className="w-4 h-4 text-medical-success" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Data Anonymization</span>
                <Shield className="w-4 h-4 text-medical-success" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Access Controls</span>
                <Users className="w-4 h-4 text-medical-success" />
              </div>
            </div>
          </div>
        </div>
      </MedicalCard>
    </div>
  );
};