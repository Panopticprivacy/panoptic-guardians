import React, { useState, useEffect } from 'react';
import { Database, Server, Shield, Users, ArrowRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { MedicalCard } from '@/components/ui/medical-card';
import { MedicalBadge } from '@/components/ui/medical-badge';

interface DataNode {
  id: string;
  type: 'source' | 'processor' | 'storage' | 'endpoint';
  name: string;
  piiLevel: 'high' | 'medium' | 'low' | 'none';
  status: 'compliant' | 'warning' | 'violation';
  x: number;
  y: number;
}

interface DataFlow {
  from: string;
  to: string;
  dataTypes: string[];
  encryption: boolean;
  compliant: boolean;
}

const mockNodes: DataNode[] = [
  { id: 'epic', type: 'source', name: 'Epic FHIR', piiLevel: 'high', status: 'compliant', x: 50, y: 200 },
  { id: 'cerner', type: 'source', name: 'Cerner EHR', piiLevel: 'high', status: 'compliant', x: 50, y: 300 },
  { id: 'agent', type: 'processor', name: 'Panoptic Agent', piiLevel: 'medium', status: 'compliant', x: 300, y: 250 },
  { id: 'warehouse', type: 'storage', name: 'Snowflake DW', piiLevel: 'low', status: 'compliant', x: 550, y: 200 },
  { id: 'api', type: 'endpoint', name: 'Patient API', piiLevel: 'medium', status: 'warning', x: 550, y: 300 },
];

const mockFlows: DataFlow[] = [
  { from: 'epic', to: 'agent', dataTypes: ['PHI', 'Demographics'], encryption: true, compliant: true },
  { from: 'cerner', to: 'agent', dataTypes: ['PHI', 'Clinical Notes'], encryption: true, compliant: true },
  { from: 'agent', to: 'warehouse', dataTypes: ['De-identified'], encryption: true, compliant: true },
  { from: 'agent', to: 'api', dataTypes: ['Processed Data'], encryption: false, compliant: false },
];

export const DataFlowMap: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showFlows, setShowFlows] = useState(true);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'source': return Database;
      case 'processor': return Server;
      case 'storage': return Database;
      case 'endpoint': return Users;
      default: return Server;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-medical-success';
      case 'warning': return 'text-medical-warning';
      case 'violation': return 'text-medical-error';
      default: return 'text-muted-foreground';
    }
  };

  const getPiiColor = (level: string) => {
    switch (level) {
      case 'high': return 'border-medical-error bg-medical-error/10';
      case 'medium': return 'border-medical-warning bg-medical-warning/10';
      case 'low': return 'border-medical-info bg-medical-info/10';
      case 'none': return 'border-medical-success bg-medical-success/10';
      default: return 'border-border bg-background';
    }
  };

  return (
    <MedicalCard title="Data Flow Visualization" icon={Server}>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showFlows}
                onChange={(e) => setShowFlows(e.target.checked)}
                className="rounded border-border"
              />
              Show Data Flows
            </label>
          </div>
          <div className="flex items-center gap-2">
            <MedicalBadge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Compliant
            </MedicalBadge>
            <MedicalBadge variant="warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Warning
            </MedicalBadge>
            <MedicalBadge variant="error">
              <XCircle className="w-3 h-3 mr-1" />
              Violation
            </MedicalBadge>
          </div>
        </div>

        {/* Flow Map */}
        <div className="relative bg-card border border-border rounded-lg h-96 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full">
            {/* Flows */}
            {showFlows && mockFlows.map((flow, idx) => {
              const fromNode = mockNodes.find(n => n.id === flow.from);
              const toNode = mockNodes.find(n => n.id === flow.to);
              if (!fromNode || !toNode) return null;
              
              return (
                <g key={idx}>
                  <line
                    x1={fromNode.x + 40}
                    y1={fromNode.y + 20}
                    x2={toNode.x}
                    y2={toNode.y + 20}
                    stroke={flow.compliant ? 'hsl(var(--medical-success))' : 'hsl(var(--medical-error))'}
                    strokeWidth="2"
                    strokeDasharray={flow.encryption ? "0" : "5,5"}
                  />
                  <ArrowRight
                    className="w-4 h-4 fill-current"
                    style={{
                      position: 'absolute',
                      left: (fromNode.x + toNode.x) / 2 + 20,
                      top: fromNode.y + 12,
                      color: flow.compliant ? 'hsl(var(--medical-success))' : 'hsl(var(--medical-error))'
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {mockNodes.map((node) => {
            const Icon = getNodeIcon(node.type);
            return (
              <div
                key={node.id}
                className={`absolute cursor-pointer transition-all duration-200 ${getPiiColor(node.piiLevel)} ${
                  selectedNode === node.id ? 'scale-110 shadow-lg' : 'hover:scale-105'
                } border rounded-lg p-3 bg-background`}
                style={{ left: node.x, top: node.y, width: '120px' }}
                onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${getStatusColor(node.status)}`} />
                  <span className="text-xs font-medium truncate">{node.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground capitalize">{node.piiLevel} PII</span>
                  <div className={`w-2 h-2 rounded-full ${
                    node.status === 'compliant' ? 'bg-medical-success' :
                    node.status === 'warning' ? 'bg-medical-warning' : 'bg-medical-error'
                  }`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="bg-muted/30 border border-border rounded-lg p-3">
            <h4 className="font-medium mb-2">
              {mockNodes.find(n => n.id === selectedNode)?.name} Details
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-2 capitalize">{mockNodes.find(n => n.id === selectedNode)?.type}</span>
              </div>
              <div>
                <span className="text-muted-foreground">PII Level:</span>
                <span className="ml-2 capitalize">{mockNodes.find(n => n.id === selectedNode)?.piiLevel}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className={`ml-2 capitalize ${getStatusColor(mockNodes.find(n => n.id === selectedNode)?.status || 'compliant')}`}>
                  {mockNodes.find(n => n.id === selectedNode)?.status}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Connected Flows:</span>
                <span className="ml-2">{mockFlows.filter(f => f.from === selectedNode || f.to === selectedNode).length}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </MedicalCard>
  );
};