import { createAcpAdapter } from '../acp/acp-adapter'
import type { AcpProviderHooks } from '../acp/hooks'
import { describeConformance, echoMcpServerSpec } from '../testing/index'

// Diagnostic hooks only. Product capability claims require independent verification.
const probe: AcpProviderHooks = {
  provider: 'junie',
  label: 'Junie custom OpenRouter probe',
  defaultBinary: process.env.JUNIE_BINARY!,
  loginCommand: 'junie',
  capabilities: {
    modelSwitchInSession: false,
    steering: false,
    resume: false,
    approvals: false,
    userInput: false,
  },
  launch: ({ binaryPath, env }) => ({
    command: binaryPath,
    args: ['--acp=true', '--model', 'custom:openrouter-free', '--max-steps', '8'],
    env,
    rejectOutputLine: (line) =>
      /insufficient.{0,30}(credit|quota)|rate.limit.exceeded|quota.exceeded|invalid model|region.{0,30}(blocked|restricted|unsupported)|HTTP[^\n]*(402|429)/i.test(line)
        ? 'Provider quota, region or model restriction. Stop without retry or fallback.'
        : undefined,
  }),
}

const key = process.env.JUNIE_OPENROUTER_API_KEY
const home = process.env.JUNIE_HOME
if (!key || !home || !process.env.JUNIE_BINARY) {
  throw new Error('This diagnostic requires the guarded GitHub-hosted environment')
}

describeConformance('junie-free-probe', {
  createAdapter: async () => createAcpAdapter(probe, {}),
  unavailableReason: async () => null,
  timeoutMs: 90_000,
  env: { JUNIE_OPENROUTER_API_KEY: key, JUNIE_HOME: home },
  mcpServers: { echo: echoMcpServerSpec() },
})
