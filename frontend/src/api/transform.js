// Translate the agentic-pipeline `skilldna_payload` into the role→industry→skill
// tree the CareerPathwayMap consumes.
//
// The payload's primary container is `target_roles` (5 items each with
// `required_skills` nested). The UI wants a 3-level drilldown:
//
//   Role  ─►  Michigan Industries  ─►  Skills to Learn
//
// Since each role in the payload carries a single primary `industry_sector`
// (from the LMI row that role came from) plus per-required-skill
// `top_hiring_industries`, we synthesize the middle "industries" layer by
// union'ing those two sources, then routing required_skills to the
// industries that hire for them.

const DEFAULT_INDUSTRY = 'Michigan — All Sectors'
const MAX_INDUSTRIES_PER_ROLE = 3
const MAX_SKILLS_PER_INDUSTRY = 6
// Phase F8 caps — match the backend's STRICT mode.
const MAX_ROLES = 5
const MAX_USER_SKILLS = 15

function pct(value) {
  if (value === null || value === undefined) return null
  const n = Number(value)
  if (Number.isNaN(n)) return null
  // values may come in 0-1 or 0-100; normalize to 0-100 integer.
  return n <= 1 ? Math.round(n * 100) : Math.round(n)
}

function fmtSalary(role) {
  return role.salary_range || '—'
}

function pickIndustriesForRole(role) {
  const seen = new Set()
  const industries = []

  const push = (name) => {
    if (!name) return
    const key = name.trim().toLowerCase()
    if (!key || seen.has(key)) return
    seen.add(key)
    industries.push(name.trim())
  }

  // 1. The role's primary LMI industry sector wins first slot.
  push(role.industry_sector)

  // 2. Cross-cut from required_skills' top_hiring_industries.
  for (const skill of role.required_skills || []) {
    for (const ind of skill.top_hiring_industries || []) {
      push(ind)
      if (industries.length >= MAX_INDUSTRIES_PER_ROLE) break
    }
    if (industries.length >= MAX_INDUSTRIES_PER_ROLE) break
  }

  // Ensure at least one industry.
  if (industries.length === 0) push(DEFAULT_INDUSTRY)
  return industries
}

function skillIsForIndustry(skill, industry) {
  if (!skill.top_hiring_industries || skill.top_hiring_industries.length === 0) return true
  const target = (industry || '').trim().toLowerCase()
  return skill.top_hiring_industries.some(
    (ind) => (ind || '').trim().toLowerCase() === target
  )
}

function buildSkillNode(skill, roleId, industryId, idx) {
  // Map required_skill -> the shape the click-into pop-up expects.
  const resources = (skill.learning_resources || []).map((r) => ({
    title: r.title,
    provider: r.provider,
    url: r.url,
    duration: r.duration,
    cost: r.cost,
  }))

  // Build a course list — what the current UI renders.
  const courses = resources
    .slice(0, 4)
    .map((r) => {
      const meta = [r.provider, r.duration, r.cost].filter(Boolean).join(' · ')
      return meta ? `${r.title} (${meta})` : r.title
    })

  // "How to prepare" — synthesize a one-liner from momentum + automation_risk.
  let prep = ''
  if (skill.momentum && skill.momentum !== 'unknown') {
    prep += `${skill.momentum[0].toUpperCase() + skill.momentum.slice(1)} momentum in MI`
  }
  if (skill.automation_risk) {
    prep += `${prep ? '; ' : ''}automation risk: ${skill.automation_risk.replace('_', ' ')}`
  }
  if (skill.salary_range_michigan) {
    prep += `${prep ? '. ' : ''}Typical MI pay range: ${skill.salary_range_michigan}`
  }
  if (!prep) prep = 'Start with the resources listed above.'

  // "Detail" describes what the skill is + signal.
  const detailParts = []
  if (skill.is_match) {
    detailParts.push('You already have this skill — it counts toward your match score.')
  }
  if (typeof skill.demand_score === 'number') {
    detailParts.push(`MI demand index: ${Math.round(skill.demand_score * 100)}/100`)
  }
  if (skill.growth_indicator) {
    detailParts.push(`Growth: ${skill.growth_indicator}`)
  }
  if (skill.similar_skills && skill.similar_skills.length) {
    const sims = skill.similar_skills
      .slice(0, 3)
      .map((s) => s.skill || s.name)
      .filter(Boolean)
    if (sims.length) detailParts.push(`Often paired with: ${sims.join(', ')}`)
  }
  if (skill.used_in_roles && skill.used_in_roles.length) {
    detailParts.push(
      `Also used in: ${skill.used_in_roles.slice(0, 2).join(', ')}`
    )
  }
  const detail = detailParts.join('. ') + (detailParts.length ? '.' : '')

  return {
    id: `${roleId}_${industryId}_s${idx}`,
    name: skill.name,
    is_match: !!skill.is_match,
    momentum: skill.momentum,
    detail,
    courses: courses.length ? courses : ['No curated resources yet — try the IBM SkillsBuild catalog at skillsbuild.org.'],
    prep,
    resources, // raw resources for richer rendering if needed
  }
}

function buildIndustryNode(industry, role, roleId, idx) {
  const industryId = `${roleId}_i${idx}`
  // Acceptance % — use transition_confidence_score (0.55-0.85 band) and
  // shift to 0-100 so the UI label stays roughly the same scale.
  const accept = pct(role.transition_confidence_score)

  // Description: friction explanation + demand/growth signal.
  const fricExp = role.friction?.explanation || ''
  const demand = role.demand_share_pct != null ? `MI demand share ${role.demand_share_pct}%` : null
  const growth = role.growth_pct != null ? `growth ${role.growth_pct > 0 ? '+' : ''}${role.growth_pct}%` : null
  const description = [
    `Primary hiring industry for ${role.role} in Michigan.`,
    [demand, growth].filter(Boolean).join(' · '),
    fricExp,
  ].filter(Boolean).join(' ')

  // Pick skills for this industry; if none match, fall back to all skills.
  const allSkills = role.required_skills || []
  let skillsForInd = allSkills.filter((s) => skillIsForIndustry(s, industry))
  if (skillsForInd.length === 0) skillsForInd = allSkills
  skillsForInd = skillsForInd.slice(0, MAX_SKILLS_PER_INDUSTRY)

  return {
    id: industryId,
    name: industry,
    acceptance: accept != null ? accept : 65,
    description,
    skills: skillsForInd.map((s, sidx) => buildSkillNode(s, roleId, industryId, sidx)),
  }
}

function buildRoleNode(role, idx) {
  const roleId = role.id || `r${idx + 1}`
  const matchPct = pct(role.transition_confidence_score)
  const industries = pickIndustriesForRole(role).map((ind, iidx) =>
    buildIndustryNode(ind, role, roleId, iidx)
  )

  // "Definition" = reasoning + friction (overall) + estimated months.
  const months = role.estimated_transition_months
  const friction = role.friction?.overall
  const definitionParts = [role.reasoning]
  if (months) {
    definitionParts.push(`Estimated transition: ~${months} months.`)
  }
  if (friction != null) {
    definitionParts.push(`Friction score: ${friction} (lower is easier).`)
  }
  return {
    id: roleId,
    title: role.role,
    matchPct: matchPct != null ? matchPct : 65,
    salaryRange: fmtSalary(role),
    definition: definitionParts.filter(Boolean).join(' '),
    industries,
    raw: role, // keep the original for any downstream consumer
  }
}

/**
 * Transform a SkillDNA payload into the role tree the CareerPathwayMap renders.
 *
 * @param {object} payload  The raw `skilldna_payload` JSON.
 * @returns {{
 *   roles: Array<object>,
 *   userSkills: string[],
 *   missedHomepage: string[],
 *   missedResult: string[],
 *   signatureInsight: string|null,
 *   narrative: string|null,
 *   targetRolesRaw: Array<object>,
 * }}
 */
export function payloadToTree(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      roles: [],
      userSkills: [],
      missedHomepage: [],
      missedResult: [],
      signatureInsight: null,
      narrative: null,
      targetRolesRaw: [],
    }
  }

  // Existing skills — first try `skill_nodes` filtered to "existing" type,
  // fall back to the matched_skills across target_roles.
  let userSkills = []
  if (Array.isArray(payload.skill_nodes)) {
    userSkills = payload.skill_nodes
      .filter((n) => n.type === 'existing')
      .map((n) => n.name)
      .filter(Boolean)
  }
  if (userSkills.length === 0 && Array.isArray(payload.target_roles)) {
    const seen = new Set()
    for (const role of payload.target_roles) {
      for (const s of role.matched_skills || []) {
        if (typeof s !== 'string') continue
        const key = s.casefold ? s.casefold() : s.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          userSkills.push(s)
        }
      }
    }
  }

  // Phase F8 cap — keep the UI tight even if the backend ever ships more.
  const cappedUserSkills = userSkills.slice(0, MAX_USER_SKILLS)
  const targetRolesRaw = (Array.isArray(payload.target_roles) ? payload.target_roles : []).slice(0, MAX_ROLES)
  const roles = targetRolesRaw.map((r, idx) => buildRoleNode(r, idx))

  return {
    roles,
    userSkills: cappedUserSkills,
    missedHomepage: Array.isArray(payload.missed_opportunities_homepage)
      ? payload.missed_opportunities_homepage
      : [],
    missedResult: Array.isArray(payload.missed_opportunities_result)
      ? payload.missed_opportunities_result
      : [],
    signatureInsight: payload.signature_insight || null,
    narrative: payload.narrative || null,
    targetRolesRaw,
  }
}
