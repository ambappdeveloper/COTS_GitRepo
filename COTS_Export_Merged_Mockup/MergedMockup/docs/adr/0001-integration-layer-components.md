# ADR 0001 — Four new shared components in the integration layer

**Date** 27 August 2026
**Status** Accepted for the mockup; the promotion question is open
**Deciders** author of MergedMockup v1.3; the design-system owner has not yet been consulted
**Supersedes** nothing

---

## Context

MergedMockup v1.3 updates the Export contribution from the sixteen-phase workflow v2.0 to the
twenty-three-phase workflow v2.3, served by Export mock-up v2.4. Four things had to appear on screen
that the integrated mockup had no way to render:

1. **Where you are in a twenty-three-step process**, with a way to move one step either way.
2. **A long ordered list of destinations**, grouped so it stays navigable — twenty-three phases plus
   ten cross-cutting screens is thirty-three links, and twenty-three top-level navigation entries
   would be unusable.
3. **The platform capabilities a step uses**, as links to where they already live — so that a
   reviewer can see Export reuses Core's approval, document and audit capabilities rather than
   building its own, and a developer reading the mockup is not tempted to build a second one.
4. **What is not decided**, tagged as the source tags it. The Export workflow is a draft carrying
   twenty-two open decisions and thirty-one gap-register rows; a screen that renders those as
   ordinary behaviour turns a draft into a requirement.

The architecture standard in force says a shared capability should have **two or more real
consumers, or a recorded reason for early creation**. None of these four has a second consumer today.
This record is that reason.

## Options considered

### A. Build them inside the Export bridge screen, unexported

The straightforward option: one large `ExportScreen.tsx` with the rail, the rail's navigation, the
capability list and the open-items list inline.

- **For.** No claim of reusability to defend. No new folder. Smallest diff.
- **Against.** The bridge screen was already 440 lines before this change. All four concepts are
  needed on the module landing page as well as on the phase screen, so at least two of them would
  have been duplicated immediately — which is how the second copy of a component gets written.
  It also makes the Export-specific and the generic parts inseparable, so nothing can be lifted later
  without being untangled first.

### B. Extend the Core component set

Core publishes `components/shared.tsx`, `DataTable`, `ActivityTimeline`, `RouteProgress` and others,
and consumes a token set from `@core/theme`. Adding to that set would put the four components where a
future module would look for them.

- **For.** One component library rather than two. Tokens already exist there.
- **Against.** **It modifies the Core prototype**, which the integrated mockup's whole architecture
  is built on not doing: Core and Shared are imported in place and unmodified, and v1.2 went to
  considerable trouble — the `substituteModule` Vite plugin, the `ShellExtensions` provider — to keep
  that true. Adding four components to Core to serve one Export update would spend that architectural
  position on a convenience. It would also make the components' fate a Core release decision.

`RouteProgress` was examined specifically as a candidate to extend rather than duplicate. It is bound
to `ApprovalView`, `useStore()`, `resolveApprover()` and C04 decision data; it has no previous/next,
no route links and no compact form. Generalising it to serve a twenty-three-step process would change
its API for its existing C04 consumers. It is not a duplicate of `WorkflowStepper` and neither
replaces the other.

### C. A `src/components/` folder in the integration layer — **chosen**

Four domain-neutral components and a small token file, local to this package.

- **For.** Core and Shared stay untouched. Both integration screens use them without duplication.
  Being domain-neutral from the start means promotion later is a move, not a rewrite. The integration
  layer is the right home for something that exists because three prototypes have to be read
  together.
- **Against.** A second component library in the same application, and a token set outside the
  sanctioned one. Both are real costs and are recorded below.

## Decision

Option C. `src/components/` holds `WorkflowStepper`, `SectionNav`, `CapabilityRail`, `OpenItems` and
`tokens.ts`, all domain-neutral: no COTS or Export term appears in any of them, and every rendered
string comes from props — with the one exception recorded below.

## Consequences

### Accepted costs

- **A second component set.** A developer looking for a shared component now has two places to look.
  Mitigated only by this record and by the README pointing at it.
- **Tokens outside the design system.** `tokens.ts` names eleven colours, of which three
  (`#146089`, `#7A6A1F`, and `#3F5C3F`) are new to the product and have passed through no
  design-system review. Every one carries white text and every one is checked against white for
  4.5:1; the ratios are in the file. This is containment, not governance.
- **`OpenItems` bakes in its tag vocabulary.** `OPEN / ASSUMPTION / PROPOSED / AS-IS`, their meanings
  and their colours are constants in the component. That is the COTS workflow documents' vocabulary,
  so the component is genuinely reusable only by a consumer that shares it. `CapabilityRail` takes
  its equivalent vocabulary as an optional prop; `OpenItems` should follow when a second consumer
  needs it, and not before.
- **No automated tests.** This package has no test runner. The invariants that matter are enforced
  instead by a module-load assertion (`assertProcessInvariants`) and by `walk.mjs`, which fails the
  run on drift. That is weaker than unit tests and is stated as such.

### What would justify promoting these into the design system

Any one of the following, and the question should be put to the design-system owner when it happens:

1. **A second module needs one of them.** Import and Distribution is named in the navigation and not
   built; when it is, `SectionNav` and `WorkflowStepper` are the two most likely to be wanted.
2. **A second project needs the provenance pattern.** `CapabilityRail` and `OpenItems` together are
   a reusable answer to a general problem — reviewing a draft specification without letting the
   mockup assert things the specification does not. That is not COTS-specific, and it is the pair
   most worth promoting.
3. **The tag or section colours are wanted anywhere else**, at which point they belong in the Core
   token set rather than here.

### Revisit trigger

When Import and Distribution is built, or when a second project asks for the provenance pattern.
Whichever comes first.

## Notes on what was deliberately not done

- `WorkflowStepper` takes no `visited` prop. It had one; the first caller passed every step below the
  current one, so opening phase 22 from a bookmark marked twenty-one phases as reached when none had
  been. The component cannot know what a reader has done, and now offers no way to claim it does.
- None of the four components reads a store, a context or a route parameter. They take data and
  render it. That is what makes them testable and movable, and it is worth keeping.
