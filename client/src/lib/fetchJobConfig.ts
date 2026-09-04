import { API } from './api';
import type { JobPosition } from './jobPositions';

export type PublicJobConfig = {
  positions: JobPosition[];
  requiredDocs: string[];
  applicantRequirements: string[];
};

export const DEFAULT_PRESET_POSITIONS: JobPosition[] = [
  {
    id: 'LPB_01',
    department: 'ສາຂາແຂວງຫຼວງພະບາງ',
    branch: 'ແຂວງຫຼວງພະບາງ',
    code: 'LPB-01',
    slots: '1',
    requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ໄອທີ, ວິສະວະກຳສາດ ຫຼື ທຽບເທົ່າ', 'ມີປະສົບການດ້ານເຕັກນິກ 1 ປີຂຶ້ນໄປ'],
    sections: [
      {
        name: 'ວິຊາການເຕັກນິກ & ໄອທີ',
        slots: '1',
        requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ IT ຫຼື Computer Science', 'ມີຄວາມຮູ້ດ້ານ Network & System Administration'],
        responsibilities: ['ຄຸ້ມຄອງ ແລະ ດູແລລະບົບ Network ປະຈຳສາຂາ', 'ສະໜັບສະໜູນວຽກງານ IT Support ໃຫ້ແກ່ພະນັກງານ']
      }
    ],
    deadline: '2026-12-31'
  },
  {
    id: 'BOL_01',
    department: 'ສາຂາແຂວງບໍລິຄຳໄຊ',
    branch: 'ແຂວງບໍລິຄຳໄຊ',
    code: 'BOL-01',
    slots: '1',
    requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ການບໍລິຫານ, ການຕະຫຼາດ ຫຼື ທຽບເທົ່າ'],
    sections: [
      {
        name: 'ພະນັກງານບໍລິການລູກຄ້າ',
        slots: '1',
        requirements: ['ມີມະນຸດສຳພັນດີ ແລະ ຮັກໃນວຽກງານບໍລິການ', 'ສາມາດນຳໃຊ້ MS Office ໄດ້ດີ'],
        responsibilities: ['ຕ້ອນຮັບ ແລະ ໃຫ້ບໍລິການລູກຄ້າປະຈຳສູນ', 'ແນະນຳຜະລິດຕະພັນ ແລະ ບໍລິການຂອງບໍລິສັດ']
      }
    ],
    deadline: '2026-12-31'
  },
  {
    id: 'KHM_01',
    department: 'ສາຂາແຂວງຄຳມ່ວນ',
    branch: 'ແຂວງຄຳມ່ວນ',
    code: 'KHM-01',
    slots: '1',
    requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ການເງິນ-ການບັນຊີ ຫຼື ທຽບເທົ່າ'],
    sections: [
      {
        name: 'ວິຊາການການເງິນ-ບັນຊີ',
        slots: '1',
        requirements: ['ມີຄວາມຮູ້ຄວາມເຂົ້າໃຈດ້ານລະບົບການບັນຊີ', 'ມີຄວາມຊື່ສັດ ແລະ ຮອບຄອບ'],
        responsibilities: ['ບັນທຶກ ແລະ ສະຫຼຸບລາຍຮັບ-ລາຍຈ່າຍປະຈຳວັນ', 'ຄຸ້ມຄອງເອກະສານການເງິນຂອງສາຂາ']
      }
    ],
    deadline: '2026-12-31'
  },
  {
    id: 'VTE_01',
    department: 'ພະແນກ ໄອທີ ( HQ )',
    branch: 'ນະຄອນຫຼວງວຽງຈັນ',
    code: 'VTE-01',
    slots: '2',
    requirements: ['ຈົບປະລິນຍາຕີ ສາຂາ ວິສະວະກຳຊອບແວ ຫຼື ໄອທີ'],
    sections: [
      {
        name: 'Full Stack Software Developer',
        slots: '2',
        requirements: ['ມີຄວາມຊຳນານ Node.js, React, React Native, TailwindCSS', 'ມີຄວາມຮູ້ດ້ານ Database (MongoDB, PostgreSQL)'],
        responsibilities: ['ພັດທະນາ ແລະ ປັບປຸງລະບົບ Recruitment Portal', 'ຂຽນ API ແລະ ຈັດການ Database']
      }
    ],
    deadline: '2026-12-31'
  }
];

export async function fetchJobConfig(signal?: AbortSignal): Promise<PublicJobConfig | null> {
  try {
    const res = await fetch(`${API}/api/job-config?t=${Date.now()}`, {
      method: 'GET',
      signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.positions) && data.positions.length > 0) {
        try { localStorage.setItem('job_config_cache', JSON.stringify({ ...data, savedAt: Date.now() })); } catch (e) {}
        return {
          positions: data.positions,
          requiredDocs: data.requiredDocs || ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
          applicantRequirements: data.applicantRequirements || [],
        };
      }
    }
  } catch (e) {}

  try {
    const cached = localStorage.getItem('job_config_cache');
    if (cached) {
      const parsed = JSON.parse(cached);
      const data = parsed?.positions ? parsed : parsed?.data;
      if (data && Array.isArray(data.positions) && data.positions.length > 0) {
        return {
          positions: data.positions,
          requiredDocs: data.requiredDocs || ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
          applicantRequirements: data.applicantRequirements || [],
        };
      }
    }
  } catch (e) {}

  return {
    positions: DEFAULT_PRESET_POSITIONS,
    requiredDocs: ['ໃບສະໝັກ Form 20', 'ສຳເນົາໃບຜ່ານຊັ້ນ', 'ຮູບ 3x4 (2 ໃບ)', 'ສຳເນົາ ບັດ ປທ.'],
    applicantRequirements: []
  };
}
