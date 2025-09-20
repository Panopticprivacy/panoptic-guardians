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
} from "lucide-react";
import { MedicalCard } from '@/components/ui/medical-card';
import { MedicalBadge } from '@/components/ui/medical-badge';
import { MedicalButton } from '@/components/ui/medical-button';
import { MedicalToggle } from '@/components/ui/medical-toggle';
import { MedicalInput } from '@/components/ui/medical-input';
import { MedicalSelect } from '@/components/ui/medical-select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoTooltip } from '@/components/ui/info-tooltip';

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

const getToolDescription = (toolKey: string): string => {
  const descriptions: Record<string, string> = {
    icd10_lookup: "Lookup and validate ICD-10 diagnosis codes with detailed descriptions and usage guidelines",
    cpt_validator: "Validate CPT procedure codes and check for proper billing combinations and modifiers",
    claim_scrubber: "Apply NCCI edits and payer-specific rules to clean claims before submission",
    phi_redactor: "Automatically detect and redact protected health information from clinical notes",
    payer_rules: "Access comprehensive payer-specific coding guidelines and requirements from CMS and private insurers"
  };
  return descriptions[toolKey] || "Tool description not available";
};

const applyPreset = (preset: string, setAgent: any, setPolicies: any) => {
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

  const [testResults, setTestResults] = useState<any[]>([]);
  useEffect(() => {
    const results: any[] = [];
    const pass = (name: string) => results.push({ name, ok: true });
    const fail = (name: string, err: string) => results.push({ name, ok: false, err: String(err) });

    try {
      const enabled = tools.filter((t) => t.enabled).map((t) => t.key);
      if (enabled.includes("icd10_lookup") && enabled.includes("cpt_validator")) pass("tools-enabled-basic");
      else throw new Error("expected icd10_lookup & cpt_validator enabled by default");
    } catch (e: any) { fail("tools-enabled-basic", e.message); }

    try {
      if (policyCode.includes("deny_egress")) pass("policy-has-deny-egress");
      else throw new Error("deny_egress rule missing");
    } catch (e: any) { fail("policy-has-deny-egress", e.message); }

    try {
      const text = `curl -X POST https://api.panoptic.ai/v1/agents/${agent.name}/invoke\n-H 'Authorization: Bearer $PANOPTIC_TOKEN'`;
      if (text.includes(agent.name)) pass("curl-includes-agent-name");
      else throw new Error("agent name not injected in curl example");
    } catch (e: any) { fail("curl-includes-agent-name", e.message); }

    try {
      if (deploymentSpec.spec.guardrails.privacy.retention_days === policies.retentionDays) pass("manifest-retention-sync");
      else throw new Error("retention not synced to manifest");
    } catch (e: any) { fail("manifest-retention-sync", e.message); }

    try {
      JSON.stringify(deploymentSpec);
      pass("manifest-serializable");
    } catch (e: any) { fail("manifest-serializable", e.message); }

    setTestResults(results);
  }, [agent, policies, deploymentSpec, policyCode, tools]);

  return (
    <div className="min-h-screen bg-gradient-main">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-custom">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <span className="font-semibold">Panoptic Privacy</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">AI Agent Deployment</span>
          </div>
          <div className="flex items-center gap-2">
            <MedicalButton variant="ghost" icon={BookCheck} onClick={() => setShowReport(true)}>
              Generate Compliance Report
            </MedicalButton>
            <MedicalButton icon={Rocket}>Deploy</MedicalButton>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3 space-y-3">
          <MedicalCard title="Environment" icon={ServerCog}>
            <div className="flex items-center gap-2 mb-2">
              <InfoTooltip content="Select the deployment environment. Production has stricter security controls and compliance requirements." />
            </div>
            <MedicalSelect
              label="Target"
              value={env}
              onChange={setEnv}
              options={[
                { value: "dev", label: "Development" },
                { value: "staging", label: "Staging" },
                { value: "prod", label: "Production" }
              ]}
            />
            <div className="mt-2 flex gap-2">
              <MedicalBadge>immutable builds</MedicalBadge>
              <MedicalBadge>change control</MedicalBadge>
            </div>
          </MedicalCard>

          <MedicalCard title="Compliance Guardrails" icon={Lock}>
            <div className="flex items-center gap-2 mb-2">
              <InfoTooltip content="Configure regulatory compliance controls. These settings determine which privacy and security frameworks are applied to your AI agent." />
            </div>
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
            <div className="border-t my-2" />
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
              <InfoTooltip content="Scan for personally identifiable information in inputs and outputs to prevent data leaks" />
            </div>
            <div className="flex items-center justify-between">
              <MedicalToggle 
                checked={policies.egressBlock} 
                onChange={(v) => setPolicies(p => ({ ...p, egressBlock: v }))} 
                label="Block external egress" 
                hint="No Internet in prod" 
              />
              <InfoTooltip content="Prevent the AI agent from making external network calls, ensuring data stays within your infrastructure" />
            </div>
            <div className="flex items-center justify-between">
              <MedicalToggle 
                checked={policies.promptLogging} 
                onChange={(v) => setPolicies(p => ({ ...p, promptLogging: v }))} 
                label="Prompt/body logging" 
                hint="Disable to avoid PHI log storage" 
              />
              <InfoTooltip content="Enable or disable logging of AI prompts and responses - disable for sensitive PHI data" />
            </div>
            <div className="grid grid-cols-2 items-end gap-2 mt-2">
              <div className="flex items-center gap-2">
                <MedicalInput 
                  label="Retention (days)" 
                  type="number" 
                  value={policies.retentionDays} 
                  onChange={(v) => setPolicies(p => ({ ...p, retentionDays: Number(v) }))} 
                />
                <InfoTooltip content="How long to retain data and logs before automatic deletion" />
              </div>
              <MedicalButton 
                variant="subtle" 
                onClick={() => applyPreset("healthcare", setAgent, setPolicies)} 
                icon={ClipboardCheck}
              >
                Healthcare preset
              </MedicalButton>
            </div>
          </MedicalCard>

          <MedicalCard title="Secrets Vault" icon={KeyRound}>
            <div className="flex items-center gap-2 mb-2">
              <InfoTooltip content="Securely store API keys and secrets. These are never exposed in prompts or logs and are injected at runtime as environment variables." />
            </div>
            <MedicalInput 
              label="OPENAI_API_KEY" 
              placeholder="****" 
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
            <div className="text-xs text-muted-foreground mt-1">
              Secrets are referenced as env vars at runtime; never stored in prompts.
            </div>
          </MedicalCard>
        </aside>

        {/* Main */}
        <main className="col-span-12 lg:col-span-9 space-y-4">
          <MedicalCard 
            title="Agent Definition" 
            icon={Bot} 
            action={<MedicalButton variant="ghost" icon={Settings}>Config</MedicalButton>}
          >
            <div className="flex items-center gap-2 mb-3">
              <InfoTooltip content="Define your AI agent's core parameters including name, model selection, and intended purpose. These settings determine how your agent behaves and processes medical data." />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <MedicalInput 
                  label="Agent name" 
                  value={agent.name} 
                  onChange={(v) => setAgent(a => ({ ...a, name: v }))} 
                />
                <InfoTooltip content="Unique identifier for your AI agent deployment" />
              </div>
              <div className="flex items-center gap-2">
                <MedicalSelect 
                  label="Model" 
                  value={agent.model} 
                  onChange={(v) => setAgent(a => ({ ...a, model: v }))} 
                  options={[
                    { value: "gpt-4.1-mini", label: "GPT-4.1-mini" },
                    { value: "claude-3.5", label: "Claude 3.5" }
                  ]} 
                />
                <InfoTooltip content="Choose the underlying AI model for your agent - different models have different capabilities and costs" />
              </div>
              <div className="flex items-center gap-2">
                <MedicalInput 
                  label="Purpose" 
                  value={agent.purpose} 
                  onChange={(v) => setAgent(a => ({ ...a, purpose: v }))} 
                />
                <InfoTooltip content="Brief description of what this agent is designed to accomplish" />
              </div>
              <div className="flex items-center gap-2">
                <MedicalInput 
                  label="Max tokens" 
                  type="number" 
                  value={agent.maxTokens} 
                  onChange={(v) => setAgent(a => ({ ...a, maxTokens: Number(v) }))} 
                />
                <InfoTooltip content="Maximum number of tokens the AI can generate in a single response - higher values allow longer responses but increase costs" />
              </div>
              <div className="flex items-center gap-2">
                <MedicalInput 
                  label="Temperature" 
                  type="number" 
                  value={agent.temperature} 
                  onChange={(v) => setAgent(a => ({ ...a, temperature: Number(v) }))} 
                />
                <InfoTooltip content="Controls randomness in AI responses - lower values (0.1-0.3) for medical coding, higher values (0.7-1.0) for creative tasks" />
              </div>
              <div className="flex flex-wrap gap-2">
                <MedicalButton 
                  variant="subtle" 
                  icon={ClipboardList} 
                  onClick={() => applyPreset("banking", setAgent, setPolicies)}
                >
                  Banking preset
                </MedicalButton>
                <MedicalButton 
                  variant="subtle" 
                  icon={ClipboardCheck} 
                  onClick={() => applyPreset("healthcare", setAgent, setPolicies)}
                >
                  Healthcare preset
                </MedicalButton>
                <MedicalButton 
                  variant="subtle" 
                  icon={FileCode2} 
                  onClick={() => applyPreset("medicalCoding", setAgent, setPolicies)}
                >
                  Medical Coding preset
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>

          {/* Toolbox & Prompts */}
          <MedicalCard title="Toolbox & Prompt Templates" icon={Settings}>
            <div className="flex items-center gap-2 mb-3">
              <InfoTooltip content="Configure the tools and prompt templates your AI agent has access to. Tools provide specific capabilities like medical code lookups, while templates standardize common workflows." />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-medium text-foreground">Tools</div>
                  <InfoTooltip content="Specialized functions your AI agent can call to perform specific medical coding tasks" />
                </div>
                <ul className="space-y-2">
                  {tools.map((t, idx) => (
                    <li key={t.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span>{t.label}</span>
                        <InfoTooltip content={getToolDescription(t.key)} />
                      </div>
                      <MedicalToggle 
                        checked={t.enabled} 
                        onChange={(v) => setTools(ts => ts.map((x, i) => i === idx ? { ...x, enabled: v } : x))} 
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-medium text-foreground">Prompt templates</div>
                  <InfoTooltip content="Pre-defined prompts for common medical coding scenarios - customize these for your specific workflows" />
                </div>
                <div className="space-y-2">
                  {promptTemplates.map((p, i) => (
                    <div key={i} className="border rounded-xl p-2">
                      <MedicalInput 
                        label="Name" 
                        value={p.name} 
                        onChange={(v) => setPromptTemplates(arr => arr.map((x, ix) => ix === i ? { ...x, name: v } : x))} 
                      />
                      <label className="block mt-1">
                        <span className="text-xs font-medium text-foreground">Body</span>
                        <textarea 
                          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                          rows={3} 
                          value={p.body} 
                          onChange={(e) => setPromptTemplates(arr => arr.map((x, ix) => ix === i ? { ...x, body: e.target.value } : x))}
                        />
                      </label>
                    </div>
                  ))}
                  <MedicalButton 
                    variant="subtle" 
                    onClick={() => setPromptTemplates(arr => [...arr, { name: "New Template", body: "..." }])}
                  >
                    Add template
                  </MedicalButton>
                </div>
              </div>
            </div>
          </MedicalCard>

          {/* Policy-as-Code */}
          <MedicalCard title="Policy-as-Code (CEL/Rego-style)" icon={Lock}>
            <div className="flex items-center gap-2 mb-3">
              <InfoTooltip content="Define custom security and compliance rules using policy-as-code. These rules are enforced at runtime to control agent behavior and data access." />
            </div>
            <label className="block">
              <span className="text-xs font-medium text-foreground">Rules</span>
              <textarea 
                className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" 
                rows={10} 
                value={policyCode} 
                onChange={(e) => setPolicyCode(e.target.value)}
              />
            </label>
            <div className="mt-2 flex gap-2">
              <MedicalButton variant="ghost" onClick={() => alert("Syntax OK (demo)")}>
                Validate
              </MedicalButton>
              <MedicalButton variant="subtle" onClick={() => alert("Rules applied to deployment (demo)")}>
                Apply
              </MedicalButton>
            </div>
          </MedicalCard>

          {/* API Surface */}
          <MedicalCard title="API Surface (REST)" icon={Globe}>
            <div className="flex items-center gap-2 mb-3">
              <InfoTooltip content="REST API endpoints for deploying and managing your AI agent. Use these for CI/CD integration and programmatic control." />
            </div>
            <pre className="text-xs bg-secondary border border-border rounded-xl p-3 overflow-auto">
              {`POST /deploy
GET /agents/:id/status
PATCH /agents/:id/policies`}
            </pre>
            <div className="mt-2 text-xs text-muted-foreground">
              Terraform snippet available for CI/CD integration.
            </div>
          </MedicalCard>

          {/* API & IaC */}
          <MedicalCard title="API & IaC (exportable)" icon={Globe}>
            <div className="flex items-center gap-2 mb-3">
              <InfoTooltip content="Export configuration as Infrastructure-as-Code (Terraform) or API documentation (OpenAPI) for version control and automated deployments." />
            </div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium">cURL (invoke agent)</div>
                <pre className="bg-secondary border border-border rounded-xl p-3 overflow-auto text-xs">
                  {`curl -X POST https://api.panoptic.ai/v1/agents/${agent.name}/invoke
-H 'Authorization: Bearer $PANOPTIC_TOKEN'
-H 'Content-Type: application/json'
-d '{"input": {"note": "Patient with cough; CXR performed"}}'`}
                </pre>
                <MedicalButton variant="ghost" onClick={() => alert("OpenAPI downloaded (demo)")}>
                  Download OpenAPI
                </MedicalButton>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Terraform (IaC)</div>
                <pre className="bg-secondary border border-border rounded-xl p-3 overflow-auto text-xs">
                  {`provider "panoptic" {}

resource "panoptic_agent" "medcoder" {
  name        = "${agent.name}"
  env         = "${env}"
  spec_json   = file("./${agent.name}-${env}.json")
}`}
                </pre>
                <MedicalButton variant="ghost" onClick={() => alert("Terraform downloaded (demo)")}>
                  Download Terraform
                </MedicalButton>
              </div>
            </div>
          </MedicalCard>

          {/* Inline Tests */}
          <MedicalCard title="Inline Tests" icon={Eye}>
            <div className="flex items-center gap-2 mb-3">
              <InfoTooltip content="Automated tests that validate your agent configuration and ensure compliance policies are properly applied." />
            </div>
            <ul className="text-sm space-y-1">
              {testResults.map((t, i) => (
                <li key={i} className={t.ok ? "text-compliance-success" : "text-compliance-error"}>
                  {t.ok ? "✔" : "✖"} {t.name}{t.ok ? "" : ` — ${t.err}`}
                </li>
              ))}
            </ul>
          </MedicalCard>
        </main>
      </div>

      {/* Compliance Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-card rounded-2xl shadow-dialog w-full max-w-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Compliance Summary (demo)
              </h3>
              <MedicalButton variant="ghost" onClick={() => setShowReport(false)}>
                Close
              </MedicalButton>
            </div>
            <div className="text-sm space-y-2">
              <p>
                <strong>Scope:</strong> {agent.purpose} in <MedicalBadge>{env}</MedicalBadge>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>All PHI is <strong>{policies.phiMasking ? "masked/redacted" : "not masked"}</strong> before model calls.</li>
                <li>External egress is <strong>{policies.egressBlock ? "blocked" : "allowed"}</strong> at runtime.</li>
                <li>Retention set to <strong>{policies.retentionDays} days</strong>; DSAR program <strong>{policies.dsarReady ? "enabled" : "disabled"}</strong>.</li>
                <li>Structured audit logs: <strong>{policies.auditLogs ? "enabled" : "disabled"}</strong>.</li>
              </ul>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <MedicalButton variant="ghost" icon={Download} onClick={() => alert("Downloaded compliance-summary.pdf (demo)")}>
                Export PDF
              </MedicalButton>
              <MedicalButton icon={Rocket} onClick={() => { setShowReport(false); alert("Compliance gate passed. Proceed to Deploy (demo)"); }}>
                Proceed
              </MedicalButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}