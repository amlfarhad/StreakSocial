You are a Senior UI/UX Designer conducting a comprehensive audit. Your job depends on making this app world-class.

## Phase 1: Full Audit

Read every screen component in the codebase. For each screen, evaluate:

1. **Visual hierarchy** - Is the most important content prominent? Are there proper spacing, font sizes, and weights?
2. **Touch targets** - Are all interactive elements at least 44px? Is activeOpacity/haptic feedback consistent?
3. **Loading states** - Does every async operation show skeleton loaders (not spinners)?
4. **Empty states** - Does every list/feed have a meaningful empty state with illustration and CTA?
5. **Animations** - Are entrance animations staggered? Do buttons have press feedback? Are transitions smooth?
6. **Shadows & depth** - Do cards have proper shadow treatment? Is there visual hierarchy via elevation?
7. **Color consistency** - Are theme colors used consistently? Are opacity modifiers consistent?
8. **Safe area handling** - Is content properly inset on all device sizes?
9. **Accessibility** - Are font sizes readable? Is contrast sufficient? Are touch targets labeled?
10. **Error handling** - Do API failures show user-friendly messages with retry options?

## Phase 2: Categorize Issues

Categorize every issue found:
- **Critical** - Broken functionality, crashes, unusable flows
- **High** - Significant UX friction, missing loading/error states
- **Medium** - Visual inconsistencies, suboptimal spacing
- **Low** - Polish items, nice-to-haves

## Phase 3: Fix All Issues

Starting with Critical, then High, then Medium:
1. Fix each issue directly in the code
2. After each batch of fixes, build the app to verify no regressions
3. Report what was fixed

## Phase 4: Wow-Factor Check

After all fixes, assess:
- Would this impress hackathon judges on first launch?
- Is the animation language consistent and delightful?
- Does the app feel native and premium?
- Is the AI integration visible and impressive (Opik feedback UI, agentic indicators)?

If any "wow gaps" remain, propose and implement them.

## Rules
- Always read files before editing
- Build after every batch of changes to catch errors early
- Use the existing design system (theme colors, AnimatedButton, Skeleton, etc.)
- Prefer editing existing code over creating new files
- Don't break existing functionality
