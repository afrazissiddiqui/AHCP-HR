import { ApplicationFormRecord } from '../../services/application-form.service';

export type ProfileSkill = {
  name: string;
  level: number;
  color: string;
};

export type ProfileCompetency = {
  name: string;
  level: number;
};

export type ProfileSpotlightData = {
  departmentLabel: string;
  teamStats: string;
  location: string;
  bio: string;
  skills: ProfileSkill[];
  competencies: ProfileCompetency[];
  mentoringPrograms: string[];
  organizationSummary: string;
  upcomingAbsence: string | null;
};

const DEFAULT_SKILLS: ProfileSkill[] = [
  { name: 'Budgeting', level: 3, color: '#e8743b' },
  { name: 'Company Product Knowledge', level: 4, color: '#1a9c9c' },
  { name: 'Project Planning', level: 5, color: '#0070f2' },
  { name: 'Business Architecture', level: 4, color: '#6f4fd7' },
  { name: 'Organizational Development', level: 4, color: '#e03d8f' },
];

const DEFAULT_COMPETENCIES: ProfileCompetency[] = [
  { name: 'Driving Continuous Improvement', level: 5 },
  { name: 'Inspiring and Motivating Others', level: 5 },
  { name: 'Building and Supporting Teams', level: 4 },
  { name: 'Communicating Effectively', level: 4 },
  { name: 'Managing from a Distance', level: 3 },
];

const DEFAULT_MENTORING = ['Career Counselling', 'Emerging Leaders Mentoring Program'];

export function buildProfileSpotlight(record: ApplicationFormRecord): ProfileSpotlightData {
  const dept = record.Department?.trim() || '—';
  const code = record.EmployeeCode ? ` (${record.EmployeeCode})` : '';
  const pi = record.detail?.personalInfo;
  const req = record.detail?.requisition;

  const city = pi?.city?.trim();
  const locationParts = [city, req?.location?.trim(), pi?.country?.trim()].filter(Boolean);
  const location = locationParts.length ? locationParts.join(', ') : req?.company?.trim() || '—';

  const designation = record.Designation?.trim() || 'Team member';
  const bio =
    `I am a ${designation.toLowerCase()} in ${dept}. ` +
    `I enjoy collaborating with colleagues and contributing to team goals. ` +
    `Passionate about professional growth and delivering quality work.`;

  const directReports = hashToRange(record.EmployeeCode, 3, 8);
  const teamSize = directReports;

  return {
    departmentLabel: `${dept}${code}`,
    teamStats: `Direct Reports: ${directReports} · Team Size: ${teamSize}`,
    location,
    bio,
    skills: DEFAULT_SKILLS,
    competencies: DEFAULT_COMPETENCIES,
    mentoringPrograms: DEFAULT_MENTORING,
    organizationSummary: buildOrganizationSummary(record),
    upcomingAbsence: null,
  };
}

function buildOrganizationSummary(record: ApplicationFormRecord): string {
  const parts: string[] = [];
  const req = record.detail?.requisition;
  if (req?.company?.trim()) {
    parts.push(req.company.trim());
  }
  if (req?.division?.trim()) {
    parts.push(req.division.trim());
  }
  if (record.EmploymentType?.trim()) {
    parts.push(record.EmploymentType.trim());
  }
  if (record.EmploymentCategory?.trim()) {
    parts.push(record.EmploymentCategory.trim());
  }
  return parts.length ? parts.join(' · ') : 'Organization details will appear here when available.';
}

function hashToRange(seed: number, min: number, max: number): number {
  const span = max - min + 1;
  return min + (Math.abs(seed) % span);
}

/** Radar polygon vertex coordinates for SVG (viewBox 0 0 200 200, center 100,100). */
export function skillRadarPoints(skills: ProfileSkill[], maxRadius = 72): string {
  const n = skills.length;
  if (!n) {
    return '';
  }
  const cx = 100;
  const cy = 100;
  return skills
    .map((skill, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (skill.level / 5) * maxRadius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function skillRadarLabelPosition(
  index: number,
  total: number,
  radius: number,
  cx = 100,
  cy = 100
): { x: number; y: number } {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}
