import React from 'react';

interface TableProps {
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export function LanguagesTable({ values, onChange }: TableProps) {
  const langs = [
    { name: 'ພາສາອັງກິດ / English', prefix: 'lang_eng' },
    { name: 'ພາສາຈີນ / Chinese', prefix: 'lang_chi' },
    { name: 'ພາສາຫວຽດ / Vietnamese', prefix: 'lang_vie' },
    { name: 'ພາສາອື່ນໆ / Others', prefix: 'lang_other' },
  ];
  return (
    <>
      <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 mt-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th rowSpan={2} className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ພາສາ/ Languages</th>
              <th colSpan={3} className="p-2 border border-slate-200 text-xs font-black text-corporate-primary uppercase text-center">ສາມາດອ່ານ / Ability to read</th>
              <th colSpan={3} className="p-2 border border-slate-200 text-xs font-black text-corporate-accent uppercase text-center">ສາມາດຂຽນ / Ability to write</th>
              <th colSpan={3} className="p-2 border border-slate-200 text-xs font-black text-corporate-ltc uppercase text-center">ສາມາດເວົ້າ / Ability to speak</th>
            </tr>
            <tr className="bg-slate-50">
              {['read', 'write', 'speak'].map(skill => (
                <React.Fragment key={skill}>
                  <th className="p-2 border border-slate-200 text-[10px] font-bold text-center text-slate-500">ດີ<br/>good</th>
                  <th className="p-2 border border-slate-200 text-[10px] font-bold text-center text-slate-500">ກາງ<br/>Fair</th>
                  <th className="p-2 border border-slate-200 text-[10px] font-bold text-center text-slate-500">ອ່ອນ<br/>Weak</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {langs.map((lang) => (
              <tr key={lang.prefix} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 border border-slate-200 text-xs font-bold text-slate-700">
                  {lang.prefix === 'lang_other' ? (
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{lang.name}:</span>
                      <input type="text" className="flex-1 min-w-[60px] bg-white border border-slate-200 px-2 py-1 rounded-lg text-[10px] outline-none text-slate-800 focus:border-corporate-primary/50 placeholder:text-slate-700" placeholder="..." value={values['lang_other_name'] || ""} onChange={e => onChange('lang_other_name', e.target.value)} />
                    </div>
                  ) : (lang.name)}
                </td>
                {(['read', 'write', 'speak'] as const).map(skill => (
                  (['good', 'fair', 'weak'] as const).map(level => {
                    const fieldId = `${lang.prefix}_${skill}_${level}`;
                    return (
                      <td key={fieldId} className="p-2 border border-slate-200 text-center">
                        <input type="checkbox" className="w-4 h-4 accent-corporate-primary bg-white border border-slate-200 rounded cursor-pointer" checked={Boolean(values[fieldId])} onChange={e => onChange(fieldId, e.target.checked)} />
                      </td>
                    );
                  })
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden mt-4 space-y-4">
        {langs.map((lang) => (
          <div key={lang.prefix} className="bg-white border border-slate-200 rounded-2xl p-4">
             <div className="font-bold text-xs text-corporate-accent mb-3 pb-2 border-b border-slate-200">
               {lang.prefix === 'lang_other' ? (
                  <div className="flex items-center gap-2">
                    <span>{lang.name}:</span>
                    <input type="text" className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-xs outline-none text-slate-800 focus:border-corporate-primary/50 placeholder:text-slate-700" placeholder="ລະບຸພາສາອື່ນໆ..." value={values['lang_other_name'] || ""} onChange={e => onChange('lang_other_name', e.target.value)} />
                  </div>
               ) : (lang.name)}
             </div>
             <div className="grid grid-cols-3 gap-2">
               {(['read', 'write', 'speak'] as const).map((skill, idx) => (
                 <div key={skill} className="flex flex-col space-y-2 bg-white p-2 rounded-xl border border-slate-200">
                   <div className="text-[10px] text-center font-bold text-slate-400 capitalize">{idx === 0 ? 'ອ່ານ / Read' : idx === 1 ? 'ຂຽນ / Write' : 'ເວົ້າ / Speak'}</div>
                   {(['good', 'fair', 'weak'] as const).map(level => {
                      const fieldId = `${lang.prefix}_${skill}_${level}`;
                      return (
                        <label key={level} className="flex items-center justify-between text-[10px] text-slate-800">
                          <span>{level === 'good' ? 'ດີ' : level === 'fair' ? 'ກາງ' : 'ອ່ອນ'}</span>
                          <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values[fieldId])} onChange={e => onChange(fieldId, e.target.checked)} />
                        </label>
                      );
                   })}
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function DrivingTable({ values, onChange }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 mt-4">
      <table className="w-full text-left border-collapse">
        <tbody>
          <tr className="hover:bg-slate-50 transition-colors border-b border-slate-200">
            <td className="p-4 border-r border-slate-200 text-xs font-bold text-slate-700">ສາມາດຂັບຂີ່ລົດຈັກ / Motorbike:</td>
            <td className="p-4 border-r border-slate-200">
              <div className="flex items-center justify-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values.motorbike_yes)} onChange={e => { onChange('motorbike_yes', e.target.checked); onChange('motorbike_no', false); }} /> ໄດ້ / Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values.motorbike_no)} onChange={e => { onChange('motorbike_no', e.target.checked); onChange('motorbike_yes', false); }} /> ບໍ່ໄດ້ / No
                </label>
              </div>
            </td>
            <td className="p-4 border-r border-slate-200 font-bold text-xs text-slate-700 align-top">ໃບຂັບຂີ່ / Driving License:</td>
            <td className="p-4 align-top">
              <div className="flex items-center justify-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values.motorbike_lic_yes)} onChange={e => { onChange('motorbike_lic_yes', e.target.checked); onChange('motorbike_lic_no', false); }} /> ມີ / Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values.motorbike_lic_no)} onChange={e => { onChange('motorbike_lic_no', e.target.checked); onChange('motorbike_lic_yes', false); }} /> ບໍ່ມີ / No
                </label>
              </div>
            </td>
          </tr>
          <tr className="hover:bg-slate-50 transition-colors">
            <td className="p-4 border-r border-slate-200 text-xs font-bold text-slate-700 align-top">ສາມາດຂັບຂີ່ລົດໃຫຍ່ / Car:</td>
            <td className="p-4 border-r border-slate-200 align-top">
              <div className="flex items-center justify-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values.car_yes)} onChange={e => { onChange('car_yes', e.target.checked); onChange('car_no', false); }} /> ໄດ້ / Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                  <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values.car_no)} onChange={e => { onChange('car_no', e.target.checked); onChange('car_yes', false); }} /> ບໍ່ໄດ້ / No
                </label>
              </div>
            </td>
            <td className="p-4 border-r border-slate-200 font-bold text-xs text-slate-700 align-top">
              <div className="flex flex-col space-y-5">
                <div>ໃບຂັບຂີ່ / Driving License:</div>
                <div className="flex items-center">ປະເພດໃບຂັບຂີ່ / Permission: (</div>
              </div>
            </td>
            <td className="p-4 align-top">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                    <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values.car_lic_yes)} onChange={e => { onChange('car_lic_yes', e.target.checked); onChange('car_lic_no', false); }} /> ມີ / Yes
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                    <input type="checkbox" className="w-4 h-4 accent-corporate-primary" checked={Boolean(values.car_lic_no)} onChange={e => { onChange('car_lic_no', e.target.checked); onChange('car_lic_yes', false); }} /> ບໍ່ມີ / No
                  </label>
                </div>
                <div className="flex justify-center -ml-5">
                  <input type="text" className="bg-transparent border-b border-slate-600 text-xs text-slate-800 outline-none w-[100px] text-center placeholder:text-slate-700" placeholder="..." value={values.car_lic_type || ""} onChange={e => onChange('car_lic_type', e.target.value)} />
                  <span className="text-slate-800 text-xs ml-2">)</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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
              <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ສະຖານທີ່ຮຽນ / Place of Graduation</th>
              <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ລະດັບ / Degree</th>
              <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ສາຂາ / Major</th>
              <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ປີຈົບ / Year</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(num => (
              <tr key={num} className="hover:bg-slate-50 transition-colors">
                <td className="p-2 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 placeholder:text-slate-700" placeholder="..." value={values[`edu${num}_school`] || ""} onChange={e => onChange(`edu${num}_school`, e.target.value)} /></td>
                <td className="p-2 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none text-center placeholder:text-slate-700" placeholder="..." value={values[`edu${num}_degree`] || ""} onChange={e => onChange(`edu${num}_degree`, e.target.value)} /></td>
                <td className="p-2 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none text-center placeholder:text-slate-700" placeholder="..." value={values[`edu${num}_major`] || ""} onChange={e => onChange(`edu${num}_major`, e.target.value)} /></td>
                <td className="p-2 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none text-center placeholder:text-slate-700" placeholder="..." value={values[`edu${num}_year`] || ""} onChange={e => onChange(`edu${num}_year`, e.target.value)} /></td>
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
              <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ຫົວຂໍ້ຝຶກ / Topic</th>
              <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ຈັດໂດຍ / By</th>
              <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ວັນທີ / Date</th>
              <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ສະຖານທີ່ / Place</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(num => (
              <tr key={num} className="hover:bg-slate-50 transition-colors border-b border-slate-200/50 last:border-0">
                <td className="p-2 border-r border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 placeholder:text-slate-700" placeholder="..." value={values[`train${num}_topic`] || ""} onChange={e => onChange(`train${num}_topic`, e.target.value)} /></td>
                <td className="p-2 border-r border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none text-center placeholder:text-slate-700" placeholder="..." value={values[`train${num}_by`] || ""} onChange={e => onChange(`train${num}_by`, e.target.value)} /></td>
                <td className="p-2 border-r border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none text-center placeholder:text-slate-700" placeholder="..." value={values[`train${num}_date`] || ""} onChange={e => onChange(`train${num}_date`, e.target.value)} /></td>
                <td className="p-2"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none text-center placeholder:text-slate-700" placeholder="..." value={values[`train${num}_place`] || ""} onChange={e => onChange(`train${num}_place`, e.target.value)} /></td>
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
    { name: 'Microsoft Word', prefix: 'com_word' }, { name: 'Microsoft Excel', prefix: 'com_excel' }, { name: 'Microsoft PPT', prefix: 'com_ppt' }
  ];
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 mt-4">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="p-4 border border-slate-200 text-xs font-black text-slate-400 uppercase text-center">ໂປຣແກຣມ / Software</th>
            <th className="p-4 border border-slate-200 text-xs font-black text-corporate-primary uppercase text-center">ດີຫຼາຍ / V.Good</th>
            <th className="p-4 border border-slate-200 text-xs font-black text-corporate-accent uppercase text-center">ດີ / Good</th>
            <th className="p-4 border border-slate-200 text-xs font-black text-[#FFB86C] uppercase text-center">ອ່ອນ / Weak</th>
          </tr>
        </thead>
        <tbody>
          {tools.map(tool => (
            <tr key={tool.prefix} className="hover:bg-slate-50 transition-colors">
              <td className="p-4 border border-slate-200 text-xs font-bold text-slate-700">{tool.name}</td>
              {(['vgood', 'good', 'weak'] as const).map(level => {
                 const id = `${tool.prefix}_${level}`;
                 return (
                   <td key={id} className="p-2 border border-slate-200 text-center">
                     <input type="checkbox" className="w-5 h-5 accent-corporate-primary" checked={Boolean(values[id])} onChange={e => onChange(id, e.target.checked)} />
                   </td>
                 );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ຊື່ບໍລິສັດ<br/>Company</th>
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ວ.ດ.ປ ເຂົ້າເຮັດວຽກ<br/>Date of Employment</th>
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ວ.ດ.ປ ອອກວຽກ<br/>Date of Resignation</th>
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ຕຳແໜ່ງສຸດທ້າຍ<br/>Position</th>
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ເງິນເດືອນສຸດທ້າຍ<br/>Salary</th>
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ເຫດຜົນທີ່ອອກຈາກວຽກ<br/>Reason for Leaving</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2].map(num => (
              <React.Fragment key={num}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-1 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 text-center placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_company`] || ""} onChange={e => onChange(`emp${num}_company`, e.target.value)} /></td>
                  <td className="p-1 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 text-center placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_start_date`] || ""} onChange={e => onChange(`emp${num}_start_date`, e.target.value)} /></td>
                  <td className="p-1 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 text-center placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_end_date`] || ""} onChange={e => onChange(`emp${num}_end_date`, e.target.value)} /></td>
                  <td className="p-1 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 text-center placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_pos`] || ""} onChange={e => onChange(`emp${num}_pos`, e.target.value)} /></td>
                  <td className="p-1 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 text-center placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_salary`] || ""} onChange={e => onChange(`emp${num}_salary`, e.target.value)} /></td>
                  <td className="p-1 border border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 text-center placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_reason`] || ""} onChange={e => onChange(`emp${num}_reason`, e.target.value)} /></td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors border-b-2 border-b-slate-200">
                  <td className="p-4 border border-slate-200 text-[10px] font-bold text-slate-700 bg-white/50 text-center">ວຽກທີ່ຮັບຜິດຊອບ<br/>Job Description</td>
                  <td colSpan={5} className="p-2 border border-slate-200"><textarea className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 min-h-[40px] resize-none placeholder:text-slate-700" placeholder="..." value={values[`emp${num}_desc`] || ""} onChange={e => onChange(`emp${num}_desc`, e.target.value)} /></td>
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
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ຊື່ ແລະ ບານສະກຸນ<br/>Name & Surname</th>
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ທີ່ຢູ່<br/>Address</th>
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ເບີໂທຕິດຕໍ່<br/>Telephone</th>
              <th className="p-4 border border-slate-200 text-[10px] font-black text-slate-400 uppercase text-center">ສາຍພົວພັນ<br/>Relationship</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2].map(num => (
              <tr key={num} className="hover:bg-slate-50 transition-colors border-b border-slate-200/50 last:border-0">
                <td className="p-1 border-r border-slate-200">
                  <div className="flex items-center">
                    <span className="text-slate-500 text-xs px-2">{num}.</span>
                    <input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-1 placeholder:text-slate-700" placeholder="..." value={values[`emg${num}_name`] || ""} onChange={e => onChange(`emg${num}_name`, e.target.value)} />
                  </div>
                </td>
                <td className="p-1 border-r border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 placeholder:text-slate-700" placeholder="..." value={values[`emg${num}_address`] || ""} onChange={e => onChange(`emg${num}_address`, e.target.value)} /></td>
                <td className="p-1 border-r border-slate-200"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 text-center placeholder:text-slate-700" placeholder="..." value={values[`emg${num}_phone`] || ""} onChange={e => onChange(`emg${num}_phone`, e.target.value)} /></td>
                <td className="p-1"><input type="text" className="w-full bg-transparent border-none text-xs text-slate-800 outline-none px-2 text-center placeholder:text-slate-700" placeholder="..." value={values[`emg${num}_relation`] || ""} onChange={e => onChange(`emg${num}_relation`, e.target.value)} /></td>
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
