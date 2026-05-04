# Refactoring Playbook

A repeatable process for keeping pages clean, components reusable, and helpers
out of route files. Apply this when a file crosses ~300 lines, when you spot
duplication across files, or when a feature has grown into a tangle.

> **Goal of any refactor pass:** the same behavior, but smaller files, fewer
> duplicates, and clearer ownership of each concern.

---

## The three layers

Every piece of code lives in exactly one of these:

| Layer | Holds | Examples |
|---|---|---|
| `src/lib/` | Pure functions and constants. No React. | `ai-generate.ts`, `study-utils.ts`, `supabase/route-auth.ts` |
| `src/components/<feature>/` | Feature-specific UI components. | `components/study/ChapterSections.tsx` |
| `src/components/ui/` | Generic UI primitives reusable across features. | `Modal`, `Button`, `StatTile` |

`src/app/(app)/<page>/page.tsx` should be **composition only** — state, effects,
handlers, and `<Component />` calls. No inline business logic, no inline
constants, no large JSX implementations.

---

## When to refactor

Triggers (any one is enough):

- A file is over **~300 lines**.
- The same helper (function or object literal) appears in **2+ places**.
- A page file contains its own components defined locally.
- An API route has boilerplate identical to a sibling route.
- A constant (mapping, list, config) is referenced by 2+ components.
- You're about to add a feature and the surrounding code makes it awkward.

---

## The refactor recipe

Run these in order. Verify with `npx tsc --noEmit` after each step.

### 1. Survey

```bash
# Find the bloated files
wc -l src/app/(app)/*/page.tsx src/components/**/*.tsx | sort -n | tail -20

# Find duplicated function definitions
grep -rn "function generateJsonWithFallback" src/

# Find duplicated constants
grep -rn "difficultyStyles\|SECTION_ORDER" src/
```

### 2. Plan with explicit phases

Group your changes into phases that each leave the codebase compilable.
Typical order:

1. **Lib extraction** — move pure helpers/constants out of components and
   routes. Update imports. Verify.
2. **Constant consolidation** — collapse multiple copies of the same
   mapping/config into one `lib/<feature>-utils.ts`. Verify.
3. **Component extraction** — pull inline components out of pages and big
   components into their own files. Verify.
4. **Page composition** — rewrite the page file to be thin composition only.
   Verify.

### 3. Lib extraction patterns

When you see this pattern in 2+ API routes, lift it:

```ts
// Before — duplicated in 3 routes
const supabaseAuth = createServerClient(URL, KEY, { cookies: {...} });
const { data: { user } } = await supabaseAuth.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

```ts
// After — single helper
const user = await getRouteUser(request);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

The lib file:

```ts
// src/lib/supabase/route-auth.ts
export async function getRouteUser(request: NextRequest): Promise<User | null> {
  const supabase = createRouteAuthClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

Same idea for AI generation, JSON parsing, error classification — anything
mechanical and repeated.

### 4. Constant consolidation

When you see the same mapping in multiple components:

```ts
// In card AND modal — duplicated
const difficultyStyles: Record<StudyDifficulty, ...> = { ... };
```

Move to `lib/<feature>-utils.ts`, export, import:

```ts
// lib/study-utils.ts
export const DIFFICULTY_STYLES: Record<StudyDifficulty, DifficultyStyle> = { ... };

// In any component
import { DIFFICULTY_STYLES } from "@/lib/study-utils";
```

### 5. Component extraction

Pull each named inline component out of a page/big component into its own file.

Rule of thumb for splitting a single big component:
- If it has multiple internal "views" or "sections" with their own state →
  split each view into its own file.
- A shared subcomponent (used by multiple split files) goes alongside them in
  `components/<feature>/`.

Example from the Study refactor:

```
StudyChapterModal.tsx (636 lines)
└── Split into:
    ├── StudyChapterModal.tsx (215) — shell + view router + lesson loader
    ├── ChapterView.tsx (129)        — table of contents
    ├── LessonView.tsx (254)         — full lesson detail
    └── ResourceList.tsx (48)        — shared by both views
```

### 6. Page slimming

A clean page reads top-to-bottom as:

1. `"use client"` directive
2. Imports
3. Type definitions for the page (response shapes, etc.)
4. Component function
   - useState/useEffect (state + side effects)
   - Handlers (`generate`, `loadLesson`, etc.)
   - Computed values (one-liners)
   - JSX: composition of imported components

If you see inline `function Subcomponent() {}` definitions, inline constants
arrays, or 50-line JSX blocks doing rendering work, those are extraction
candidates.

---

## Naming conventions

- **Lib files:** `<feature>-utils.ts` (`study-utils.ts`, `resume-utils.ts`).
  Pure functions and exported constants. No React imports.
- **Lib modules with multiple concerns:** subfolder. `lib/supabase/server.ts`,
  `lib/supabase/client.ts`, `lib/supabase/route-auth.ts`.
- **Feature components:** `components/<feature>/<ComponentName>.tsx`.
  Components named with the feature prefix when they're feature-specific
  (`StudyChapterCard`, `StudyEmptyState`) and unprefixed when they're more
  generic-feeling (`ChapterView`, `LessonView`, `ResourceList`).
- **UI primitives:** `components/ui/<ComponentName>.tsx`. No feature prefix.

---

## What NOT to do

- **Don't change behavior in a refactor pass.** If you find a bug, note it
  and fix it in a separate commit/PR. Mixing refactors with fixes makes
  review impossible.
- **Don't pre-emptively over-abstract.** A function used once is fine where
  it is. Wait for the second copy before lifting to lib.
- **Don't break public types.** If shared types are used outside the file you're
  changing, keep their shape stable.
- **Don't leave dead code.** Deleted in-page helpers should not linger as
  exports nobody imports.
- **Don't skip `tsc --noEmit` between phases.** It's the cheapest verification
  you have. A compile failure 10 minutes ago is much easier to fix than 10
  files later.

---

## Checklist for a refactor PR

- [ ] No file over ~350 lines (UI components and big modals can run longer
      with justification).
- [ ] No `function <Component>() {}` defined inline in `page.tsx`.
- [ ] No constant mapping or array literal duplicated across files.
- [ ] API route auth/AI helpers come from `lib/`, not redefined in route.
- [ ] Cross-feature primitives sit in `components/ui/`, not feature folders.
- [ ] `npx tsc --noEmit` exit 0.
- [ ] No behavior change vs. main (grep for changed function bodies you
      didn't intend to touch).
- [ ] If pages or directory structure changed, READMEs are updated.

---

## A worked example

The Study feature was refactored in one pass using this playbook. The shape
of the diff:

| File | Before | After |
|---|---|---|
| `app/(app)/study/page.tsx` | 448 | 209 |
| `components/study/StudyChapterModal.tsx` | 636 | 215 |
| 3 × `app/api/study-plan/*/route.ts` | ~770 total | ~620 total |
| New `lib/ai-generate.ts` | — | 67 |
| New `lib/supabase/route-auth.ts` | — | 32 |
| New `lib/study-utils.ts` (added constants) | 52 | 120 |
| New `components/study/ChapterSections.tsx` | — | 128 |
| New `components/study/ChapterView.tsx` | — | 129 |
| New `components/study/LessonView.tsx` | — | 254 |
| New `components/study/ResourceList.tsx` | — | 48 |
| New `components/study/StudyEmptyState.tsx` | — | 65 |
| New `components/study/StudyBanners.tsx` | — | 83 |
| New `components/ui/StatTile.tsx` | — | 22 |

Same behavior. No new dependencies. Each component is now reusable on its
own and each route handler reads as intent rather than boilerplate.
