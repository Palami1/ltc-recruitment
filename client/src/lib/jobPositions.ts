export type JobPosition = {
  department: string;
  code: string;
  slots: number;
  requirements: string[] | string;
  deadline?: string;
};

/** ຕຳແໜ່ງທີ່ບັນທຶກຄົບ (ມີພະແນກ + ລະຫັດ) */
export function isPositionConfigured(pos: JobPosition): boolean {
  return Boolean(pos.department?.trim() && pos.code?.trim());
}

/** ສິ້ນສຸດວັນສະໝັກ = ສິ້ນວັນນັ້ນ (local) */
export function isExpired(deadline?: string): boolean {
  if (!deadline?.trim()) return false;
  const parts = deadline.trim().slice(0, 10).split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const end = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    return end.getTime() < Date.now();
  }
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

export function isPositionOpen(pos: JobPosition): boolean {
  return isPositionConfigured(pos) && !isExpired(pos.deadline);
}

export function sumSlots(positions: JobPosition[]): number {
  return positions.reduce((total, pos) => total + Math.max(0, Number(pos.slots) || 0), 0);
}

export function sanitizePositions(positions: JobPosition[]): JobPosition[] {
  return positions.filter(isPositionConfigured).map((pos) => ({
    ...pos,
    department: pos.department.trim(),
    code: pos.code.trim().toUpperCase(),
    slots: Math.max(1, Number(pos.slots) || 1),
  }));
}
