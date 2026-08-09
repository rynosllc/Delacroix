-- Re-key templates by occasion slug (text) instead of uuid.
--
-- The whole client identifies templates by occasion key ('birthday',
-- 'anniversary', 'thank_you', 'just_because'): the send flow passes the key
-- through its params, review.tsx inserts it as gifts.template_id, and the
-- gifts list / claim page map it to a label. gifts.template_id is already
-- text holding those keys. Rather than introduce uuid plumbing the app never
-- uses, the curated template catalog is keyed by the slug itself.

-- 1. templates.id: uuid -> text.
alter table public.templates alter column id drop default;
alter table public.templates alter column id type text using id::text;

-- Re-key the dashboard-created rows (uuid-shaped ids) to their slug.
update public.templates
  set id = lower(replace(name, ' ', '_'))
  where id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-';

-- 2. Seed the four occasion templates so a fresh `db reset` satisfies the
--    foreign key below. No-op on the re-keyed remote rows.
insert into public.templates (id, name, ai_prompt_questions, design_asset_ref) values
  (
    'birthday', 'Birthday',
    '[
      {"id": "relationship", "question": "What is your relationship to this person?", "placeholder": "e.g. best friend, sister, coworker"},
      {"id": "memory", "question": "Share a favorite memory or inside joke with them.", "placeholder": "Optional — makes it personal"},
      {"id": "wish", "question": "What do you most want them to feel on their birthday?", "placeholder": "e.g. celebrated, loved, surprised"}
    ]'::jsonb,
    'signature'
  ),
  (
    'anniversary', 'Anniversary',
    '[
      {"id": "milestone", "question": "What anniversary is this?", "placeholder": "e.g. first year, ten years"},
      {"id": "memory", "question": "What moment stands out most from your time together?", "placeholder": "A trip, a first, a quiet night"},
      {"id": "looking_forward", "question": "What are you most looking forward to next?", "placeholder": "Optional"}
    ]'::jsonb,
    'signature'
  ),
  (
    'thank_you', 'Thank You',
    '[
      {"id": "what_for", "question": "What are you thanking them for?", "placeholder": "Be specific — it lands harder"},
      {"id": "impact", "question": "How did it make you feel or how did it help?", "placeholder": "Optional but powerful"}
    ]'::jsonb,
    'signature'
  ),
  (
    'just_because', 'Just Because',
    '[
      {"id": "vibe", "question": "What feeling do you want to send them today?", "placeholder": "e.g. you matter, thinking of you, proud of you"},
      {"id": "reason", "question": "Anything specific that prompted this?", "placeholder": "Optional — totally fine if there is no reason"}
    ]'::jsonb,
    'signature'
  )
on conflict (id) do nothing;

-- 3. gifts.template_id becomes a real foreign key. Existing gifts rows
--    already hold occasion slugs, which now match templates.id.
alter table public.gifts
  add constraint gifts_template_id_fkey
    foreign key (template_id) references public.templates (id);
