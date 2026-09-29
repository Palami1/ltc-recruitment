import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { PROVINCE_NAMES, getDistrictsByProvince } from '../data/laoLocations';

interface AddressSelectorProps {
  type: 'birth' | 'curr';
  title?: string;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export const AddressSelector: React.FC<AddressSelectorProps> = ({
  type,
  values,
  onChange,
}) => {
  const isBirth = type === 'birth';
  const prefix = isBirth ? 'birth' : 'curr';
  const labelPrefix = isBirth ? 'ເກີດ (Birthplace)' : 'ປັດຈຸບັນ (Current Address)';

  const provinceKey = `${prefix}_province`;
  const districtKey = `${prefix}_district`;
  const villageKey = `${prefix}_village`;

  const selectedProvince = values[provinceKey] || '';
  const selectedDistrict = values[districtKey] || '';
  const selectedVillage = values[villageKey] || '';

  const districts = getDistrictsByProvince(selectedProvince);

  // Dropdown UI states
  const [provOpen, setProvOpen] = useState(false);
  const [distOpen, setDistOpen] = useState(false);

  const provRef = useRef<HTMLDivElement>(null);
  const distRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (provRef.current && !provRef.current.contains(e.target as Node)) {
        setProvOpen(false);
      }
      if (distRef.current && !distRef.current.contains(e.target as Node)) {
        setDistOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectProvince = (provName: string) => {
    onChange(provinceKey, provName);
    // Reset district if it doesn't belong to the new province
    onChange(districtKey, '');
    setProvOpen(false);
  };

  const handleSelectDistrict = (distName: string) => {
    onChange(districtKey, distName);
    setDistOpen(false);
  };

  return (
    <div className="col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* 1. ແຂວງ (Province Dropdown) */}
      <div id={`field-${provinceKey}`} className="flex flex-col space-y-1.5 md:space-y-2 relative" ref={provRef}>
        <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide px-1">
          ແຂວງ{labelPrefix} <span className="text-red-500 ml-1">*</span>
        </label>
        <div
          onClick={() => setProvOpen(!provOpen)}
          className={`bg-white border-2 ${
            provOpen ? 'border-corporate-primary shadow-sm ring-2 ring-corporate-primary/10' : 'border-slate-200 hover:border-corporate-primary/50'
          } p-3 md:p-4 rounded-xl md:rounded-2xl flex justify-between items-center text-sm w-full cursor-pointer select-none transition-all duration-200`}
        >
          <span className={`truncate font-medium ${selectedProvince ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
            {selectedProvince || 'ເລືອກແຂວງ...'}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${provOpen ? 'rotate-180 text-corporate-primary' : ''}`} />
        </div>

        {provOpen && (
          <div className="absolute top-[100%] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 animate-fade-in">
            {PROVINCE_NAMES.map((prov) => (
              <div
                key={prov}
                onClick={() => handleSelectProvince(prov)}
                className={`p-3 rounded-xl cursor-pointer text-sm font-medium transition-all ${
                  selectedProvince === prov
                    ? 'bg-corporate-primary/10 text-corporate-primary font-bold'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-corporate-primary'
                }`}
              >
                {prov}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. ເມືອງ (District Dropdown) */}
      <div id={`field-${districtKey}`} className="flex flex-col space-y-1.5 md:space-y-2 relative" ref={distRef}>
        <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide px-1">
          ເມືອງ{labelPrefix} <span className="text-red-500 ml-1">*</span>
        </label>
        <div
          onClick={() => {
            if (selectedProvince) {
              setDistOpen(!distOpen);
            }
          }}
          className={`bg-white border-2 ${
            !selectedProvince
              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
              : distOpen
              ? 'border-corporate-primary shadow-sm ring-2 ring-corporate-primary/10'
              : 'border-slate-200 hover:border-corporate-primary/50 cursor-pointer'
          } p-3 md:p-4 rounded-xl md:rounded-2xl flex justify-between items-center text-sm w-full select-none transition-all duration-200`}
        >
          <span className={`truncate font-medium ${selectedDistrict ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
            {!selectedProvince
              ? 'ກະລຸນາເລືອກແຂວງກ່ອນ'
              : selectedDistrict || 'ເລືອກເມືອງ...'}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${distOpen ? 'rotate-180 text-corporate-primary' : ''}`} />
        </div>

        {distOpen && selectedProvince && (
          <div className="absolute top-[100%] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto p-1.5 animate-fade-in">
            {districts.length > 0 ? (
              districts.map((dist) => (
                <div
                  key={dist}
                  onClick={() => handleSelectDistrict(dist)}
                  className={`p-3 rounded-xl cursor-pointer text-sm font-medium transition-all ${
                    selectedDistrict === dist
                      ? 'bg-corporate-primary/10 text-corporate-primary font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-corporate-primary'
                  }`}
                >
                  {dist}
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-slate-400 text-center">ບໍ່ພົບລາຍຊື່ເມືອງ</div>
            )}
          </div>
        )}
      </div>

      {/* 3. ບ້ານ (Village Input) */}
      <div id={`field-${villageKey}`} className="flex flex-col space-y-1.5 md:space-y-2">
        <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide px-1">
          ບ້ານ{labelPrefix} <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          name={villageKey}
          required
          placeholder="ຕົວຢ່າງ: ໂພນສິນວນ, ດົງໂດກ..."
          value={selectedVillage}
          onChange={(e) => onChange(villageKey, e.target.value)}
          className="bg-white border-2 border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl focus:border-corporate-primary outline-none text-slate-800 w-full text-sm placeholder:text-slate-400 transition-all font-medium"
        />
      </div>
    </div>
  );
};
