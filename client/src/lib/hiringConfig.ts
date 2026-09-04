export const DEPARTMENTS = [
  { id: "DEPT_01", name: "ພະແນກ ຈັດຕັ້ງ", code: "HR-ORG" },
  { id: "DEPT_02", name: "ພະແນກ ບໍລິຫານ", code: "ADMIN" },
  { id: "DEPT_03", name: "ພະແນກ ກວດກາພາຍໃນ", code: "INT-AUDIT" },
  { id: "DEPT_04", name: "ພະແນກ ພັດທະນາບຸກຄະລາກອນ ແລະ ວັດທະນະທຳອົງກອນ", code: "HRD-CULTURE" },
  { id: "DEPT_05", name: "ພະແນກ ການເງິນ", code: "FINANCE" },
  { id: "DEPT_06", name: "ພະແນກ ບັນຊີ", code: "ACCOUNTING" },
  { id: "DEPT_07", name: "ພະແນກ ວິເຄາະຂໍ້ມູນ", code: "DATA-ANALYTICS" },
  { id: "DEPT_08", name: "ພະແນກ ການຕະຫຼາດ", code: "MARKETING" },
  { id: "DEPT_09", name: "ພະແນກ ການຂາຍ", code: "SALES" },
  { id: "DEPT_10", name: "ພະແນກ ບໍລິການລູກຄ້າອົງກອນ", code: "B2B-CS" },
  { id: "DEPT_11", name: "ພະແນກ ບໍລິການລູກຄ້າທົ່ວໄປ", code: "B2C-CS" },
  { id: "DEPT_12", name: "ພະແນກ ພັດທະນາທຸລະກິດດິຈິຕອນ", code: "DIGITAL-BIZ" },
  { id: "DEPT_13", name: "ພະແນກ ສາຍສົ່ງ", code: "TRANSMISSION" },
  { id: "DEPT_14", name: "ພະແນກ ອິນເຕີເນັດ", code: "INTERNET" },
  { id: "DEPT_15", name: "ພະແນກ ພັດທະນາເຄືອຂ່າຍ", code: "NET-DEV" },
  { id: "DEPT_16", name: "ພະແນກ ໄອທີ", code: "IT" },
  { id: "DEPT_17", name: "ພະແນກ ຄວບຄຸມການບໍລິການ", code: "SERVICE-CONTROL" },
  { id: "DEPT_18", name: "ພະແນກ ໂທລະສັບມືຖື", code: "MOBILE-NET" },
  { id: "DEPT_19", name: "ພະແນກ ເຕັກນິກ", code: "TECHNICAL" },
  { id: "DEPT_20", name: "ພະແນກ ຕິດຕັ້ງ-ສ້ອມແປງ", code: "MAINTENANCE" },
  { id: "DEPT_21", name: "ບໍລິສັດ ລາວ ໂມບາຍມັນນີ ຈໍາກັດຜູ້ດຽວ", code: "M-MONEY" }
];

export const LOCATIONS = [
  { id: "LOC_00", name: "ນະຄອນຫຼວງວຽງຈັນ", code: "VTE-PREF" },
  { id: "LOC_05", name: "ແຂວງຫຼວງພະບາງ", code: "LPB" },
  { id: "LOC_13", name: "ແຂວງສະຫວັນນະເຂດ", code: "SVK" },
  { id: "LOC_14", name: "ແຂວງຈໍາປາສັກ", code: "CPS" },
  { id: "LOC_09", name: "ແຂວງວຽງຈັນ", code: "VTE-PROV" },
  { id: "LOC_11", name: "ແຂວງບໍລິຄໍາໄຊ", code: "BKX" },
  { id: "LOC_12", name: "ແຂວງຄໍາມ່ວນ", code: "KM" },
  { id: "LOC_02", name: "ແຂວງອຸດົມໄຊ", code: "ODX" },
  { id: "LOC_06", name: "ແຂວງໄຊຍະບູລີ", code: "XBY" },
  { id: "LOC_03", name: "ແຂວງຫຼວງນໍ້າທາ", code: "LNT" },
  { id: "LOC_07", name: "ແຂວງຊຽງຂວາງ", code: "XKH" },
  { id: "LOC_08", name: "ແຂວງຫົວພັນ", code: "HP" },
  { id: "LOC_04", name: "ແຂວງບໍ່ແກ້ວ", code: "BK" },
  { id: "LOC_01", name: "ແຂວງຜົ້ງສາລີ", code: "PSL" },
  { id: "LOC_10", name: "ແຂວງໄຊສົມບູນ", code: "XSB" },
  { id: "LOC_15", name: "ແຂວງສາລະວັນ", code: "SLV" },
  { id: "LOC_16", name: "ແຂວງເຊກອງ", code: "SK" },
  { id: "LOC_17", name: "ແຂວງອັດຕະປື", code: "ATP" }
];

export const DEFAULT_BRANCH = 'ສຳນັກງານໃຫຍ່';

export const BRANCH_ORDER = [
  DEFAULT_BRANCH,
  'ສາຂາແຂວງ',
];

export const BRANCH_OPTIONS = [
  DEFAULT_BRANCH,
  'ສາຂາແຂວງ',
];

export function getBranchPriority(branchName: string): number {
  if (!branchName) return 999;
  const name = branchName.trim();
  if (name.includes('ສຳນັກງານ') || name.includes('ໃຫຍ່') || name.includes('ນະຄອນຫຼວງ') || name.includes('ນະຄອນຫລວງ')) {
    return 0;
  }
  return 1;
}
