/**
 * MELO Mock Data
 * 
 * Realistic demo payloads for the "Find best laptop under ₹80,000" scenario.
 * All payloads match shared/ schemas.
 */
import { EventTypes } from '../state/EventTypes.js';

const TASK_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

function actionId() {
  return crypto.randomUUID?.() || `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Returns a full mock event sequence for the demo scenario.
 * Each entry: { event, data, delay (ms before this event fires) }
 */
export function createMockScenario(goal = 'Find the best laptop under ₹80,000 for a computer science student') {
  const actId1 = actionId();
  const actId2 = actionId();
  const actId3 = actionId();
  const actId4 = actionId();

  return [
    // ── TASK CREATED ──
    {
      delay: 800,
      event: EventTypes.TASK_CREATED,
      data: {
        task_id: TASK_ID,
        goal,
        created_at: new Date().toISOString(),
      },
    },

    // ── PLAN CREATED ──
    {
      delay: 2000,
      event: EventTypes.PLAN_CREATED,
      data: {
        task_id: TASK_ID,
        objective: goal,
        steps: [
          'Understand requirements and constraints',
          'Search for laptop candidates in the budget range',
          'Verify current pricing and availability',
          'Compare specifications and value',
          'Generate final recommendation',
        ],
        status: 'in_progress',
      },
    },

    // ── ACTION 1: Understand requirements ──
    {
      delay: 1500,
      event: EventTypes.ACTION_STARTED,
      data: {
        task_id: TASK_ID,
        action_id: actId1,
        action: 'analyze_requirements',
        reason: 'Breaking down the user goal into specific requirements',
        parameters: { goal, constraints: ['budget: ₹80,000', 'use case: CS student'] },
      },
    },
    {
      delay: 2000,
      event: EventTypes.ACTION_COMPLETED,
      data: {
        task_id: TASK_ID,
        action_id: actId1,
        success: true,
        summary: 'Requirements analyzed',
        data: {
          requirements: ['Good CPU performance', '16GB+ RAM', 'SSD storage', 'Good display', 'Portable'],
        },
        metadata: { duration_ms: 1800 },
      },
    },

    // ── ACTION 2: Web Search ──
    {
      delay: 1200,
      event: EventTypes.ACTION_STARTED,
      data: {
        task_id: TASK_ID,
        action_id: actId2,
        action: 'web_search',
        reason: 'Searching for laptop candidates under ₹80,000',
        parameters: { query: 'best laptops under 80000 INR for programming 2026' },
      },
    },
    {
      delay: 3000,
      event: EventTypes.ACTION_COMPLETED,
      data: {
        task_id: TASK_ID,
        action_id: actId2,
        success: true,
        summary: '12 laptop candidates found',
        data: {
          result_count: 12,
          top_results: ['ASUS Vivobook Pro 15', 'Lenovo IdeaPad Pro 5', 'HP Pavilion Plus 14', 'Acer Aspire 5'],
        },
        metadata: { source: 'web_search', duration_ms: 2800 },
      },
    },

    // ── OBSERVATION ──
    {
      delay: 1000,
      event: EventTypes.OBSERVATION_RECEIVED,
      data: {
        task_id: TASK_ID,
        action_id: actId2,
        summary: 'Found 12 laptop models. Model names and general specs available but current pricing data is from cached results — may be outdated.',
        relevant: true,
        complete: false,
        quality: 0.65,
        issues: ['Pricing data may be outdated', 'No verified availability status'],
      },
    },

    // ── EVALUATION (INCOMPLETE) ──
    {
      delay: 1500,
      event: EventTypes.EVALUATION_STARTED,
      data: { task_id: TASK_ID },
    },
    {
      delay: 2500,
      event: EventTypes.EVALUATION_COMPLETED,
      data: {
        task_id: TASK_ID,
        status: 'incomplete',
        requirements_met: [
          'Found 12 candidate laptops',
          'Specifications collected for top models',
          'Budget constraint identified',
        ],
        requirements_missing: [
          'Current, verified pricing not confirmed',
          'Availability status unknown',
          'No head-to-head comparison performed',
        ],
        reason: 'Price information may be outdated. Cannot confirm budget compliance without current pricing.',
        recommended_action: 'Verify current prices from a reliable source',
      },
    },

    // ══════════════════════════════
    //   THE REPLAN MOMENT
    // ══════════════════════════════

    // ── REPLAN STARTED ──
    {
      delay: 2000,
      event: EventTypes.REPLAN_STARTED,
      data: {
        task_id: TASK_ID,
        reason: 'Price information incomplete — need to verify current pricing',
      },
    },

    // ── PLAN UPDATED ──
    {
      delay: 2500,
      event: EventTypes.PLAN_UPDATED,
      data: {
        task_id: TASK_ID,
        objective: goal,
        steps: [
          'Verify current pricing from official sources',
          'Filter models that exceed budget',
          'Perform detailed comparison of remaining candidates',
          'Generate final recommendation with confidence score',
        ],
        status: 'in_progress',
      },
    },

    // ── ACTION 3: Verify prices ──
    {
      delay: 1500,
      event: EventTypes.ACTION_STARTED,
      data: {
        task_id: TASK_ID,
        action_id: actId3,
        action: 'web_search',
        reason: 'Verifying current pricing from official retailer sites',
        parameters: { query: 'ASUS Vivobook Pro 15 Lenovo IdeaPad Pro 5 HP Pavilion Plus 14 price India 2026' },
      },
    },
    {
      delay: 3000,
      event: EventTypes.ACTION_COMPLETED,
      data: {
        task_id: TASK_ID,
        action_id: actId3,
        success: true,
        summary: 'Current prices verified for 8 models',
        data: {
          verified_count: 8,
          within_budget: 5,
          prices: {
            'ASUS Vivobook Pro 15': '₹74,990',
            'Lenovo IdeaPad Pro 5': '₹76,490',
            'HP Pavilion Plus 14': '₹79,990',
            'Acer Aspire 5': '₹62,990',
          },
        },
        metadata: { source: 'web_search', duration_ms: 2600 },
      },
    },

    // ── ACTION 4: Compare & generate recommendation ──
    {
      delay: 1200,
      event: EventTypes.ACTION_STARTED,
      data: {
        task_id: TASK_ID,
        action_id: actId4,
        action: 'analyze_requirements',
        reason: 'Comparing verified candidates and generating recommendation',
        parameters: { task: 'compare_and_recommend' },
      },
    },
    {
      delay: 2500,
      event: EventTypes.ACTION_COMPLETED,
      data: {
        task_id: TASK_ID,
        action_id: actId4,
        success: true,
        summary: 'Recommendation generated',
        data: { recommendation: 'ASUS Vivobook Pro 15' },
        metadata: { duration_ms: 2200 },
      },
    },

    // ── OBSERVATION ──
    {
      delay: 800,
      event: EventTypes.OBSERVATION_RECEIVED,
      data: {
        task_id: TASK_ID,
        action_id: actId4,
        summary: 'Comprehensive comparison completed with verified pricing. Clear winner identified based on performance-per-rupee ratio.',
        relevant: true,
        complete: true,
        quality: 0.92,
        issues: [],
      },
    },

    // ── FINAL EVALUATION (PASS) ──
    {
      delay: 1500,
      event: EventTypes.EVALUATION_STARTED,
      data: { task_id: TASK_ID },
    },
    {
      delay: 2000,
      event: EventTypes.EVALUATION_COMPLETED,
      data: {
        task_id: TASK_ID,
        status: 'pass',
        requirements_met: [
          'Multiple candidates identified and compared',
          'Current pricing verified from reliable sources',
          'All recommended models within ₹80,000 budget',
          'Specifications compared for CS student use case',
          'Clear recommendation with reasoning provided',
        ],
        requirements_missing: [],
        reason: 'All requirements satisfied. Recommendation is well-supported by verified data.',
      },
    },

    // ── TASK COMPLETED ──
    {
      delay: 1500,
      event: EventTypes.TASK_COMPLETED,
      data: {
        task_id: TASK_ID,
        result: `🏆 Best Laptop Under ₹80,000 for CS Students

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🥇 Top Pick: ASUS Vivobook Pro 15 — ₹74,990

• AMD Ryzen 7 7735HS processor
• 16GB DDR5 RAM
• 512GB NVMe SSD
• 15.6" OLED display (2880×1620)
• 70Wh battery, ~8 hours
• Weight: 1.8kg

Why this one: Best balance of performance, display quality, and value. The OLED display is exceptional for the price, and the Ryzen 7 handles compilation, VMs, and multitasking with ease.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🥈 Runner-up: Lenovo IdeaPad Pro 5 — ₹76,490
🥉 Also consider: Acer Aspire 5 — ₹62,990 (budget-friendly)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Note: Prices verified as of ${new Date().toLocaleDateString('en-IN')}. Prices may vary by retailer.`,
      },
    },
  ];
}
