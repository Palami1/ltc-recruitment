export type SectionEntry = {
  name: string;
  slots: string | number;
  requirements?: string[];
  responsibilities?: string[];
};

export type JobPosition = {
  id?: string;
  department: string;
  branch?: string;
  title?: string;
  section?: string;
  sections?: SectionEntry[];
  code: string;
  slots: string | number;
  requirements: string[] | string;
  deadline?: string;
  expirationDate?: string;
};

export function getExpirationDate(pos?: Pick<JobPosition, 'deadline' | 'expirationDate'>): string | undefined {
  if (!pos) return undefined;
  const value = pos.expirationDate ?? pos.deadline;
  return value?.trim() ? value.trim() : undefined;
}

/** ສິ້ນສຸດວັນສະໝັກ = ສິ້ນວັນນັ້ນ (local) */
export function isExpired(value?: string | Pick<JobPosition, 'deadline' | 'expirationDate'>): boolean {
  const rawDate = typeof value === 'string' ? value : getExpirationDate(value);
  if (!rawDate?.trim()) return false;

  const parts = rawDate.trim().slice(0, 10).split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    return end.getTime() < Date.now();
  }
  const end = new Date(rawDate);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

export function isPositionOpen(pos: JobPosition): boolean {
  return isPositionConfigured(pos) && !isExpired(pos);
}

/** ຕຳແໜ່ງທີ່ບັນທຶກຄົບ (ມີພະແນກ + ລະຫັດ) */
export function isPositionConfigured(pos: JobPosition): boolean {
  return Boolean(pos.department?.trim() && pos.code?.trim());
}

/** ຈຳນວນຮັບລວມ — ຖ້າ sections ມີ slots ໃຫ້ລວມຈາກ sections, ອື່ນໃຊ້ pos.slots */
export function sumSlots(positions: JobPosition[]): number {
  return positions.reduce((total, pos) => {
    // ຖ້າມີ sections ທີ່ແຕ່ລະ section ມີ slots ໃຫ້ລວມຈາກ sections
    if (Array.isArray(pos.sections) && pos.sections.length > 0) {
      const sectionTotal = pos.sections.reduce((st, sec) => {
        const n = Number(sec.slots);
        return st + (isNaN(n) ? 0 : Math.max(0, n));
      }, 0);
      // ຖ້າ sections ມີ slots ທີ່ numeric ໃຫ້ໃຊ້ຈາກ sections
      if (sectionTotal > 0) return total + sectionTotal;
    }
    // fallback: ໃຊ້ pos.slots
    const num = Number(pos.slots);
    return total + (isNaN(num) ? 0 : Math.max(0, num));
  }, 0);
}

export function sanitizePositions(positions: JobPosition[]): JobPosition[] {
  return positions.filter(isPositionConfigured).map((pos, idx) => ({
    ...pos,
    id: pos.id ? String(pos.id) : String(pos.code || (idx + 1)),
    department: pos.department.trim(),
    branch: pos.branch?.trim() || '',
    title: pos.title?.trim() || '',
    section: pos.section?.trim() || '',
    sections: (Array.isArray(pos.sections) ? pos.sections : [])
      .map((s: any) => ({
        name: (typeof s === 'object' && s !== null ? s.name : String(s))?.trim() || '',
        slots: typeof s === 'object' && s !== null && s.slots !== undefined && s.slots !== null ? String(s.slots).trim() : '',
        requirements: typeof s === 'object' && s !== null && Array.isArray(s.requirements) ? s.requirements.map(String).filter((r: string) => r.trim()) : [],
        responsibilities: typeof s === 'object' && s !== null && Array.isArray(s.responsibilities) ? s.responsibilities.map(String).filter((r: string) => r.trim()) : [],
      }))
      .filter((s) => s.name),
    code: pos.code.trim().toUpperCase(),
    slots: pos.slots !== undefined && pos.slots !== null ? String(pos.slots).trim() : '',
    expirationDate: pos.expirationDate ?? pos.deadline ?? '',
    deadline: pos.deadline ?? pos.expirationDate ?? '',
  }));
}
