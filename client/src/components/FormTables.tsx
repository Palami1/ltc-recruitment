import React from 'react';
import { Languages, Globe, Bike, Car, Monitor, FileSpreadsheet, Presentation, LayoutGrid } from 'lucide-react';

interface TableProps {
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function LanguagesTable({ values, onChange }: TableProps) {
  const langs = [
    { name: 'ພາສາອັງກິດ / English', prefix: 'lang_eng', icon: Languages },
    { name: 'ພາສາຈີນ / Chinese', prefix: 'lang_chi', icon: Languages },
    { name: 'ພາສາຫວຽດ / Vietnamese', prefix: 'lang_vie', icon: Languages },
    { name: 'ພາສາມົ້ງ / Hmong', prefix: 'lang_hmo', icon: Languages },
    { name: 'ພາສາອື່ນໆ / Others', prefix: 'lang_oth', icon: Globe },
  ];

  const getLevel = (prefix: string, skill: string) => {
    if (values[`${prefix}_${skill}_good`] === true || values[`${prefix}_${skill}_good`] === 'true') return 'good';
    if (values[`${prefix}_${skill}_fair`] === true || values[`${prefix}_${skill}_fair`] === 'true') return 'fair';
    if (values[`${prefix}_${skill}_weak`] === true || values[`${prefix}_${skill}_weak`] === 'true') return 'weak';
    return '';
  };

  const handleLevelChange = (prefix: string, skill: string, level: string) => {
    onChange(`${prefix}_${skill}_good`, level === 'good');
    onChange(`${prefix}_${skill}_fair`, level === 'fair');
    onChange(`${prefix}_${skill}_weak`, level === 'weak');
  };

  return (
    <div id="field-lang_skills" className="space-y-3 mt-3">
      {langs.map((lang) => {
        const isOthers = lang.prefix === 'lang_oth';
        const IconComponent = lang.icon;
        return (
          <div
            key={lang.prefix}
            className="p-4 bg-white border-2 border-slate-200/90 rounded-2xl shadow-sm hover:border-corporate-primary/40 transition-all"
          >
            {/* Language Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <IconComponent className="w-4 h-4 text-corporate-primary shrink-0" />
                <span className="text-xs md:text-sm font-black text-slate-800 tracking-wide">
                  {lang.name}
                </span>
              </div>
              {isOthers && (
                <input
                  type="text"
                  placeholder="ລະບຸຊື່ພາສາ (ເຊັ່ນ: ຍີ່ປຸ່ນ, ຝຣັ່ງ...)"
                  value={values['lang_others_name'] || ''}
                  onChange={(e) => onChange('lang_others_name', e.target.value)}
                  className="w-full sm:w-64 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white text-slate-800 placeholder:text-slate-400 font-medium"
                />
              )}
            </div>

            {/* 3 Skill Dropdowns (Read, Write, Speak) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: 'read', label: 'ຄວາມສາມາດອ່ານ (Reading)' },
                { key: 'write', label: 'ຄວາມສາມາດຂຽນ (Writing)' },
                { key: 'speak', label: 'ຄວາມສາມາດເວົ້າ (Speaking)' },
              ].map((skill) => {
                const currentVal = getLevel(lang.prefix, skill.key);
                return (
                  <div key={skill.key} className="flex flex-col space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      {skill.label}
                    </label>
                    <select
                      value={currentVal}
                      onChange={(e) => handleLevelChange(lang.prefix, skill.key, e.target.value)}
                      className={`w-full bg-slate-50 border-2 ${
                        currentVal ? 'border-corporate-primary/60 bg-white font-bold text-corporate-ltc' : 'border-slate-200 text-slate-500'
                      } px-3 py-2.5 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white transition-all cursor-pointer`}
                    >
                      <option value="">-- ເລືອກລະດັບ --</option>
                      <option value="good">ດີ (Good)</option>
                      <option value="fair">ກາງ (Fair)</option>
                      <option value="weak">ອ່ອນ (Weak)</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DrivingTable({ values, onChange }: TableProps) {
  const isMotorbike = values.motorbike_yes === true || values.motorbike_yes === 'true';
  const isMotorbikeNo = values.motorbike_no === true || values.motorbike_no === 'true';
  const motorbikeVal = isMotorbike ? 'yes' : isMotorbikeNo ? 'no' : '';

  const isMotorLic = values.motorbike_lic_yes === true || values.motorbike_lic_yes === 'true';
  const isMotorLicNo = values.motorbike_lic_no === true || values.motorbike_lic_no === 'true';
  const motorLicVal = isMotorLic ? 'yes' : isMotorLicNo ? 'no' : '';

  const isCar = values.car_yes === true || values.car_yes === 'true';
  const isCarNo = values.car_no === true || values.car_no === 'true';
  const carVal = isCar ? 'yes' : isCarNo ? 'no' : '';

  const isCarLic = values.car_lic_yes === true || values.car_lic_yes === 'true';
  const isCarLicNo = values.car_lic_no === true || values.car_lic_no === 'true';
  const carLicVal = isCarLic ? 'yes' : isCarLicNo ? 'no' : '';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
      {/* 1. ລົດຈັກ (Motorbike) */}
      <div id="field-motorbike_section" className="p-4 bg-white border-2 border-slate-200/90 rounded-2xl shadow-sm hover:border-corporate-primary/40 transition-all space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Bike className="w-4 h-4 text-corporate-primary shrink-0" />
          <span className="text-xs md:text-sm font-black text-slate-800">
            ຄວາມສາມາດຂັບຂີ່ລົດຈັກ (Motorbike Ability) <span className="text-red-500">*</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div id="field-motorbike_yes" className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-500">
              ສາມາດຂັບຂີ່ (Drive Ability):
            </label>
            <select
              id="select-motorbike_yes"
              name="motorbike_yes"
              value={motorbikeVal}
              onChange={(e) => {
                const val = e.target.value;
                onChange('motorbike_yes', val === 'yes');
                onChange('motorbike_no', val === 'no');
              }}
              className={`w-full bg-slate-50 border-2 ${
                motorbikeVal ? 'border-corporate-primary/60 bg-white font-bold text-corporate-ltc' : 'border-slate-200 text-slate-500'
              } px-3 py-2.5 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white transition-all cursor-pointer`}
            >
              <option value="">-- ເລືອກ --</option>
              <option value="yes">ໄດ້ (Yes)</option>
              <option value="no">ບໍ່ໄດ້ (No)</option>
            </select>
          </div>

          <div id="field-motorbike_lic_yes" className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-500">
              ໃບຂັບຂີ່ (Driving License):
            </label>
            <select
              id="select-motorbike_lic_yes"
              name="motorbike_lic_yes"
              value={motorLicVal}
              onChange={(e) => {
                const val = e.target.value;
                onChange('motorbike_lic_yes', val === 'yes');
                onChange('motorbike_lic_no', val === 'no');
              }}
              className={`w-full bg-slate-50 border-2 ${
                motorLicVal ? 'border-corporate-primary/60 bg-white font-bold text-corporate-ltc' : 'border-slate-200 text-slate-500'
              } px-3 py-2.5 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white transition-all cursor-pointer`}
            >
              <option value="">-- ເລືອກ --</option>
              <option value="yes">ມີ (Yes)</option>
              <option value="no">ບໍ່ມີ (No)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. ລົດໃຫຍ່ (Car) */}
      <div id="field-car_section" className="p-4 bg-white border-2 border-slate-200/90 rounded-2xl shadow-sm hover:border-corporate-primary/40 transition-all space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Car className="w-4 h-4 text-corporate-accent shrink-0" />
          <span className="text-xs md:text-sm font-black text-slate-800">
            ຄວາມສາມາດຂັບຂີ່ລົດໃຫຍ່ (Car Driving Ability)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div id="field-car_yes" className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-500">
              ສາມາດຂັບຂີ່ (Drive Ability):
            </label>
            <select
              id="select-car_yes"
              name="car_yes"
              value={carVal}
              onChange={(e) => {
                const val = e.target.value;
                onChange('car_yes', val === 'yes');
                onChange('car_no', val === 'no');
              }}
              className={`w-full bg-slate-50 border-2 ${
                carVal ? 'border-corporate-primary/60 bg-white font-bold text-corporate-ltc' : 'border-slate-200 text-slate-500'
              } px-3 py-2.5 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white transition-all cursor-pointer`}
            >
              <option value="">-- ເລືອກ --</option>
              <option value="yes">ໄດ້ (Yes)</option>
              <option value="no">ບໍ່ໄດ້ (No)</option>
            </select>
          </div>

          <div id="field-car_lic_yes" className="flex flex-col space-y-1">
            <label className="text-[11px] font-bold text-slate-500">
              ໃບຂັບຂີ່ (Driving License):
            </label>
            <select
              id="select-car_lic_yes"
              name="car_lic_yes"
              value={carLicVal}
              onChange={(e) => {
                const val = e.target.value;
                onChange('car_lic_yes', val === 'yes');
                onChange('car_lic_no', val === 'no');
              }}
              className={`w-full bg-slate-50 border-2 ${
                carLicVal ? 'border-corporate-primary/60 bg-white font-bold text-corporate-ltc' : 'border-slate-200 text-slate-500'
              } px-3 py-2.5 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white transition-all cursor-pointer`}
            >
              <option value="">-- ເລືອກ --</option>
              <option value="yes">ມີ (Yes)</option>
              <option value="no">ບໍ່ມີ (No)</option>
            </select>
          </div>
        </div>

        {/* ປະເພດໃບຂັບຂີ່ລົດໃຫຍ່ */}
        <div id="field-car_lic_type" className="flex flex-col space-y-1 pt-1">
          <label className="text-[11px] font-bold text-slate-500">
            ປະເພດໃບຂັບຂີ່ (Driving Permission Type):
          </label>
          <input
            type="text"
            id="input-car_lic_type"
            name="car_lic_type"
            placeholder="ຕົວຢ່າງ: B, C, D..."
            value={values.car_lic_type || ''}
            onChange={(e) => onChange('car_lic_type', e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>
    </div>
  );
}

export function EducationTable({ values, onChange }: TableProps) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ສະຖານທີ່ຮຽນ / Place of Graduation</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ລະດັບ / Degree</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ສາຂາ / Major</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ປີຈົບ / Year</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(num => (
              <tr key={num} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ຊື່ສະຖານທີ່ຮຽນ" value={values[`edu${num}_school`] || ""} onChange={e => onChange(`edu${num}_school`, e.target.value)} /></td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ເຊັ່ນ: ປະລິນຍາຕີ" value={values[`edu${num}_degree`] || ""} onChange={e => onChange(`edu${num}_degree`, e.target.value)} /></td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ເຊັ່ນ: ບໍລິຫານທຸລະກິດ" value={values[`edu${num}_major`] || ""} onChange={e => onChange(`edu${num}_major`, e.target.value)} /></td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ປີຈົບ" value={values[`edu${num}_year`] || ""} onChange={e => onChange(`edu${num}_year`, e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden mt-4 space-y-4">
        {[1, 2, 3].map(num => (
          <div key={num} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="font-bold text-xs text-corporate-accent pb-2 border-b border-slate-200">ລຳດັບ {num}</div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ສະຖານທີ່ຮຽນ / Place of Graduation:</label>
              <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`edu${num}_school`] || ""} onChange={e => onChange(`edu${num}_school`, e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">ລະດັບ / Degree:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`edu${num}_degree`] || ""} onChange={e => onChange(`edu${num}_degree`, e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">ປີຈົບ / Year:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`edu${num}_year`] || ""} onChange={e => onChange(`edu${num}_year`, e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ສາຂາ / Major:</label>
              <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`edu${num}_major`] || ""} onChange={e => onChange(`edu${num}_major`, e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function TrainingTable({ values, onChange }: TableProps) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ຫົວຂໍ້ຝຶກ / Topic</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ຈັດໂດຍ / By</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ວັນທີ / Date</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ສະຖານທີ່ / Place</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(num => (
              <tr key={num} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ຫົວຂໍ້ຝຶກອົບຮົມ" value={values[`train${num}_topic`] || ""} onChange={e => onChange(`train${num}_topic`, e.target.value)} /></td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ຊື່ພາກສ່ວນຈັດຂື້ນ ຫຼື ຊື່ຜູ້ສອນ" value={values[`train${num}_by`] || ""} onChange={e => onChange(`train${num}_by`, e.target.value)} /></td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ວ.ດ.ປ" value={values[`train${num}_date`] || ""} onChange={e => onChange(`train${num}_date`, e.target.value)} /></td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ສະຖານທີ່" value={values[`train${num}_place`] || ""} onChange={e => onChange(`train${num}_place`, e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden mt-4 space-y-4">
        {[1, 2, 3].map(num => (
          <div key={num} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="font-bold text-xs text-corporate-accent pb-2 border-b border-slate-200">ລຳດັບ {num}</div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ຫົວຂໍ້ຝຶກ / Topic:</label>
              <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`train${num}_topic`] || ""} onChange={e => onChange(`train${num}_topic`, e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ຈັດໂດຍ / By:</label>
              <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`train${num}_by`] || ""} onChange={e => onChange(`train${num}_by`, e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-slate-400 mb-1 block">ວັນທີ / Date:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`train${num}_date`] || ""} onChange={e => onChange(`train${num}_date`, e.target.value)} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-slate-400 mb-1 block">ສະຖານທີ່ / Place:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`train${num}_place`] || ""} onChange={e => onChange(`train${num}_place`, e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ComputerSkillsTable({ values, onChange }: TableProps) {
  const tools = [
    { name: 'Microsoft Word', prefix: 'com_word', icon: Monitor },
    { name: 'Microsoft Excel', prefix: 'com_excel', icon: FileSpreadsheet },
    { name: 'Microsoft PowerPoint', prefix: 'com_ppt', icon: Presentation },
    { name: 'ໂປຣແກຣມອື່ນໆ / Others', prefix: 'com_oth', icon: LayoutGrid },
  ];

  const getLevel = (prefix: string) => {
    if (values[`${prefix}_vgood`] === true || values[`${prefix}_vgood`] === 'true') return 'vgood';
    if (values[`${prefix}_good`] === true || values[`${prefix}_good`] === 'true') return 'good';
    if (values[`${prefix}_weak`] === true || values[`${prefix}_weak`] === 'true') return 'weak';
    return '';
  };

  const handleLevelChange = (prefix: string, level: string) => {
    onChange(`${prefix}_vgood`, level === 'vgood');
    onChange(`${prefix}_good`, level === 'good');
    onChange(`${prefix}_weak`, level === 'weak');
  };

  return (
    <div id="field-com_skills" className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {tools.map((tool) => {
        const isOthers = tool.prefix === 'com_oth';
        const currentVal = getLevel(tool.prefix);
        const IconComponent = tool.icon;

        return (
          <div
            key={tool.prefix}
            className="p-4 bg-white border-2 border-slate-200/90 rounded-2xl shadow-sm hover:border-corporate-primary/40 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <IconComponent className="w-4 h-4 text-corporate-primary shrink-0" />
                <span className="text-xs md:text-sm font-black text-slate-800">
                  {tool.name} {!isOthers && <span className="text-red-500">*</span>}
                </span>
              </div>
            </div>

            {isOthers && (
              <input
                type="text"
                placeholder="ລະບຸຊື່ໂປຣແກຣມ (ເຊັ່ນ: Photoshop, AutoCAD...)"
                value={values['com_others_name'] || ''}
                onChange={(e) => onChange('com_others_name', e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white text-slate-800 placeholder:text-slate-400 font-medium mb-2"
              />
            )}

            <div className="flex flex-col space-y-1">
              <label className="text-[11px] font-bold text-slate-500">
                ລະດັບຄວາມຊຳນານ (Proficiency Level):
              </label>
              <select
                value={currentVal}
                onChange={(e) => handleLevelChange(tool.prefix, e.target.value)}
                className={`w-full bg-slate-50 border-2 ${
                  currentVal ? 'border-corporate-primary/60 bg-white font-bold text-corporate-ltc' : 'border-slate-200 text-slate-500'
                } px-3 py-2.5 rounded-xl text-xs outline-none focus:border-corporate-primary focus:bg-white transition-all cursor-pointer`}
              >
                <option value="">-- ເລືອກລະດັບ --</option>
                <option value="vgood">ດີຫຼາຍ (Very Good)</option>
                <option value="good">ດີ (Good)</option>
                <option value="weak">ອ່ອນ (Weak)</option>
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function WorkExperienceTable({ values, onChange }: TableProps) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ຊື່ບໍລິສັດ<br />Company</th>
              <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ວ.ດ.ປ ເຂົ້າເຮັດວຽກ<br />Date of Employment</th>
              <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ວ.ດ.ປ ອອກວຽກ<br />Date of Resignation</th>
              <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ຕຳແໜ່ງສຸດທ້າຍ<br />Position</th>
              <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ເງິນເດືອນສຸດທ້າຍ<br />Salary</th>
              <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ເຫດຜົນທີ່ອອກຈາກວຽກ<br />Reason for Leaving</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2].map(num => (
              <React.Fragment key={num}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-2"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-3 py-2 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ຊື່ບໍລິສັດ" value={values[`emp${num}_company`] || ""} onChange={e => onChange(`emp${num}_company`, e.target.value)} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-3 py-2 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ວ.ດ.ປ" value={values[`emp${num}_start_date`] || ""} onChange={e => onChange(`emp${num}_start_date`, e.target.value)} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-3 py-2 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ວ.ດ.ປ" value={values[`emp${num}_end_date`] || ""} onChange={e => onChange(`emp${num}_end_date`, e.target.value)} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-3 py-2 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ຕຳແໜ່ງ" value={values[`emp${num}_pos`] || ""} onChange={e => onChange(`emp${num}_pos`, e.target.value)} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-3 py-2 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ເງິນເດືອນ" value={values[`emp${num}_salary`] || ""} onChange={e => onChange(`emp${num}_salary`, e.target.value)} /></td>
                  <td className="p-2"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-3 py-2 text-center focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ເຫດຜົນ" value={values[`emp${num}_reason`] || ""} onChange={e => onChange(`emp${num}_reason`, e.target.value)} /></td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors border-b-2 border-b-slate-100 last:border-b-0">
                  <td className="p-4 text-[10px] font-bold text-slate-500 bg-white text-right">ວຽກທີ່ຮັບຜິດຊອບ<br />Job Description</td>
                  <td colSpan={5} className="p-2"><textarea className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2 min-h-[50px] focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ອະທິບາຍໜ້າທີ່ວຽກຮັບຜິດຊອບໂດຍຫຍໍ້..." value={values[`emp${num}_desc`] || ""} onChange={e => onChange(`emp${num}_desc`, e.target.value)} /></td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden mt-4 space-y-4">
        {[1, 2].map(num => (
          <div key={num} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="font-bold text-xs text-corporate-accent pb-2 border-b border-slate-200">ບ່ອນເຮັດວຽກທີ {num}</div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ຊື່ບໍລິສັດ / Company:</label>
              <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_company`] || ""} onChange={e => onChange(`emp${num}_company`, e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">ເຂົ້າວຽກ / Start Date:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_start_date`] || ""} onChange={e => onChange(`emp${num}_start_date`, e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">ອອກວຽກ / End Date:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_end_date`] || ""} onChange={e => onChange(`emp${num}_end_date`, e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">ຕຳແໜ່ງ / Position:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_pos`] || ""} onChange={e => onChange(`emp${num}_pos`, e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">ເງິນເດືອນ / Salary:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_salary`] || ""} onChange={e => onChange(`emp${num}_salary`, e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ເຫດຜົນທີ່ອອກ / Reason for Leaving:</label>
              <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_reason`] || ""} onChange={e => onChange(`emp${num}_reason`, e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ວຽກທີ່ຮັບຜິດຊອບ / Job Description:</label>
              <textarea className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700 min-h-[80px]" placeholder="..." value={values[`emp${num}_desc`] || ""} onChange={e => onChange(`emp${num}_desc`, e.target.value)} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function EmergencyContactTable({ values, onChange }: TableProps) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ຊື່ ແລະ ນາມສະກຸນ <span className="text-red-500 ml-1">*</span><br />Name & Surname</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ທີ່ຢູ່ <span className="text-red-500 ml-1">*</span><br />Address</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ເບີໂທຕິດຕໍ່ <span className="text-red-500 ml-1">*</span><br />Telephone</th>
              <th className="p-4 text-xs font-black text-slate-500 uppercase text-center border-b-2 border-slate-200/50">ສາຍພົວພັນ <span className="text-red-500 ml-1">*</span><br />Relationship</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2].map(num => (
              <tr key={num} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                <td className="p-3">
                  <div className="flex items-center">
                    <span className="text-slate-400 font-bold text-sm px-3">{num}.</span>
                    <input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all placeholder:text-slate-400" placeholder="ຊື່ນາມສະກຸນ" value={values[`emg${num}_name`] || ""} onChange={e => onChange(`emg${num}_name`, e.target.value)} />
                  </div>
                </td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 placeholder:text-slate-400 focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all" placeholder="ບ້ານ, ເມືອງ, ແຂວງ" value={values[`emg${num}_address`] || ""} onChange={e => onChange(`emg${num}_address`, e.target.value)} /></td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 text-center placeholder:text-slate-400 focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all" placeholder="ເບີໂທ" value={values[`emg${num}_phone`] || ""} onChange={e => onChange(`emg${num}_phone`, e.target.value)} /></td>
                <td className="p-3"><input type="text" className="w-full bg-white border border-slate-200 text-sm text-slate-800 rounded-lg outline-none px-4 py-2.5 text-center placeholder:text-slate-400 focus:border-corporate-primary focus:ring-2 focus:ring-corporate-primary/20 transition-all" placeholder="ພໍ່ ຫຼື ແມ່" value={values[`emg${num}_relation`] || ""} onChange={e => onChange(`emg${num}_relation`, e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden mt-4 space-y-4">
        {[1, 2].map(num => (
          <div key={num} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3">
            <div className="font-bold text-xs text-corporate-accent pb-2 border-b border-slate-200">ບຸກຄົນອ້າງອີງທີ {num}</div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ຊື່ ແລະ ນາມສະກຸນ / Name & Surname:</label>
              <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emg${num}_name`] || ""} onChange={e => onChange(`emg${num}_name`, e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">ທີ່ຢູ່ / Address:</label>
              <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emg${num}_address`] || ""} onChange={e => onChange(`emg${num}_address`, e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">ເບີໂທ / Telephone:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emg${num}_phone`] || ""} onChange={e => onChange(`emg${num}_phone`, e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">ສາຍພົວພັນ / Relation:</label>
                <input type="text" className="w-full bg-white border border-slate-200 text-xs text-slate-800 p-3 rounded-xl outline-none focus:border-corporate-primary placeholder:text-slate-700" placeholder="..." value={values[`emg${num}_relation`] || ""} onChange={e => onChange(`emg${num}_relation`, e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}








