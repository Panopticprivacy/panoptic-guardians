import React, { useState } from 'react';
import { GitBranch, Database, Filter, Clock, MapPin, ArrowRight, Eye, Download } from 'lucide-react';
import { MedicalCard } from '@/components/ui/medical-card';
import { MedicalBadge } from '@/components/ui/medical-badge';
import { MedicalButton } from '@/components/ui/medical-button';
import { MedicalInput } from '@/components/ui/medical-input';
import { MedicalSelect } from '@/components/ui/medical-select';

interface LineageNode {
  id: string;
  name: string;
  type: 'source' | 'transformation' | 'storage' | 'endpoint';
  dataTypes: string[];
  timestamp: string;
  transformations?: string[];
  piiLevel: 'high' | 'medium' | 'low' | 'none';
}

interface LineagePath {
  id: string;
  nodes: LineageNode[];
  dataSubject: string;
  purpose: string;
  legalBasis: string;
  retentionPeriod: string;
  status: 'active' | 'archived' | 'deleted';
}

const mockLineagePaths: LineagePath[] = [
  {
    id: 'path-001',
    dataSubject: 'Patient John Doe (ID: ***-1234)',
    purpose: 'Medical Coding & Claims Processing',
    legalBasis: 'Healthcare Operations (HIPAA)',
    retentionPeriod: '7 years',
    status: 'active',
    nodes: [
      {
        id: 'epic-source',
        name: 'Epic FHIR Endpoint',
        type: 'source',
        dataTypes: ['Demographics', 'Clinical Notes', 'Diagnoses'],
        timestamp: '2024-01-20T08:00:00Z',
        piiLevel: 'high'
      },
      {
        id: 'phi-masker',
        name: 'PHI Masking Service',
        type: 'transformation',
        dataTypes: ['Masked Demographics', 'De-identified Notes'],
        timestamp: '2024-01-20T08:01:00Z',
        transformations: ['Remove direct identifiers', 'Date shifting', 'Generalize locations'],
        piiLevel: 'medium'
      },
      {
        id: 'panoptic-agent',
        name: 'Panoptic Coding Agent',
        type: 'transformation',
        dataTypes: ['ICD-10 Codes', 'CPT Codes', 'Coding Confidence'],
        timestamp: '2024-01-20T08:02:00Z',
        transformations: ['Clinical NLP', 'Code mapping', 'Validation rules'],
        piiLevel: 'low'
      },
      {
        id: 'claims-db',
        name: 'Claims Database',
        type: 'storage',
        dataTypes: ['Processed Claims', 'Coding Results'],
        timestamp: '2024-01-20T08:03:00Z',
        piiLevel: 'low'
      }
    ]
  },
  {
    id: 'path-002',
    dataSubject: 'Patient Jane Smith (ID: ***-5678)',
    purpose: 'Quality Reporting',
    legalBasis: 'Public Health (CMS Requirements)',
    retentionPeriod: '3 years',
    status: 'active',
    nodes: [
      {
        id: 'cerner-source',
        name: 'Cerner EHR',
        type: 'source',
        dataTypes: ['Lab Results', 'Medications', 'Procedures'],
        timestamp: '2024-01-20T09:00:00Z',
        piiLevel: 'high'
      },
      {
        id: 'anonymizer',
        name: 'Data Anonymization Service',
        type: 'transformation',
        dataTypes: ['Anonymous Lab Results', 'Medication Classes'],
        timestamp: '2024-01-20T09:01:00Z',
        transformations: ['K-anonymity', 'L-diversity', 'Statistical disclosure control'],
        piiLevel: 'none'
      },
      {
        id: 'quality-warehouse',
        name: 'Quality Reporting Warehouse',
        type: 'storage',
        dataTypes: ['Aggregated Metrics', 'Quality Indicators'],
        timestamp: '2024-01-20T09:02:00Z',
        piiLevel: 'none'
      }
    ]
  }
];

export const DataLineageTracker: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPII, setFilterPII] = useState('all');

  const filteredPaths = mockLineagePaths.filter(path => {
    const matchesSearch = path.dataSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         path.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || path.status === filterStatus;
    const matchesPII = filterPII === 'all' || path.nodes.some(node => node.piiLevel === filterPII);
    
    return matchesSearch && matchesStatus && matchesPII;
  });

  const getPiiColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-medical-error text-medical-error-foreground';
      case 'medium': return 'bg-medical-warning text-medical-warning-foreground';
      case 'low': return 'bg-medical-info text-medical-info-foreground';
      case 'none': return 'bg-medical-success text-medical-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'source': return Database;
      case 'transformation': return Filter;
      case 'storage': return Database;
      case 'endpoint': return MapPin;
      default: return Database;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <MedicalCard title="Data Lineage Tracker" icon={GitBranch}>
        <div className="flex flex-wrap gap-4 mb-6">
          <MedicalInput
            placeholder="Search by data subject or purpose..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="flex-1 min-w-[200px]"
          />
          <MedicalSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
              { value: 'deleted', label: 'Deleted' }
            ]}
          />
          <MedicalSelect
            value={filterPII}
            onChange={setFilterPII}
            options={[
              { value: 'all', label: 'All PII Levels' },
              { value: 'high', label: 'High PII' },
              { value: 'medium', label: 'Medium PII' },
              { value: 'low', label: 'Low PII' },
              { value: 'none', label: 'No PII' }
            ]}
          />
        </div>

        {/* Lineage Paths List */}
        <div className="space-y-3">
          {filteredPaths.map(path => (
            <div
              key={path.id}
              className={`border border-border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                selectedPath === path.id ? 'bg-primary/5 border-primary' : 'bg-background hover:bg-muted/30'
              }`}
              onClick={() => setSelectedPath(selectedPath === path.id ? null : path.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">{path.dataSubject}</h4>
                  <p className="text-sm text-muted-foreground">{path.purpose}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MedicalBadge 
                    variant={path.status === 'active' ? 'success' : path.status === 'archived' ? 'warning' : 'error'}
                  >
                    {path.status}
                  </MedicalBadge>
                  <MedicalButton variant="ghost" icon={Eye}>
                    View
                  </MedicalButton>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                <div>
                  <span className="font-medium">Legal Basis:</span> {path.legalBasis}
                </div>
                <div>
                  <span className="font-medium">Retention:</span> {path.retentionPeriod}
                </div>
              </div>

              {/* Node Flow Preview */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {path.nodes.map((node, index) => {
                  const Icon = getNodeIcon(node.type);
                  return (
                    <React.Fragment key={node.id}>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <div className={`p-2 rounded-lg border ${getPiiColor(node.piiLevel)}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="text-xs">
                          <div className="font-medium">{node.name}</div>
                          <div className="text-muted-foreground capitalize">{node.piiLevel} PII</div>
                        </div>
                      </div>
                      {index < path.nodes.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </MedicalCard>

      {/* Detailed Lineage View */}
      {selectedPath && (
        <MedicalCard title="Detailed Data Lineage" icon={GitBranch}>
          {(() => {
            const path = mockLineagePaths.find(p => p.id === selectedPath);
            if (!path) return null;

            return (
              <div className="space-y-6">
                {/* Path Metadata */}
                <div className="bg-muted/20 border border-border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Data Subject</h4>
                      <p className="text-sm text-muted-foreground">{path.dataSubject}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Processing Purpose</h4>
                      <p className="text-sm text-muted-foreground">{path.purpose}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Legal Basis</h4>
                      <p className="text-sm text-muted-foreground">{path.legalBasis}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Retention Period</h4>
                      <p className="text-sm text-muted-foreground">{path.retentionPeriod}</p>
                    </div>
                  </div>
                </div>

                {/* Lineage Flow */}
                <div className="space-y-4">
                  {path.nodes.map((node, index) => {
                    const Icon = getNodeIcon(node.type);
                    return (
                      <div key={node.id} className="relative">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`p-3 rounded-lg border ${getPiiColor(node.piiLevel)}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            {index < path.nodes.length - 1 && (
                              <div className="w-px h-8 bg-border mt-2" />
                            )}
                          </div>
                          
                          <div className="flex-1 bg-muted/20 border border-border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-foreground">{node.name}</h4>
                                <p className="text-sm text-muted-foreground capitalize">{node.type}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <MedicalBadge variant="default" className={getPiiColor(node.piiLevel)}>
                                  {node.piiLevel} PII
                                </MedicalBadge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(node.timestamp).toLocaleString()}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">Data Types:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {node.dataTypes.map(type => (
                                    <MedicalBadge key={type} variant="default">
                                      {type}
                                    </MedicalBadge>
                                  ))}
                                </div>
                              </div>

                              {node.transformations && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">Transformations:</span>
                                  <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                                    {node.transformations.map((transform, i) => (
                                      <li key={i}>{transform}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Export Options */}
                <div className="flex items-center justify-end gap-2">
                  <MedicalButton variant="ghost" icon={Download}>
                    Export Lineage Report
                  </MedicalButton>
                  <MedicalButton variant="ghost" icon={Eye}>
                    Generate Audit Trail
                  </MedicalButton>
                </div>
              </div>
            );
          })()}
        </MedicalCard>
      )}
    </div>
  );
};