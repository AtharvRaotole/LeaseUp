import type { Location } from '@leaseup/contracts';
import {
  DEMO_CHIP_ADDRESSES,
  matchDemoFixtureId,
  wickerparkFixture,
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

export type ProspectingAgentStepLog = {
  stepIndex: number;
  reason: string;
  tool: ProspectingAgentToolName;
  toolArgs: Record<string, unknown>;
  resultSummary: string;
  durationMs: number;
};

export type ProspectingAgentPlanResult = {
  mode: 'agent' | 'dag_fallback';
  summary: string;
  steps: ProspectingAgentStepLog[];
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
    const fixtureId = input.fixtureId ?? matchDemoFixtureId(input.location.address);
    const topEntity =
      fixtureId === 'wicker'
        ? wickerparkFixture.insights[0]?.entity_id
        : input.stepsSoFar.find((s) => s.tool === 'qloo_brand_insights')?.toolArgs?.topEntityId;

    if (this.turn === 0) {
      this.turn += 1;
      return {
        assistantReason: 'Baseline taste read; confirm Qloo panel depth for this site.',
        toolCalls: [
          {
            name: 'qloo_brand_insights',
            reason: 'Initial affinity panel before store absence scan.',
            arguments: { take: 50 },
          },
        ],
        done: false,
      };
    }

    if (this.turn === 1 && fixtureId) {
      this.turn += 1;
      const candidate =
        wickerparkFixture.insights.find((r) => r.affinity_rank <= 5)?.entity_id ?? topEntity;
      return {
        assistantReason: 'Dense urban stratum; verify nearest store for a top-ranked candidate.',
        toolCalls: [
          {
            name: 'nearest_store_check',
            reason: 'ATP/OSM may disagree on Chicago retail corridors.',
            arguments: { entityId: candidate },
          },
        ],
        done: false,
      };
    }

    if (this.turn === 2) {
      this.turn += 1;
      const entityId =
        (input.stepsSoFar.find((s) => s.tool === 'nearest_store_check')?.toolArgs.entityId as string) ??
        wickerparkFixture.insights[0]?.entity_id;
      return {
        assistantReason: 'Load stratum-specific trade-area enrichment when panel is thin.',
        toolCalls: [
          {
            name: 'enrich_site_stratum',
            reason: 'Attach verified local audience overlap for pitch reasons.',
            arguments: entityId ? { entityId } : {},
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
}): Promise<ProspectingAgentPlanResult> {
  const mode = params.env.APP_MODE === 'live' ? 'live' : 'demo';
  const fixtureId = matchDemoFixtureId(params.location.address);

  let planner: ProspectingPlannerClient | OpenAiProspectingPlannerClient | null =
    params.planner ??
    createOpenAiProspectingPlannerClient(params.env) ??
    (mode === 'demo' && fixtureId ? new DemoProspectingPlannerClient() : null);

  if (!planner) {
    return {
      mode: 'dag_fallback',
      summary: 'OpenAI planner unavailable; using fixed analysis pipeline.',
      steps: [],
      fallbackReason: 'no_planner',
    };
  }

  const ctx: ProspectingAgentToolContext = {
    env: params.env,
    location: params.location,
    radiusKm: params.radiusKm,
    runId: params.runId,
    qloo: params.qloo,
    mode,
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
                reason: 'Qloo call budget reached',
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
            steps.push({
              stepIndex: steps.length,
              reason: call.reason,
              tool: call.name,
              toolArgs: { ...call.arguments, ...result.payload },
              resultSummary: result.summary,
              durationMs: Date.now() - t0,
            });
            if (toolCallIds[i]) {
              toolResultRows.push({ toolCallId: toolCallIds[i]!, summary: result.summary });
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
      fallbackReason: (err as Error).message,
    };
  }

  const summary =
    steps.length > 0
      ? `Agent ran ${steps.length} tool step(s); ${qlooCalls} Qloo call(s).`
      : 'Agent finished with no extra tools; DAG provides full analysis.';

  return { mode: 'agent', summary, steps };
}

/** Demo wicker address for e2e parity (deterministic planner). */
export const PROSPECTING_AGENT_DEMO_ADDRESS = DEMO_CHIP_ADDRESSES.wicker;
