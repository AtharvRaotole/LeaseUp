import type { Location } from '@leaseup/contracts';
import {
  DEMO_CHIP_ADDRESSES,
  matchDemoFixtureId,
} from '@leaseup/fixtures/worker';
import type { Env } from '../index';
import type { QlooClient } from '../providers/qloo';
import {
  PROSPECTING_AGENT_LOOP_TIMEOUT_MS,
  PROSPECTING_AGENT_MAX_QLOO_CALLS,
  PROSPECTING_AGENT_MAX_STEPS,
  withTimeout,
} from './analysis-step-budget';
import {
  executeProspectingAgentTool,
  PROSPECTING_AGENT_OPENAI_TOOLS,
  PROSPECTING_AGENT_TOOL_NAMES,
  type ProspectingAgentToolCall,
  type ProspectingAgentToolContext,
  type ProspectingAgentToolName,
} from './prospecting-agent-tools';
import {
  absenceRadiusKmForLocation,
  applyProspectingAgentToolToState,
  createProspectingAgentState,
  toProspectingAgentDagHooks,
  type ProspectingAgentAccumulatedState,
  type ProspectingAgentDagHooks,
  type ProspectingAgentPlannerKind,
  type ProspectingAgentStepLog,
} from './prospecting-agent-state';
import { demoFixtureStratum } from '@leaseup/fixtures/worker';

export type ProspectingAgentPlanResult = {
  mode: 'agent' | 'dag_fallback';
  summary: string;
  steps: ProspectingAgentStepLog[];
  state: ProspectingAgentAccumulatedState;
  dagHooks: ProspectingAgentDagHooks;
  plannerQlooCalls: number;
  fallbackReason?: string;
};

export type ProspectingPlannerTurn = {
  assistantReason?: string;
  toolCalls: ProspectingAgentToolCall[];
  done: boolean;
};

export interface ProspectingPlannerClient {
  nextTurn(input: {
    location: Location;
    radiusKm: number;
    stepsSoFar: ProspectingAgentStepLog[];
    qlooCallsUsed: number;
    fixtureId: string | null;
  }): Promise<ProspectingPlannerTurn>;
}

type ChatMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    }
  | { role: 'tool'; tool_call_id: string; content: string };

class OpenAiProspectingPlannerClient implements ProspectingPlannerClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly messages: ChatMessage[] = [];
  private seeded = false;

  constructor(env: Env) {
    this.apiKey = env.OPENAI_API_KEY || '';
    this.model = env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  recordToolResults(results: Array<{ toolCallId: string; summary: string }>): void {
    for (const row of results) {
      this.messages.push({ role: 'tool', tool_call_id: row.toolCallId, content: row.summary });
    }
  }

  async nextTurn(input: {
    location: Location;
    radiusKm: number;
    stepsSoFar: ProspectingAgentStepLog[];
    qlooCallsUsed: number;
    fixtureId: string | null;
  }): Promise<ProspectingPlannerTurn & { toolCallIds?: string[] }> {
    if (!this.seeded) {
      this.seeded = true;
      this.messages.push({
        role: 'system',
        content: [
          'You are a commercial retail prospecting planner.',
          `Budget: at most ${PROSPECTING_AGENT_MAX_STEPS} tool steps and ${PROSPECTING_AGENT_MAX_QLOO_CALLS} Qloo API calls.`,
          'Choose only useful extra checks before the main analysis pipeline runs.',
          'qloo_brand_insights returns the top brands with their entityId values; use those ids for nearest_store_check and enrich_site_stratum.',
          'Call qloo_brand_insights by itself first, then check only brands it returned; brands outside that panel cannot be checked.',
          'A brand is only boosted when enrich_site_stratum finds verified local audience overlap.',
          'Always pass a short reason in each tool call.',
          'When no more checks are needed, reply with a brief plan summary and no tool calls.',
        ].join(' '),
      });
      this.messages.push({
        role: 'user',
        content: JSON.stringify({
          address: input.location.address,
          neighborhood: input.location.neighborhood,
          radiusKm: input.radiusKm,
          stepsCompleted: input.stepsSoFar.length,
          qlooCallsUsed: input.qlooCallsUsed,
        }),
      });
    }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: this.messages,
          tools: PROSPECTING_AGENT_OPENAI_TOOLS,
          temperature: 0.2,
          max_tokens: 400,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI planner error: ${response.status}`);
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content?: string | null;
            tool_calls?: Array<{
              id: string;
              type: 'function';
              function: { name: string; arguments: string };
            }>;
          };
          finish_reason: string;
        }>;
      };

      const choice = data.choices[0]!;
      const msg = choice.message;
      this.messages.push({
        role: 'assistant',
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      });

      const toolCalls: ProspectingAgentToolCall[] = [];
      const toolCallIds: string[] = [];
      for (const tc of msg.tool_calls ?? []) {
        const parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        const name = tc.function.name as ProspectingAgentToolName;
        if (!PROSPECTING_AGENT_TOOL_NAMES.includes(name)) continue;
        toolCallIds.push(tc.id);
        toolCalls.push({
          name,
          reason: String(parsed.reason ?? msg.content ?? 'Planner chose this tool'),
          arguments: parsed,
        });
      }

      return {
        assistantReason: msg.content?.trim() || undefined,
        toolCalls,
        toolCallIds,
        done: toolCalls.length === 0,
      };
    }
}

export function createOpenAiProspectingPlannerClient(env: Env): OpenAiProspectingPlannerClient | null {
  const apiKey = env.OPENAI_API_KEY || '';
  if (env.APP_MODE !== 'live' || !apiKey) return null;
  return new OpenAiProspectingPlannerClient(env);
}

/** Deterministic planner for demo chips and unit tests (no OpenAI). */
export class DemoProspectingPlannerClient implements ProspectingPlannerClient {
  private turn = 0;

  async nextTurn(input: {
    location: Location;
    radiusKm: number;
    stepsSoFar: ProspectingAgentStepLog[];
    qlooCallsUsed: number;
    fixtureId: string | null;
  }): Promise<ProspectingPlannerTurn> {
    const topEntity = input.stepsSoFar.find((s) => s.tool === 'qloo_brand_insights')?.toolArgs
      ?.topEntityId as string | undefined;

    if (this.turn === 0) {
      this.turn += 1;
      return {
        toolCalls: [
          {
            name: 'qloo_brand_insights',
            reason: 'Rule: fetch affinity panel before absence scan.',
            arguments: { take: 50 },
          },
        ],
        done: false,
      };
    }

    if (this.turn === 1 && topEntity) {
      this.turn += 1;
      return {
        toolCalls: [
          {
            name: 'nearest_store_check',
            reason: 'Rule: reconcile the nearest store for the strongest taste match.',
            arguments: { entityId: topEntity },
          },
        ],
        done: false,
      };
    }

    if (this.turn === 2 && topEntity) {
      this.turn += 1;
      return {
        toolCalls: [
          {
            name: 'enrich_site_stratum',
            reason: 'Rule: look for verified local audience overlap for the strongest taste match.',
            arguments: { entityId: topEntity },
          },
        ],
        done: false,
      };
    }

    return {
      assistantReason: 'Planner budget satisfied; hand off to deterministic analysis pipeline.',
      toolCalls: [],
      done: true,
    };
  }
}

export async function runProspectingAgentPlanner(params: {
  env: Env;
  location: Location;
  radiusKm: number;
  runId: string;
  qloo: QlooClient;
  planner?: ProspectingPlannerClient | null;
  /** Demo chip match on the user-entered address (confirmed pin may differ). */
  fixtureAddress?: string;
}): Promise<ProspectingAgentPlanResult> {
  const mode = params.env.APP_MODE === 'live' ? 'live' : 'demo';
  const fixtureId =
    (params.fixtureAddress ? matchDemoFixtureId(params.fixtureAddress) : null) ??
    matchDemoFixtureId(params.location.address);

  const planner: ProspectingPlannerClient | OpenAiProspectingPlannerClient | null =
    params.planner ??
    (fixtureId ? new DemoProspectingPlannerClient() : null) ??
    createOpenAiProspectingPlannerClient(params.env);

  const emptyState = createProspectingAgentState();

  if (!planner) {
    return {
      mode: 'dag_fallback',
      summary: 'OpenAI planner unavailable; using fixed analysis pipeline.',
      steps: [],
      state: emptyState,
      dagHooks: toProspectingAgentDagHooks(emptyState),
      plannerQlooCalls: 0,
      fallbackReason: 'no_planner',
    };
  }

  const plannerKind: ProspectingAgentPlannerKind =
    planner instanceof OpenAiProspectingPlannerClient ? 'model' : 'rule';

  const siteStratum = fixtureId ? demoFixtureStratum(fixtureId) : 'urban';
  const absenceRadiusKm = absenceRadiusKmForLocation(
    params.location.address,
    params.radiusKm,
    siteStratum
  );

  const state = createProspectingAgentState();
  const ctx: ProspectingAgentToolContext = {
    env: params.env,
    location: params.location,
    radiusKm: params.radiusKm,
    runId: params.runId,
    qloo: params.qloo,
    mode,
    state,
  };

  const steps: ProspectingAgentStepLog[] = [];
  let qlooCalls = 0;

  try {
    await withTimeout(
      (async () => {
        while (steps.length < PROSPECTING_AGENT_MAX_STEPS) {
          const turn = await planner!.nextTurn({
            location: params.location,
            radiusKm: params.radiusKm,
            stepsSoFar: steps,
            qlooCallsUsed: qlooCalls,
            fixtureId,
          });

          if (turn.done || turn.toolCalls.length === 0) {
            break;
          }

          const toolResultRows: Array<{ toolCallId: string; summary: string }> = [];
          const toolCallIds =
            'toolCallIds' in turn && Array.isArray(turn.toolCallIds) ? turn.toolCallIds : [];

          for (let i = 0; i < turn.toolCalls.length; i++) {
            const call = turn.toolCalls[i]!;
            if (steps.length >= PROSPECTING_AGENT_MAX_STEPS) break;
            const countsQloo =
              call.name === 'qloo_brand_insights' || call.name === 'enrich_site_stratum';
            if (countsQloo && qlooCalls >= PROSPECTING_AGENT_MAX_QLOO_CALLS) {
              const skipSummary = 'Skipped; Qloo budget exhausted. DAG will run next.';
              steps.push({
                stepIndex: steps.length,
                planner: plannerKind,
                reason:
                  plannerKind === 'rule'
                    ? 'Rule: stop when Qloo call budget is reached.'
                    : 'Qloo call budget reached',
                tool: call.name,
                toolArgs: call.arguments,
                resultSummary: skipSummary,
                durationMs: 0,
              });
              if (toolCallIds[i]) {
                toolResultRows.push({ toolCallId: toolCallIds[i]!, summary: skipSummary });
              }
              continue;
            }

            const t0 = Date.now();
            const result = await executeProspectingAgentTool(call, ctx);
            qlooCalls += result.qlooCalls;
            applyProspectingAgentToolToState(
              state,
              call,
              result,
              absenceRadiusKm,
              ctx.lastInsights
            );
            steps.push({
              stepIndex: steps.length,
              planner: plannerKind,
              reason: call.reason,
              tool: call.name,
              toolArgs: { ...call.arguments, ...result.payload },
              resultSummary: result.summary,
              durationMs: Date.now() - t0,
            });
            if (toolCallIds[i]) {
              toolResultRows.push({
                toolCallId: toolCallIds[i]!,
                summary: result.observation ?? result.summary,
              });
            }
          }

          if (planner instanceof OpenAiProspectingPlannerClient && toolResultRows.length > 0) {
            planner.recordToolResults(toolResultRows);
          }

          if (steps.length >= PROSPECTING_AGENT_MAX_STEPS) break;
        }
      })(),
      PROSPECTING_AGENT_LOOP_TIMEOUT_MS,
      'prospecting agent planner'
    );
  } catch (err) {
    return {
      mode: 'dag_fallback',
      summary: 'Planner timed out or failed; using fixed analysis pipeline.',
      steps,
      state,
      dagHooks: toProspectingAgentDagHooks(state),
      plannerQlooCalls: qlooCalls,
      fallbackReason: (err as Error).message,
    };
  }

  const modelSteps = steps.filter((s) => s.planner === 'model').length;
  const actor = modelSteps > 0 ? 'Agent' : 'Rule planner';
  const summary =
    steps.length > 0
      ? `${actor} ran ${steps.length} tool step(s); ${qlooCalls} Qloo call(s); results feed analysis.`
      : `${actor} finished with no extra tools; DAG provides full analysis.`;

  return {
    mode: 'agent',
    summary,
    steps,
    state,
    dagHooks: toProspectingAgentDagHooks(state),
    plannerQlooCalls: qlooCalls,
  };
}

/** Demo wicker address for e2e parity (deterministic planner). */
export const PROSPECTING_AGENT_DEMO_ADDRESS = DEMO_CHIP_ADDRESSES.wicker;

export type { ProspectingAgentStepLog } from './prospecting-agent-state';
