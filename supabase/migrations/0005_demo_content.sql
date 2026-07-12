-- Demo-content privacy pass: remove the "Algo Trading Framework" demo project
-- (it mirrored the owner's real interests) and replace it with a fabricated
-- AI-entrepreneur project. Cascades take its phases, tasks, thoughts, and
-- summaries with it.

delete from projects where id = 'a1b2c3d4-0002-0002-0002-000000000002';

insert into projects (id, title, summary, vision, why_it_matters, success_criteria, technical_notes, status, start_date, last_updated) values (
  'a1b2c3d4-0005-0005-0005-000000000005',
  'AI Side-Hustle Studio',
  'A portfolio of tiny AI products working toward financial independence.',
  'Three small AI-powered products each earning $500+/month, running themselves in under five hours a week combined.',
  'A salary alone never compounds. Small AI products do: every launch teaches distribution, and a portfolio de-risks any single flop. This is the long game toward financial independence.',
  'First product reaches $500 MRR; portfolio reaches $1,500 MRR within 12 months; nothing needs more than a weekly review to keep running.',
  'Per product: Next.js + Supabase + Stripe + one LLM API. Two-week build windows. Kill anything with zero traction after 60 days — no zombie products.',
  'Paused',
  '2024-01-10',
  now() - interval '45 days'
)
on conflict (id) do nothing;

insert into phases (id, project_id, title, sort_order, status) values
('b5000005-0005-0005-0005-000000000001', 'a1b2c3d4-0005-0005-0005-000000000005', 'Validate three niches', 1, 'done'),
('b5000005-0005-0005-0005-000000000002', 'a1b2c3d4-0005-0005-0005-000000000005', 'Ship product #1 — CV tailor', 2, 'in_progress'),
('b5000005-0005-0005-0005-000000000003', 'a1b2c3d4-0005-0005-0005-000000000005', 'Build the distribution engine', 3, 'planned')
on conflict (id) do nothing;

insert into tasks (id, project_id, phase_id, title, status) values
('c5000005-0005-0005-0005-000000000001', 'a1b2c3d4-0005-0005-0005-000000000005', 'b5000005-0005-0005-0005-000000000001', 'Interview 10 job seekers about CV pain points', 'done'),
('c5000005-0005-0005-0005-000000000002', 'a1b2c3d4-0005-0005-0005-000000000005', 'b5000005-0005-0005-0005-000000000001', 'Pick niche #1 by willingness-to-pay, not excitement', 'done'),
('c5000005-0005-0005-0005-000000000003', 'a1b2c3d4-0005-0005-0005-000000000005', 'b5000005-0005-0005-0005-000000000002', 'Build the tailoring flow end-to-end (upload → tailored CV)', 'doing'),
('c5000005-0005-0005-0005-000000000004', 'a1b2c3d4-0005-0005-0005-000000000005', 'b5000005-0005-0005-0005-000000000002', 'Wire Stripe checkout with a launch price', 'todo'),
('c5000005-0005-0005-0005-000000000005', 'a1b2c3d4-0005-0005-0005-000000000005', 'b5000005-0005-0005-0005-000000000003', 'Write the SEO comparison pages that fed niche #1', 'todo')
on conflict (id) do nothing;

insert into thoughts (id, project_id, body, section_tag, section_tag_source, section_tag_confidence, created_at) values
('d5000005-0005-0005-0005-000000000001', 'a1b2c3d4-0005-0005-0005-000000000005',
 'Realized distribution is the actual product. The AI part took a weekend; getting 100 people to see it is the real build.',
 'insight', 'demo:seed', 0.9, now() - interval '52 days'),
('d5000005-0005-0005-0005-000000000002', 'a1b2c3d4-0005-0005-0005-000000000005',
 'Decided to charge from day one. Free tiers attract feedback from people who will never pay — the wrong signal entirely.',
 'decision', 'demo:seed', 0.9, now() - interval '49 days'),
('d5000005-0005-0005-0005-000000000003', 'a1b2c3d4-0005-0005-0005-000000000005',
 'Assumption: people will pay for outcomes, not AI. Nobody buys "GPT-powered" — they buy "interview next week".',
 'assumption', 'demo:seed', 0.9, now() - interval '47 days'),
('d5000005-0005-0005-0005-000000000004', 'a1b2c3d4-0005-0005-0005-000000000005',
 'Pausing while day-job crunch passes. Next step when I return: finish Stripe checkout — the tailoring flow already works on my test CVs.',
 'decision', 'demo:seed', 0.9, now() - interval '45 days')
on conflict (id) do nothing;

insert into project_summaries (
  project_id, generated_at,
  problem_being_solved, problem_being_solved_source, problem_being_solved_confidence, problem_being_solved_review_status,
  why_worth_it, why_worth_it_source, why_worth_it_confidence, why_worth_it_review_status,
  what_learned, what_learned_source, what_learned_confidence, what_learned_review_status,
  assumptions_changed, assumptions_changed_source, assumptions_changed_confidence, assumptions_changed_review_status,
  current_best_understanding, current_best_understanding_source, current_best_understanding_confidence, current_best_understanding_review_status,
  highest_leverage_next_step, highest_leverage_next_step_source, highest_leverage_next_step_confidence, highest_leverage_next_step_review_status
) values (
  'a1b2c3d4-0005-0005-0005-000000000005', now() - interval '3 days',
  'Escaping salary dependence by building a portfolio of small AI products that earn while I sleep.',
  'demo:seed', 0.9, 'reviewed',
  'Each product compounds distribution skills, and a portfolio de-risks any single failure — the path to financial independence that a paycheck can''t offer.',
  'demo:seed', 0.88, 'reviewed',
  'Distribution is the real product; the AI is a weekend of work. Charging from day one filters for real demand.',
  'demo:seed', 0.9, 'reviewed',
  'Dropped "people pay for AI" — they pay for outcomes. Repositioned everything around the result, not the model.',
  'demo:seed', 0.87, 'reviewed',
  'Product #1 (CV tailor) works end-to-end on test data; it is paused mid-launch with only payments left before going live.',
  'demo:seed', 0.9, 'reviewed',
  'Finish the Stripe checkout and put a price on it — everything else is already built.',
  'demo:seed', 0.92, 'reviewed'
);
