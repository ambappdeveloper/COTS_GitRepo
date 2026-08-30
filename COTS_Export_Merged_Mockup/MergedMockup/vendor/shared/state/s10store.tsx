import React, { createContext, useContext, useState } from 'react';
import {
  ASSIGNMENTS, HISTORIC_ASSIGNMENTS, LEADERSHIP, MANDATORY_ATTRIBUTES, ORG_NODES, PEOPLE, ROLES,
  countryOf, nodeById, personById, type Assignment, type Leadership, type OrgNode, type Person,
} from '../mockData/s10';

export type MasterSource = 'Maintained in COTS' | 'Read from the corporate directory';

export type Gap = {
  role: string;
  roleId: string;
  where: string;
  condition:
    | 'Not assigned'
    | 'Assigned but not a system user'
    | 'Assigned to an inactive person'
    | 'Area with no leading team'
    | 'Country with no named administrator';
  dependsOn: { label: string; to?: string }[];
  consequence: string;
  since: string;
  owner: string;
};

type Ctx = {
  nodes: OrgNode[];
  people: Person[];
  assignments: Assignment[];
  leadership: Leadership[];
  roles: typeof ROLES;

  assign: (roleId: string, country: string, areaId: string | undefined, personId: string) => void;
  updateNode: (id: string, patch: Partial<OrgNode>) => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;

  /** the question with the widest consequence in this module */
  source: MasterSource;
  setSource: (s: MasterSource) => void;
  editable: boolean;

  /** whether external partner contacts appear in the directory at all */
  showExternalPartners: boolean;
  setShowExternalPartners: (v: boolean) => void;

  /** §S10.4 — which attributes are mandatory is configuration */
  mandatory: typeof MANDATORY_ATTRIBUTES;
  toggleMandatory: (attribute: string) => void;

  gaps: Gap[];
  resolve: (roleId: string, country: string, areaId?: string) => {
    ok: boolean;
    person?: Person;
    account?: string;
    reason?: string;
    path: string[];
    matched?: Assignment;
  };
  resolveAsAt: (roleId: string, country: string, date: string) => { person?: Person; from: string; to: string } | null;
};

const C = createContext<Ctx | null>(null);
export const useS10 = () => {
  const c = useContext(C);
  if (!c) throw new Error('S10Provider missing');
  return c;
};

const AREA_NODES = ORG_NODES.filter((n) => n.type === 'Operational area' && n.active);

export function S10Provider({ children }: { children: React.ReactNode }) {
  const [nodes, setNodes] = useState<OrgNode[]>(() => JSON.parse(JSON.stringify(ORG_NODES)));
  const [people, setPeople] = useState<Person[]>(() => JSON.parse(JSON.stringify(PEOPLE)));
  const [assignments, setAssignments] = useState<Assignment[]>(() => JSON.parse(JSON.stringify(ASSIGNMENTS)));
  const [leadership] = useState<Leadership[]>(() => JSON.parse(JSON.stringify(LEADERSHIP)));
  const [source, setSource] = useState<MasterSource>('Maintained in COTS');
  const [showExternalPartners, setShowExternalPartners] = useState(true);
  const [mandatory, setMandatory] = useState(() => JSON.parse(JSON.stringify(MANDATORY_ATTRIBUTES)));

  const editable = source === 'Maintained in COTS';

  const findPerson = (id?: string) => people.find((p) => p.id === id);

  /* -------------------------------------------------- role resolution */
  const resolve: Ctx['resolve'] = (roleId, country, areaId) => {
    const role = ROLES.find((r) => r.id === roleId)!;
    const path = areaId
      ? [`Operational area: ${nodeById(areaId)?.name}`, `Country: ${country}`]
      : [`Country: ${country}`];

    const matched = assignments.find(
      (a) => a.roleId === roleId && a.country === country && (role.scope === 'Country' || a.areaId === areaId),
    );

    if (!matched) {
      return { ok: false, reason: `No holder is assigned for ${role.name} in ${areaId ? nodeById(areaId)?.name : country}.`, path };
    }
    const person = findPerson(matched.personId);
    if (!person) return { ok: false, reason: 'The assigned person no longer exists in the directory.', path, matched };
    if (!person.active) {
      return { ok: false, person, reason: `${person.name} is inactive — they left on ${person.leftOn}.`, path, matched };
    }
    if (!person.userAccount) {
      return {
        ok: false, person,
        reason: `${person.name} holds the role but has no linked user account, so they can be notified but cannot approve in COTS.`,
        path, matched,
      };
    }
    return { ok: true, person, account: person.userAccount, path, matched };
  };

  const resolveAsAt: Ctx['resolveAsAt'] = (roleId, country, date) => {
    const d = (s: string) => new Date(s.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')).getTime();
    const t = d(date);
    const all = [...assignments, ...HISTORIC_ASSIGNMENTS].filter((a) => a.roleId === roleId && a.country === country);
    const hit = all.find((a) => d(a.effectiveFrom) <= t && (!a.effectiveTo || d(a.effectiveTo) >= t));
    if (!hit) return null;
    return { person: findPerson(hit.personId), from: hit.effectiveFrom, to: hit.effectiveTo ?? 'current' };
  };

  /* --------------------------------------------------------- the gaps */
  const gaps: Gap[] = [];
  const countries = nodes.filter((n) => n.type === 'Country' && n.active);

  // countries with no named administrator — ordered first, because a gap with no owner is worse
  for (const c of countries) {
    if (!c.administrator) {
      gaps.push({
        role: 'Country administrator', roleId: '—', where: c.name,
        condition: 'Country with no named administrator',
        dependsOn: [{ label: 'Every directory and structure change in this country' }],
        consequence: 'No one is named to maintain the structure, the directory or the role assignments for this country.',
        since: 'Since the country was created', owner: 'Not assigned',
      });
    }
  }

  for (const role of ROLES) {
    for (const c of countries) {
      const owner = personById(c.administrator)?.name ?? `${c.name} administrator — not assigned`;
      const targets = role.scope === 'Country'
        ? [{ areaId: undefined as string | undefined, where: c.name }]
        : AREA_NODES.filter((a) => countryOf(a.id) === c.name).map((a) => ({ areaId: a.id, where: `${c.name} · ${a.name}` }));

      for (const t of targets) {
        const r = resolve(role.id, c.name, t.areaId);
        if (r.ok) continue;
        const condition: Gap['condition'] = !r.matched
          ? 'Not assigned'
          : r.person && !r.person.active
            ? 'Assigned to an inactive person'
            : 'Assigned but not a system user';
        gaps.push({
          role: role.name, roleId: role.id, where: t.where, condition,
          dependsOn: role.usedBy,
          consequence:
            condition === 'Not assigned'
              ? `${role.usedBy[0]?.label ?? 'A workflow'} cannot route in ${t.where}.`
              : condition === 'Assigned to an inactive person'
                ? `${r.person?.name} left on ${r.person?.leftOn} and is still assigned, so ${role.usedBy[0]?.label ?? 'the workflow'} routes to nobody.`
                : `${r.person?.name} can be notified but cannot approve, so ${role.usedBy[0]?.label ?? 'the workflow'} stalls at the approval step.`,
          since: condition === 'Assigned to an inactive person' ? '19 days' : '22 days',
          owner,
        });
      }
    }
  }

  // areas with no leading team
  for (const a of AREA_NODES) {
    if (!leadership.some((l) => l.areaId === a.id && !l.superseded)) {
      const c = nodes.find((n) => n.name === countryOf(a.id));
      gaps.push({
        role: 'Area leading team', roleId: '—', where: `${countryOf(a.id)} · ${a.name}`,
        condition: 'Area with no leading team',
        dependsOn: [{ label: 'Directory search — who is responsible here' }],
        consequence: 'The directory has no answer to who is responsible for this area.',
        since: '—',
        owner: personById(c?.administrator)?.name ?? `${countryOf(a.id)} administrator — not assigned`,
      });
    }
  }

  const value: Ctx = {
    nodes, people, assignments, leadership, roles: ROLES,
    assign: (roleId, country, areaId, personId) =>
      setAssignments((p) => {
        const rest = p.filter((a) => !(a.roleId === roleId && a.country === country && a.areaId === areaId));
        return [...rest, { roleId, country, areaId, personId, effectiveFrom: '19-Aug-2026' }];
      }),
    updateNode: (id, patch) => setNodes((p) => p.map((n) => (n.id === id ? { ...n, ...patch } : n))),
    updatePerson: (id, patch) => setPeople((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    source, setSource, editable,
    showExternalPartners, setShowExternalPartners,
    mandatory,
    toggleMandatory: (attribute) =>
      setMandatory((p: typeof MANDATORY_ATTRIBUTES) =>
        p.map((m) => (m.attribute === attribute && !m.fixed ? { ...m, mandatory: !m.mandatory } : m))),
    gaps,
    resolve,
    resolveAsAt,
  };

  return <C.Provider value={value}>{children}</C.Provider>;
}
