import React, { useEffect, useMemo, useState } from "react";
import {
  Shield,
  Rocket,
  FileText,
  Settings,
  Globe,
  Lock,
  BookCheck,
  Eye,
  Download,
  ClipboardList,
  Bot,
  KeyRound,
  ServerCog,
  ScanLine,
  ClipboardCheck,
  FileCode2,
  Info,
  Activity,
  GitBranch,
  Database,
} from "lucide-react";
import { MedicalCard } from '@/components/ui/medical-card';
import { MedicalBadge } from '@/components/ui/medical-badge';
import { MedicalButton } from '@/components/ui/medical-button';
import { MedicalToggle } from '@/components/ui/medical-toggle';
import { MedicalInput } from '@/components/ui/medical-input';
import { MedicalSelect } from '@/components/ui/medical-select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { DataFlowMap } from '@/components/data-flow-map';
import { PrivacyObservability } from '@/components/privacy-observability';
import { DataLineageTracker } from '@/components/data-lineage-tracker';

// Demo data & helpers
const connectorCatalog = [
  { name: "Epic (FHIR)", type: "EHR", status: "Connected", pii: "PHI", region: "us-east-1" },
  { name: "Cerner", type: "EHR", status: "Ready", pii: "PHI", region: "us-west-2" },
  { name: "Snowflake", type: "Warehouse", status: "Connected", pii: "De-identified", region: "eu-central-1" },
];

const defaultPolicies = {
  hipaa: true,
  gdpr: true,
  ccpa: true,
  hitrust: true,
  phiMasking: true,
  piiScan: true,
  dsarReady: true,
  auditLogs: true,
  egressBlock: true,
  promptLogging: false,
  retentionDays: 30,
};

// Extend presets with Medical Coding
const applyPreset = (preset: string, setAgent: Function, setPolicies: Function) => {
  if (preset === "banking") {
    setAgent((a: any) => ({ ...a, purpose: "GLBA-safe KYC/AML & case triage" }));
    setPolicies((p: any) => ({ ...p, hipaa: false, hitrust: false, gdpr: true, ccpa: true, egressBlock: true, retentionDays: 30 }));
  } else if (preset === "healthcare") {
    setAgent((a: any) => ({ ...a, purpose: "HIPAA-safe medical coding & claims" }));
    setPolicies((p: any) => ({ ...p, hipaa: true, hitrust: true, gdpr: true, ccpa: true, egressBlock: true, retentionDays: 30 }));
  } else if (preset === "medicalCoding") {
    setAgent((a: any) => ({ ...a, purpose: "HIPAA-safe ICD-10/CPT coding automation" }));
    setPolicies((p: any) => ({ ...p, hipaa: true, hitrust: true, gdpr: true, ccpa: true, phiMasking: true, piiScan: true, auditLogs: true, egressBlock: true, retentionDays: 60 }));
  }
};

export default function MedicalDashboard() {
  const [env, setEnv] = useState("dev");
  const [agent, setAgent] = useState({
    name: "Panoptic-Coder-01",
    purpose: "HIPAA-safe medical coding & claims",
    model: "gpt-4.1-mini",
    maxTokens: 2048,
    temperature: 0.2,
  });
  const [policies, setPolicies] = useState(defaultPolicies);
  const [secrets, setSecrets] = useState({ openaiKey: "", snowflakeKey: "", jwtSigningKey: "" });
  const [connectors] = useState(connectorCatalog);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState('deployment');

  // Toolbox, prompts, policy-as-code
  const [tools, setTools] = useState([
    { key: "icd10_lookup", label: "ICD-10 Lookup", enabled: true },
    { key: "cpt_validator", label: "CPT Validator", enabled: true },
    { key: "claim_scrubber", label: "Claim Scrubber (NCCI edits)", enabled: true },
    { key: "phi_redactor", label: "PHI Redactor", enabled: true },
    { key: "payer_rules", label: "Payer Rules Pack (CMS)", enabled: false },
  ]);

  const [promptTemplates, setPromptTemplates] = useState([
    { name: "Triage to Codes", body: "From clinical note, extract diagnoses and procedures; return ICD-10 and CPT with rationales." },
    { name: "Denial Appeal", body: "Draft appeal letter citing medical necessity and coding guidelines for denied CPT/ICD combo." },
  ]);

  const [policyCode, setPolicyCode] = useState(`package panoptic.guardrails

# Example CEL/Rego-style rules
allow_model_call {
  input.env != "prod"  # always allow in non-prod
}
allow_model_call {
  input.env == "prod"
  not input.contains_phi  # block if PHI without masking
}
# Block outbound web in prod
deny_egress { input.env == "prod"; input.destination == "internet" }
`);

  const deploymentSpec = useMemo(
    () => ({
      apiVersion: "panoptic.ai/v1",
      kind: "AgentDeployment",
      metadata: { name: agent.name, env },
      spec: {
        description: agent.purpose,
        model: agent.model,
        parameters: { max_tokens: agent.maxTokens, temperature: agent.temperature },
        guardrails: {
          compliance: {
            HIPAA: policies.hipaa,
            HITRUST: policies.hitrust,
            GDPR: policies.gdpr,
            CCPA: policies.ccpa,
          },
          privacy: {
            phi_masking: policies.phiMasking,
            pii_scanner: policies.piiScan,
            block_external_egress: policies.egressBlock,
            prompt_logging: policies.promptLogging,
            retention_days: policies.retentionDays,
          },
          auditing: { structured_logs: policies.auditLogs, dsar_ready: policies.dsarReady },
        },
        runtime: {
          network: { outbound: policies.egressBlock ? ["allow:internal"] : ["allow:internal", "allow:web"] },
          data_residency: env === "prod" ? "us-east-1" : "us-west-2",
        },
        connectors: connectors.map((c) => ({ name: c.name, type: c.type, region: c.region, pii: c.pii })),
        tools: tools.filter((t) => t.enabled).map((t) => t.key),
        prompts: promptTemplates,
        policy_code: policyCode,
        secrets: {
          OPENAI_API_KEY: secrets.openaiKey ? "${OPENAI_API_KEY}" : "",
          SNOWFLAKE_KEY: secrets.snowflakeKey ? "${SNOWFLAKE_KEY}" : "",
          JWT_SIGNING_KEY: secrets.jwtSigningKey ? "${JWT_SIGNING_KEY}" : "",
        },
      },
    }),
    [agent, policies, connectors, env, secrets, tools, promptTemplates, policyCode]
  );

  // Inline Tests (run-time checks)
  const [testResults, setTestResults] = useState<Array<{name: string, ok: boolean, err?: string}>>([]);
  useEffect(() => {
    const results: Array<{name: string, ok: boolean, err?: string}> = [];
    const pass = (name: string) => results.push({ name, ok: true });
    const fail = (name: string, err: any) => results.push({ name, ok: false, err: String(err) });

    try {
      const enabled = tools.filter((t) => t.enabled).map((t) => t.key);
      if (enabled.includes("icd10_lookup") && enabled.includes("cpt_validator")) pass("tools-enabled-basic");
      else throw new Error("expected icd10_lookup & cpt_validator enabled by default");
    } catch (e) { fail("tools-enabled-basic", e); }

    try {
      if (policyCode.includes("deny_egress")) pass("policy-has-deny-egress");
      else throw new Error("deny_egress rule missing");
    } catch (e) { fail("policy-has-deny-egress", e); }

    try {
      const text = `curl -X POST https://api.panoptic.ai/v1/agents/${agent.name}/invoke\n-H 'Authorization: Bearer $PANOPTIC_TOKEN'`;
      if (text.includes(agent.name)) pass("curl-includes-agent-name");
      else throw new Error("agent name not injected in curl example");
    } catch (e) { fail("curl-includes-agent-name", e); }

    try {
      if (deploymentSpec.spec.guardrails.privacy.retention_days === policies.retentionDays) pass("manifest-retention-sync");
      else throw new Error("retention not synced to manifest");
    } catch (e) { fail("manifest-retention-sync", e); }

    try {
      JSON.stringify(deploymentSpec);
      pass("manifest-serializable");
    } catch (e) { fail("manifest-serializable", e); }

    try {
      // simulate applyPreset without mutating state
      let a = { ...agent };
      let p = { ...policies };
      const setA = (updater: any) => { a = typeof updater === "function" ? updater(a) : updater; };
      const setP = (updater: any) => { p = typeof updater === "function" ? updater(p) : updater; };
      applyPreset("medicalCoding", setA, setP);
      if (p.hipaa && p.phiMasking && p.retentionDays === 60) pass("preset-medicalCoding-updates-policies");
      else throw new Error("policy updates didn't apply as expected");
    } catch (e) { fail("preset-medicalCoding-updates-policies", e); }

    setTestResults(results);
  }, [agent, policies, tools, policyCode, deploymentSpec]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-medical-bg-subtle to-background">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-semibold text-foreground">Panoptic Privacy</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">AI Agent & Privacy Platform</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                <MedicalButton
                  variant={activeTab === 'deployment' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('deployment')}
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Deployment
                </MedicalButton>
                <MedicalButton
                  variant={activeTab === 'observability' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('observability')}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Observability
                </MedicalButton>
                <MedicalButton
                  variant={activeTab === 'dataflow' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('dataflow')}
                >
                  <GitBranch className="w-4 h-4 mr-2" />
                  Data Flow
                </MedicalButton>
                <MedicalButton
                  variant={activeTab === 'lineage' ? 'primary' : 'ghost'}
                  onClick={() => setActiveTab('lineage')}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Lineage
                </MedicalButton>
              </div>
              <div className="flex items-center gap-2">
                <MedicalButton variant="ghost" icon={BookCheck} onClick={() => setShowReport(true)}>
                  Generate Compliance Report
                </MedicalButton>
                <MedicalButton icon={Rocket}>Deploy</MedicalButton>
              </div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {activeTab === 'deployment' && (
            <div className="grid grid-cols-12 gap-4">
              {/* Sidebar */}
              <aside className="col-span-12 lg:col-span-3 space-y-3">
                <MedicalCard title="Environment" icon={ServerCog}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">Target Environment</span>
                    <InfoTooltip content="Select the target environment for deployment. Production environments have additional compliance checks and restrictions." />
                  </div>
                  <MedicalSelect
                    value={env}
                    onChange={setEnv}
                    options={[
                      { value: "dev", label: "Development" },
                      { value: "staging", label: "Staging" },
                      { value: "prod", label: "Production" }
                    ]}
                  />
                  <div className="mt-2 flex gap-2">
                    <MedicalBadge variant="default">immutable builds</MedicalBadge>
                    <MedicalBadge variant="default">change control</MedicalBadge>
                  </div>
                </MedicalCard>

                <MedicalCard title="Compliance Guardrails" icon={Lock}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Configure compliance frameworks and privacy controls</span>
                    <InfoTooltip content="These settings directly impact how your AI agent handles sensitive data and ensures regulatory compliance." />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <MedicalToggle 
                        checked={policies.hipaa} 
                        onChange={(v) => setPolicies(p => ({ ...p, hipaa: v }))} 
                        label="HIPAA" 
                        hint="PHI access controls & BAA" 
                      />
                      <InfoTooltip content="Health Insurance Portability and Accountability Act - ensures proper handling of protected health information (PHI)" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <MedicalToggle 
                        checked={policies.hitrust} 
                        onChange={(v) => setPolicies(p => ({ ...p, hitrust: v }))} 
                        label="HITRUST" 
                        hint="Operational controls mapping" 
                      />
                      <InfoTooltip content="HITRUST CSF framework provides comprehensive security controls for healthcare organizations" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <MedicalToggle 
                        checked={policies.gdpr} 
                        onChange={(v) => setPolicies(p => ({ ...p, gdpr: v }))} 
                        label="GDPR" 
                        hint="Lawful basis, DSR, DPO logs" 
                      />
                      <InfoTooltip content="General Data Protection Regulation - European privacy law for personal data protection" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <MedicalToggle 
                        checked={policies.ccpa} 
                        onChange={(v) => setPolicies(p => ({ ...p, ccpa: v }))} 
                        label="CCPA/CPRA" 
                        hint="Opt-out, sensitive categories" 
                      />
                      <InfoTooltip content="California Consumer Privacy Act - provides privacy rights for California residents" />
                    </div>
                    
                    <div className="border-t border-border my-2" />
                    
                    <div className="flex items-center justify-between">
                      <MedicalToggle 
                        checked={policies.phiMasking} 
                        onChange={(v) => setPolicies(p => ({ ...p, phiMasking: v }))} 
                        label="PHI masking" 
                        hint="Named entity redaction" 
                      />
                      <InfoTooltip content="Automatically redact protected health information before sending data to AI models" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <MedicalToggle 
                        checked={policies.piiScan} 
                        onChange={(v) => setPolicies(p => ({ ...p, piiScan: v }))} 
                        label="PII scanner" 
                        hint="Inline detectors pre/post model" 
                      />
                      <InfoTooltip content="Scan for personally identifiable information in all data flows and block if detected" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <MedicalToggle 
                        checked={policies.egressBlock} 
                        onChange={(v) => setPolicies(p => ({ ...p, egressBlock: v }))} 
                        label="Block external egress" 
                        hint="No Internet in prod" 
                      />
                      <InfoTooltip content="Prevent the AI agent from making external network connections in production environments" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <MedicalToggle 
                        checked={policies.promptLogging} 
                        onChange={(v) => setPolicies(p => ({ ...p, promptLogging: v }))} 
                        label="Prompt/body logging" 
                        hint="Disable to avoid PHI log storage" 
                      />
                      <InfoTooltip content="Log all prompts and responses for audit purposes. Disable if handling PHI to avoid data exposure." />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 items-end gap-2 mt-4">
                    <MedicalInput 
                      label="Retention (days)" 
                      type="number" 
                      value={policies.retentionDays.toString()} 
                      onChange={(v) => setPolicies(p => ({ ...p, retentionDays: Number(v) }))} 
                    />
                    <MedicalButton 
                      variant="ghost" 
                      onClick={() => applyPreset("healthcare", setAgent, setPolicies)} 
                      icon={ClipboardCheck}
                    >
                      Healthcare preset
                    </MedicalButton>
                  </div>
                </MedicalCard>

                <MedicalCard title="Secrets Vault" icon={KeyRound}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Secure storage for API keys and secrets</span>
                    <InfoTooltip content="Secrets are encrypted at rest and never logged in plaintext. They're available as environment variables at runtime." />
                  </div>
                  
                  <div className="space-y-3">
                    <MedicalInput 
                      label="OPENAI_API_KEY" 
                      placeholder="sk-..." 
                      value={secrets.openaiKey} 
                      onChange={(v) => setSecrets(s => ({ ...s, openaiKey: v }))} 
                    />
                    <MedicalInput 
                      label="SNOWFLAKE_KEY" 
                      placeholder="****" 
                      value={secrets.snowflakeKey} 
                      onChange={(v) => setSecrets(s => ({ ...s, snowflakeKey: v }))} 
                    />
                    <MedicalInput 
                      label="JWT_SIGNING_KEY" 
                      placeholder="****" 
                      value={secrets.jwtSigningKey} 
                      onChange={(v) => setSecrets(s => ({ ...s, jwtSigningKey: v }))} 
                    />
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-3">
                    Secrets are referenced as environment variables at runtime and never stored in prompts or logs.
                  </div>
                </MedicalCard>
              </aside>

              {/* Main Deployment Content */}
              <main className="col-span-12 lg:col-span-9 space-y-4">
                <MedicalCard 
                  title="Agent Definition" 
                  icon={Bot} 
                  action={
                    <MedicalButton variant="ghost" icon={Settings}>
                      Config
                    </MedicalButton>
                  }
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Configure your AI agent's behavior and model parameters</span>
                    <InfoTooltip content="Define the agent's purpose, select the appropriate model, and configure processing parameters for optimal performance." />
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-3 mb-4">
                    <MedicalInput 
                      label="Agent name" 
                      value={agent.name} 
                      onChange={(v) => setAgent(a => ({ ...a, name: v }))} 
                    />
                    <MedicalSelect 
                      label="Model" 
                      value={agent.model} 
                      onChange={(v) => setAgent(a => ({ ...a, model: v }))} 
                      options={[
                        { value: "gpt-4.1-mini", label: "GPT-4.1-mini" },
                        { value: "claude-3.5", label: "Claude 3.5" }
                      ]} 
                    />
                    <MedicalInput 
                      label="Purpose" 
                      value={agent.purpose} 
                      onChange={(v) => setAgent(a => ({ ...a, purpose: v }))} 
                    />
                    <MedicalInput 
                      label="Max tokens" 
                      type="number" 
                      value={agent.maxTokens.toString()} 
                      onChange={(v) => setAgent(a => ({ ...a, maxTokens: Number(v) }))} 
                    />
                    <MedicalInput 
                      label="Temperature" 
                      type="number" 
                      value={agent.temperature.toString()} 
                      onChange={(v) => setAgent(a => ({ ...a, temperature: Number(v) }))} 
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <MedicalButton 
                      variant="ghost" 
                      icon={ClipboardList} 
                      onClick={() => applyPreset("banking", setAgent, setPolicies)}
                    >
                      Banking preset
                    </MedicalButton>
                    <MedicalButton 
                      variant="ghost" 
                      icon={ClipboardCheck} 
                      onClick={() => applyPreset("healthcare", setAgent, setPolicies)}
                    >
                      Healthcare preset
                    </MedicalButton>
                    <MedicalButton 
                      variant="ghost" 
                      icon={FileCode2} 
                      onClick={() => applyPreset("medicalCoding", setAgent, setPolicies)}
                    >
                      Medical Coding preset
                    </MedicalButton>
                  </div>
                </MedicalCard>

                {/* Toolbox & Prompts */}
                <MedicalCard title="Toolbox & Prompt Templates" icon={Settings}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Configure specialized tools and prompt templates</span>
                    <InfoTooltip content="Enable specific tools and define reusable prompt templates for your AI agent's use case." />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-medium text-foreground mb-3">Available Tools</div>
                      <ul className="space-y-2">
                        {tools.map((t, idx) => (
                          <li key={t.key} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{t.label}</span>
                            <MedicalToggle 
                              checked={t.enabled} 
                              onChange={(v) => setTools(ts => ts.map((x, i) => i === idx ? { ...x, enabled: v } : x))} 
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-foreground mb-3">Prompt Templates</div>
                      <div className="space-y-2">
                        {promptTemplates.map((p, i) => (
                          <div key={i} className="border border-border rounded-xl p-3">
                            <MedicalInput 
                              label="Template Name" 
                              value={p.name} 
                              onChange={(v) => setPromptTemplates(arr => arr.map((x, ix) => ix === i ? { ...x, name: v } : x))} 
                            />
                            <label className="block mt-2">
                              <span className="text-xs font-medium text-foreground">Template Body</span>
                              <textarea 
                                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input resize-none" 
                                rows={3} 
                                value={p.body} 
                                onChange={(e) => setPromptTemplates(arr => arr.map((x, ix) => ix === i ? { ...x, body: e.target.value } : x))}
                              />
                            </label>
                          </div>
                        ))}
                        <MedicalButton 
                          variant="ghost" 
                          onClick={() => setPromptTemplates(arr => [...arr, { name: "New Template", body: "Enter template content here..." }])}
                        >
                          Add Template
                        </MedicalButton>
                      </div>
                    </div>
                  </div>
                </MedicalCard>

                {/* Policy-as-Code */}
                <MedicalCard title="Policy-as-Code (CEL/Rego-style)" icon={Lock}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Define custom privacy and security policies using code</span>
                    <InfoTooltip content="Write custom rules using CEL or Rego-like syntax. These policies are enforced at runtime to ensure compliance." />
                  </div>
                  
                  <label className="block">
                    <span className="text-xs font-medium text-foreground">Policy Rules</span>
                    <textarea 
                      className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring" 
                      rows={10} 
                      value={policyCode} 
                      onChange={(e) => setPolicyCode(e.target.value)}
                    />
                  </label>
                  
                  <div className="mt-3 flex gap-2">
                    <MedicalButton variant="ghost" onClick={() => alert("Policy syntax validated successfully! (demo)")}>
                      Validate Syntax
                    </MedicalButton>
                    <MedicalButton variant="ghost" onClick={() => alert("Policies applied to deployment manifest (demo)")}>
                      Apply Policies
                    </MedicalButton>
                  </div>
                </MedicalCard>

                {/* API & Export */}
                <MedicalCard title="API & Export Options" icon={Globe}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-muted-foreground">RESTful API endpoints and infrastructure as code</span>
                    <InfoTooltip content="Access deployment APIs and export configurations for CI/CD pipelines using Terraform or OpenAPI specifications." />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2 text-foreground">API Endpoints</h4>
                      <pre className="text-xs bg-muted border border-border rounded-xl p-3 overflow-auto text-foreground font-mono">
{`POST /v1/agents/${agent.name}/deploy
GET  /v1/agents/${agent.name}/status
PUT  /v1/agents/${agent.name}/policies
DEL  /v1/agents/${agent.name}`}
                      </pre>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2 text-foreground">Export Options</h4>
                      <div className="space-y-2">
                        <MedicalButton 
                          variant="ghost" 
                          icon={Download}
                          onClick={() => {
                            const spec = JSON.stringify(deploymentSpec, null, 2);
                            const blob = new Blob([spec], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${agent.name}-${env}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          Download JSON Manifest
                        </MedicalButton>
                        <MedicalButton 
                          variant="ghost" 
                          icon={FileCode2}
                          onClick={() => {
                            const tf = `provider "panoptic" {}

resource "panoptic_agent" "agent" {
  name      = "${agent.name}"
  env       = "${env}"
  spec_json = file("./${agent.name}-${env}.json")
}`;
                            const blob = new Blob([tf], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'panoptic.tf';
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          Export Terraform
                        </MedicalButton>
                      </div>
                    </div>
                  </div>
                </MedicalCard>

                {/* Inline Tests */}
                <MedicalCard title="Configuration Tests" icon={Eye}>
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm text-muted-foreground">Automated validation of your deployment configuration</span>
                    <InfoTooltip content="Real-time tests that validate your configuration meets security, compliance, and operational requirements." />
                  </div>
                  
                  <ul className="text-sm space-y-2">
                    {testResults.map((t, i) => (
                      <li key={i} className={`flex items-center gap-2 ${t.ok ? "text-medical-success" : "text-medical-error"}`}>
                        <span className={`w-2 h-2 rounded-full ${t.ok ? "bg-medical-success" : "bg-medical-error"}`} />
                        <span className="flex-1">{t.name}</span>
                        {!t.ok && <span className="text-xs text-muted-foreground">— {t.err}</span>}
                      </li>
                    ))}
                  </ul>
                </MedicalCard>
              </main>
            </div>
          )}

          {activeTab === 'observability' && <PrivacyObservability />}
          {activeTab === 'dataflow' && <DataFlowMap />}
          {activeTab === 'lineage' && <DataLineageTracker />}
        </div>

        {/* Compliance Report Modal */}
        {showReport && (
          <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2 text-foreground">
                  <Shield className="w-5 h-5" />
                  Compliance Summary Report
                </h3>
                <MedicalButton variant="ghost" onClick={() => setShowReport(false)}>
                  Close
                </MedicalButton>
              </div>
              
              <div className="text-sm space-y-3">
                <div>
                  <strong>Scope:</strong> {agent.purpose} in{" "}
                  <MedicalBadge variant="default">{env}</MedicalBadge>
                </div>
                
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>
                    All PHI is <strong className={policies.phiMasking ? "text-medical-success" : "text-medical-error"}>
                      {policies.phiMasking ? "masked/redacted" : "not masked"}
                    </strong> before model calls.
                  </li>
                  <li>
                    External egress is <strong className={policies.egressBlock ? "text-medical-success" : "text-medical-error"}>
                      {policies.egressBlock ? "blocked" : "allowed"}
                    </strong> at runtime.
                  </li>
                  <li>
                    Data retention set to <strong>{policies.retentionDays} days</strong>; DSAR program{" "}
                    <strong className={policies.dsarReady ? "text-medical-success" : "text-medical-error"}>
                      {policies.dsarReady ? "enabled" : "disabled"}
                    </strong>.
                  </li>
                  <li>
                    Structured audit logs:{" "}
                    <strong className={policies.auditLogs ? "text-medical-success" : "text-medical-error"}>
                      {policies.auditLogs ? "enabled" : "disabled"}
                    </strong>.
                  </li>
                </ul>
              </div>
              
              <div className="mt-6 flex items-center justify-end gap-2">
                <MedicalButton 
                  variant="ghost" 
                  icon={Download} 
                  onClick={() => alert("Compliance report exported as PDF (demo)")}
                >
                  Export PDF
                </MedicalButton>
                <MedicalButton 
                  icon={Rocket} 
                  onClick={() => { 
                    setShowReport(false); 
                    alert("Compliance validation passed! Ready for deployment (demo)"); 
                  }}
                >
                  Proceed to Deploy
                </MedicalButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}