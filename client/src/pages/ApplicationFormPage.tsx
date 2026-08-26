import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Camera, X, CheckCircle, Download, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { FORM_20 } from '../lib/applicationFormSchema';
import axios from 'axios';
import { LanguagesTable, DrivingTable, EducationTable, TrainingTable, ComputerSkillsTable, WorkExperienceTable, EmergencyContactTable } from '../components/FormTables';
import PageLayout from '../components/PageLayout';

const CustomSelect = ({ field, formData, handleInputChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const otherOpt = (field.options || []).find((opt: any) => {
    const val = typeof opt === 'string' ? opt : opt.value;
    return val.includes('ອື່ນໆ') || val.includes('Other');
  });
  const otherOptValue = otherOpt ? (typeof otherOpt === 'string' ? otherOpt : otherOpt.value) : null;
  const otherOptLabel = otherOpt ? (typeof otherOpt === 'string' ? otherOpt : otherOpt.label) : null;

  const selectedOpt = (field.options || []).find((opt: any) => {
    const val = typeof opt === 'string' ? opt : opt.value;
    return val === formData[field.id];
  });

  const isCustomOther = !!otherOptValue && !selectedOpt && !!formData[field.id];
  const [showOtherInput, setShowOtherInput] = useState(false);

  useEffect(() => {
    if (isCustomOther || formData[field.id] === otherOptValue) {
      setShowOtherInput(true);
    }
  }, [isCustomOther, formData, field.id, otherOptValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLabel = selectedOpt 
    ? (typeof selectedOpt === 'string' ? selectedOpt : selectedOpt.label) 
    : (showOtherInput && otherOptLabel ? otherOptLabel : (field.placeholder || 'ກະລຸນາເລືອກ...'));

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="relative" ref={dropdownRef}>
        <div 
          onClick={() => { if (!showOtherInput) setIsOpen(!isOpen); }}
          className={`bg-white border-2 border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl focus-within:border-corporate-primary flex justify-between items-center text-sm w-full transition-all duration-200 hover:border-corporate-primary/50 ${!showOtherInput ? 'cursor-pointer select-none' : ''}`}
        >
          {showOtherInput ? (
            <input 
              type="text"
              placeholder="ກະລຸນາລະບຸ (ພິມທີ່ນີ້)..."
              value={isCustomOther ? (formData[field.id] as string) : ''}
              onChange={(e) => {
                handleInputChange({ target: { name: field.id, value: e.target.value, type: 'text' } } as any);
              }}
              className="outline-none w-full bg-transparent text-slate-800 font-bold placeholder:font-normal placeholder:text-slate-400"
              autoFocus
              onClick={(e) => e.stopPropagation()} 
            />
          ) : (
            <span className={formData[field.id] ? 'text-slate-800 font-bold' : 'text-slate-400'}>
              {displayLabel}
            </span>
          )}
          <div 
            className="pl-2 cursor-pointer h-full flex items-center" 
            onClick={(e) => {
               e.stopPropagation();
               setIsOpen(!isOpen);
            }}
          >
            <svg className={`fill-current h-5 w-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-corporate-primary' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
            </svg>
          </div>
        </div>
        
        {isOpen && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {(field.options || []).map((opt: any) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = formData[field.id] === optValue || (optValue === otherOptValue && showOtherInput);
              return (
                <div
                  key={optValue}
                  onClick={() => {
                    if (optValue === otherOptValue) {
                      setShowOtherInput(true);
                      if (selectedOpt) {
                        handleInputChange({ target: { name: field.id, value: '', type: 'text' } } as any);
                      }
                    } else {
                      setShowOtherInput(false);
                      handleInputChange({ target: { name: field.id, value: optValue, type: 'select-one' } } as any);
                    }
                    setIsOpen(false);
                  }}
                  className={`p-3 md:p-4 cursor-pointer transition-colors duration-150 flex items-center justify-between select-none
                    ${isSelected ? 'bg-corporate-primary/10 text-corporate-primary font-bold' : 'hover:bg-slate-50 text-slate-700'}
                  `}
                >
                  <span>{optLabel}</span>
                  {isSelected && <CheckCircle className="w-5 h-5 text-corporate-primary" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

type ApplicationFormPageProps = {
  isAdminEdit?: boolean;
  initialData?: any;
  onAdminSave?: (data: any) => void;
};

export default function ApplicationFormPage({ isAdminEdit = false, initialData = null, onAdminSave }: ApplicationFormPageProps = {}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const getTodayLaoDate = () => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const [formData, setFormData] = useState<Record<string, string | boolean | number>>(initialData || {
    pos_applying: id || '',
    sign_date: getTodayLaoDate()
  });
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submittedPdfUrl, setSubmittedPdfUrl] = useState<string | null>(null);
  const [submittedRefCode, setSubmittedRefCode] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationFieldId, setValidationFieldId] = useState<string | null>(null);
  const [showLangPromptModal, setShowLangPromptModal] = useState(false);
  const [skipLangCheck, setSkipLangCheck] = useState(false);
  // Autosave draft form state to LocalStorage for mobile network reliability
  const [restoredDraftToast, setRestoredDraftToast] = useState(false);

  useEffect(() => {
    if (isAdminEdit) return;
    const storageKey = `LTC_FORM_DRAFT_${id || 'general'}`;
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 2) {
          setFormData(prev => ({ ...prev, ...parsed }));
          setRestoredDraftToast(true);
          setTimeout(() => setRestoredDraftToast(false), 5000);
        }
      } catch (err) {
        console.error("Failed to restore draft:", err);
      }
    }
  }, [id, isAdminEdit]);

  useEffect(() => {
    if (isAdminEdit) return;
    const storageKey = `LTC_FORM_DRAFT_${id || 'general'}`;
    if (Object.keys(formData).length > 2) {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData, id, isAdminEdit]);

  const handleConfirmSkipLang = () => {
    setShowLangPromptModal(false);
    setSkipLangCheck(true);
    setTimeout(() => {
      const formEl = document.querySelector('form');
      if (formEl) formEl.requestSubmit();
    }, 100);
  };

  const handleReturnToLang = () => {
    setShowLangPromptModal(false);
    setTimeout(() => {
      const el = document.getElementById('field-lang_skills') || document.querySelector('[data-field-id="lang_skills"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-corporate-primary', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-corporate-primary', 'ring-offset-2'), 2500);
      }
    }, 150);
  };

  const showError = (msg: string, fieldId: string | null = null) => {
    setValidationError(msg);
    setValidationFieldId(fieldId);
  };

  const dismissError = () => {
    const fieldId = validationFieldId;
    setValidationError(null);
    if (fieldId) {
      // Small delay so the modal closes first
      setTimeout(() => {
        const el = document.getElementById(`field-${fieldId}`) ||
                   document.querySelector(`[data-field-id="${fieldId}"]`) ||
                   document.getElementById(fieldId) ||
                   document.querySelector(`[name="${fieldId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-rose-500', 'ring-offset-2', 'rounded-2xl', 'transition-all', 'duration-300');
          setTimeout(() => el.classList.remove('ring-4', 'ring-rose-500', 'ring-offset-2', 'rounded-2xl', 'transition-all', 'duration-300'), 3000);
        }
        setValidationFieldId(null);
      }, 150);
    }
  };

  // WebRTC Camera State
  const [cameraMode, setCameraMode] = useState<'signature' | 'document' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const startCamera = async (mode: 'signature' | 'document') => {
    try {
      let stream;
      try {
        // Try to get the back camera first
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch (fallbackErr) {
        // Fallback to any available camera if back camera fails
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      setVideoStream(stream);
      setCameraMode(mode);
    } catch (err) {
      console.error("Camera error:", err);
      alert("ບໍ່ສາມາດເປີດກ້ອງໄດ້. ໝັ້ນໃຈວ່າອຸປະກອນມີກ້ອງ ແລະ ທ່ານໄດ້ອະນຸຍາດນຳໃຊ້ກ້ອງ (Camera Permission).");
    }
  };

  // Sync video stream to video element when it mounts
  useEffect(() => {
    if (cameraMode !== null && videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [cameraMode, videoStream]);

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    setVideoStream(null);
    setCameraMode(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        if (cameraMode === 'signature') {
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], "camera_signature.jpg", { type: "image/jpeg" });
              setSignatureFile(file);
              setSignaturePreview(URL.createObjectURL(file));
              stopCamera();
            }
          }, "image/jpeg");
        } else if (cameraMode === 'document') {
          const imgData = canvas.toDataURL('image/jpeg', 0.8);
          const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
          const pdfBlob = pdf.output('blob');
          const file = new File([pdfBlob], `document_${Date.now()}.pdf`, { type: "application/pdf" });
          setAttachmentFiles(prev => [...prev, file]);
          stopCamera();
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name.startsWith('marital_') && checked) {
        setFormData(prev => ({ 
          ...prev, 
          marital_single: false,
          marital_married: false,
          marital_widow: false,
          marital_divorced: false,
          [name]: true 
        }));
        return;
      }
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleValueChange = (key: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("ຮູບລາຍເຊັນມີຂະໜາດໃຫຍ່ເກີນ 5MB! ກະລຸນາເລືອກໄຟລ໌ໃໝ່.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      setSignatureFile(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert("ຮູບມີຂະໜາດໃຫຍ່ເກີນ 5MB! ກະລຸນາເລືອກໄຟລ໌ໃໝ່.");
        if (photoInputRef.current) photoInputRef.current.value = '';
        return;
      }
      
      // Auto-crop to match the PDF box aspect ratio (90x100 -> 9:10)
      const imageUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const targetRatio = 90 / 100;
        const imgRatio = img.width / img.height;
        let cropWidth = img.width;
        let cropHeight = img.height;
        let startX = 0;
        let startY = 0;

        if (imgRatio > targetRatio) {
          // Wider than 3:4 -> crop sides
          cropWidth = img.height * targetRatio;
          startX = (img.width - cropWidth) / 2;
        } else {
          // Taller than 3:4 -> crop top/bottom
          cropHeight = img.width / targetRatio;
          startY = (img.height - cropHeight) / 2;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 900; // Target width (multiplied by 10 for quality)
        canvas.height = 1000; // Target height (9:10)
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, startX, startY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const newFileName = file.name.replace(/\.[^/.]+$/, "") + "_cropped.jpg";
              const croppedFile = new File([blob], newFileName, { type: 'image/jpeg' });
              setPhotoFile(croppedFile);
              setPhotoPreview(URL.createObjectURL(croppedFile));
            }
          }, 'image/jpeg', 0.95);
        }
      };
      img.src = imageUrl;
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachmentFiles(prev => {
        const totalSize = [...prev, ...newFiles].reduce((acc, f) => acc + f.size, 0);
        if (totalSize > 5 * 1024 * 1024) {
          alert("ເອກະສານຄັດຕິດມີຂະໜາດໃຫຍ່ເກີນ 5MB! (ລວມກັນທຸກໄຟລ໌ຕ້ອງບໍ່ເກີນ 5MB)");
          if (attachmentInputRef.current) attachmentInputRef.current.value = '';
          return prev;
        }
        return [...prev, ...newFiles];
      });
    }
  };

  const removeAttachment = (evt: React.MouseEvent, index: number) => {
    evt.stopPropagation();
    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
    if (attachmentInputRef.current) attachmentInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdminEdit && onAdminSave) {
      onAdminSave(formData);
      return;
    }

    // Validate First Name & Last Name
    if (!String(formData.first_name || '').trim()) {
      showError("ກະລຸນາປ້ອນຊື່ຜູ້ສະໝັກ!", 'first_name');
      return;
    }
    if (!String(formData.last_name || '').trim()) {
      showError("ກະລຸນາປ້ອນນາມສະກຸນ!", 'last_name');
      return;
    }

    // Validate Date of Birth & Age
    if (!String(formData.dob || '').trim()) {
      showError("ກະລຸນາປ້ອນວັນເດືອນປີເກີດ!", 'dob');
      return;
    }
    if (!String(formData.age || '').trim()) {
      showError("ກະລຸນາປ້ອນອາຍຸ!", 'age');
      return;
    }

    // Validate Sex, Nationality, Ethnicity, Religion
    if (!String(formData.sex || '').trim()) {
      showError("ກະລຸນາເລືອກເພດ!", 'sex');
      return;
    }
    if (!String(formData.nationality || '').trim()) {
      showError("ກະລຸນາປ້ອນສັນຊາດ!", 'nationality');
      return;
    }
    if (!String(formData.ethnicity || '').trim()) {
      showError("ກະລຸນາປ້ອນຊົນເຜົ່າ!", 'ethnicity');
      return;
    }
    if (!String(formData.religion || '').trim()) {
      showError("ກະລຸນາປ້ອນສາສະໜາ!", 'religion');
      return;
    }

    // Validate Marital Status (must select at least one of single, married, widow, divorced)
    const maritalSelected = 
      formData.marital_single === true || formData.marital_single === 'true' ||
      formData.marital_married === true || formData.marital_married === 'true' ||
      formData.marital_widow === true || formData.marital_widow === 'true' ||
      formData.marital_divorced === true || formData.marital_divorced === 'true';
    if (!maritalSelected) {
      showError("ກະລຸນາເລືອກສະຖານະພາບຄອບຄົວຢ່າງໜ້ອຍ 1 ຢ່າງ!", 'marital_single');
      return;
    }

    // Validate Motorbike driving ability (Yes or No must be selected)
    const motorbikeSelected = 
      formData.motorbike_yes === true || formData.motorbike_yes === 'true' ||
      formData.motorbike_no === true || formData.motorbike_no === 'true';
    if (!motorbikeSelected) {
      showError("ກະລຸນາເລືອກຄວາມສາມາດໃນການຂັບຂີ່ລົດຈັກ!", 'motorbike_yes');
      return;
    }

    // Validate Motorbike license (Yes or No must be selected)
    const motorbikeLicSelected = 
      formData.motorbike_lic_yes === true || formData.motorbike_lic_yes === 'true' ||
      formData.motorbike_lic_no === true || formData.motorbike_lic_no === 'true';
    if (!motorbikeLicSelected) {
      showError("ກະລຸນາເລືອກວ່າມີໃບຂັບຂີ່ລົດຈັກຫຼືບໍ່!", 'motorbike_yes');
      return;
    }

    // Validate Phone Number (digits, spaces, + and - allowed)
    const phoneVal = String(formData.phone || '').trim();
    if (!phoneVal) {
      showError("ກະລຸນາປ້ອນເບີໂທຕິດຕໍ່!", 'phone');
      return;
    }
    const cleanPhone = phoneVal.replace(/[\s+\-()]/g, '');
    if (!/^\d+$/.test(cleanPhone)) {
      showError("ເບີໂທຕິດຕໍ່ຕ້ອງເປັນຕົວເລກເທົ່ານັ້ນ!", 'phone');
      return;
    }

    // Validate Email Address
    const emailVal = String(formData.email || '').trim();
    if (!emailVal) {
      showError("ກະລຸນາປ້ອນອີເມລຕິດຕໍ່!", 'email');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showError("ຮູບແບບອີເມລບໍ່ຖືກຕ້ອງ!", 'email');
      return;
    }

    // Validate Address fields
    if (!String(formData.curr_village || '').trim()) {
      showError("ກະລຸນາປ້ອນບ້ານປັດຈຸບັນ!", 'curr_village');
      return;
    }
    if (!String(formData.curr_district || '').trim()) {
      showError("ກະລຸນາປ້ອນເມືອງປັດຈຸບັນ!", 'curr_district');
      return;
    }
    if (!String(formData.curr_province || '').trim()) {
      showError("ກະລຸນາປ້ອນແຂວງປັດຈຸບັນ!", 'curr_province');
      return;
    }

    // Validate Birthplace fields (ບ້ານເກີດ, ເມືອງເກີດ, ແຂວງເກີດ)
    if (!String(formData.birth_village || '').trim()) {
      showError("ກະລຸນາປ້ອນບ້ານເກີດ!", 'birth_village');
      return;
    }
    if (!String(formData.birth_district || '').trim()) {
      showError("ກະລຸນາປ້ອນເມືອງເກີດ!", 'birth_district');
      return;
    }
    if (!String(formData.birth_province || '').trim()) {
      showError("ກະລຸນາປ້ອນແຂວງເກີດ!", 'birth_province');
      return;
    }

    // Validate Education 1 fields (must fill at least 1 entry)
    if (!String(formData.edu1_school || '').trim() ||
        !String(formData.edu1_degree || '').trim() ||
        !String(formData.edu1_major || '').trim() ||
        !String(formData.edu1_year || '').trim()) {
      showError("ກະລຸນາປ້ອນປະຫວັດການສຶກສາຢ່າງໜ້ອຍ 1 ຊ່ອງໃຫ້ຄົບຖ້ວນ!", 'edu1_school');
      return;
    }

    // Validate Computer Skills (must select all 3 main programs: Word, Excel, PPT)
    const isChecked = (key: string) => formData[key] === true || formData[key] === 'true';
    const hasWord = isChecked('com_word_vgood') || isChecked('com_word_good') || isChecked('com_word_weak');
    const hasExcel = isChecked('com_excel_vgood') || isChecked('com_excel_good') || isChecked('com_excel_weak');
    const hasPpt = isChecked('com_ppt_vgood') || isChecked('com_ppt_good') || isChecked('com_ppt_weak');

    if (!hasWord || !hasExcel || !hasPpt) {
      showError("ກະລຸນາເລືອກລະດັບທັກສະຄອມພິວເຕີໃຫ້ຄົບທັງ 3 ໂປຣແກຣມ (MS Word, MS Excel, MS PPT)!", 'com_skills');
      return;
    }

    // Validate Language Skills (prompt user if skipped)
    const langSkillsSelected = Object.keys(formData).some(
      k => k.startsWith('lang_') && (k.endsWith('_good') || k.endsWith('_fair') || k.endsWith('_weak')) && (formData[k] === true || formData[k] === 'true')
    );
    if (!langSkillsSelected && !skipLangCheck) {
      setShowLangPromptModal(true);
      return;
    }

    // Validate Section 12: Emergency Contact 1 (must fill at least 1 entry completely)
    if (!String(formData.emg1_name || '').trim() ||
        !String(formData.emg1_address || '').trim() ||
        !String(formData.emg1_phone || '').trim() ||
        !String(formData.emg1_relation || '').trim()) {
      showError("ກະລຸນາປ້ອນຂໍ້ມູນບຸກຄົນອ້າງອີງ/ສຸກເສີນຢ່າງໜ້ອຍ 1 ຄົນໃຫ້ຄົບຖ້ວນ (ຊື່, ທີ່ຢູ່, ເບີໂທ, ສາຍພົວພັນ)!", 'emg1_name');
      return;
    }

    // Validate Photo File
    if (!photoFile) {
      showError("ກະລຸນາອັບໂຫຼດຮູບຜູ້ສະໝັກ 3x4!", 'applicant_photo');
      return;
    }

    // Validate Signature File
    if (!signatureFile) {
      showError("ກະລຸນາອັບໂຫຼດ ຫຼື ຖ່າຍຮູບລາຍເຊັນກ່ອນສົ່ງໃບສະໝັກ!", 'applicant_signature');
      return;
    }

    // Validate Attachment Files (applicant_resume)
    if (attachmentFiles.length === 0) {
      showError("ກະລຸນາອັບໂຫຼດເອກະສານຄັດຕິດ (CV, ໃບປະກາດ, ບັດປະຈຳຕົວ ຯລຯ) ຢ່າງໜ້ອຍ 1 ຢ່າງ!", 'applicant_resume');
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(10);
    const progressTimer = setInterval(() => {
      setSubmitProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 200);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value.toString());
      });
      if (signatureFile) {
        payload.append('applicant_signature', signatureFile);
      }
      if (photoFile) {
        payload.append('applicant_photo', photoFile);
      }
      attachmentFiles.forEach(file => {
        payload.append('applicant_resume', file);
      });

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/applications`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(progressTimer);
      setSubmitProgress(100);

      if (res.status === 200 || res.status === 201) {
        const draftKey = `ltc_draft_${id}`;
        localStorage.removeItem(draftKey);
        localStorage.removeItem(`LTC_FORM_DRAFT_${id || 'general'}`);
        if (res.data?.fileUrl) {
          setSubmittedPdfUrl(res.data.fileUrl);
        }
        if (res.data?.refCode) {
          setSubmittedRefCode(res.data.refCode);
        }
        setTimeout(() => {
          setShowSuccessModal(true);
          setIsSubmitting(false);
        }, 500);
      }
    } catch(err: any) {
      clearInterval(progressTimer);
      console.error(err);
      showError(err.response?.data?.error || `ເກີດຂໍ້ຜິດພາດໃນການສົ່ງຟອມ: ${err.message || 'Unknown Error'}`);
      setIsSubmitting(false);
    }
  };

  // Group fields by section
  const sections = FORM_20.fields.reduce((acc: Record<string, any[]>, field: any) => {
    if(!acc[field.section || 'General']) acc[field.section || 'General'] = [];
    acc[field.section || 'General'].push(field);
    return acc;
  }, {} as Record<string, any[]>);

  const formContent = (
    <div className={isAdminEdit ? "bg-white w-full" : ""}>
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Spinning Brand Logo */}
            <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 border-2 border-slate-100">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-corporate-primary animate-spin" />
              <img src="/2.png" alt="Lao Telecom" className="h-12 w-12 object-contain" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-800">
              ກຳລັງສົ່ງໃບສະໝັກ
            </h3>
            <div className="mb-4 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-corporate-primary transition-all duration-300 rounded-full" 
                style={{ width: `${submitProgress}%` }}
              />
            </div>
            <span className="text-2xl font-black text-corporate-primary">{submitProgress}%</span>
            <p className="mt-2 text-sm text-slate-500 font-semibold">
              {submitProgress < 30 ? 'ກຳລັງກວດສອບເອກະສານ ແລະ ຂໍ້ມູນ...' :
               submitProgress < 75 ? 'ກຳລັງປະມວນຜົນ ແລະ ສ້າງໄຟລ໌ PDF ໃບສະໝັກ...' :
               'ກຳລັງບັນທຶກຂໍ້ມູນລົງໃນລະບົບ...'}
            </p>
          </div>
        </div>
      )}

      {showLangPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md my-8 animate-in fade-in zoom-in duration-300 transform rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl border border-amber-100">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 border border-amber-200 animate-bounce">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="mb-2 text-xl font-black text-slate-800">
              ແຈ້ງເຕືອນຄວາມສາມາດທາງດ້ານພາສາ
            </h3>
            <p className="mb-6 text-slate-600 leading-relaxed text-sm">
              ທ່ານບໍ່ໄດ້ຕິກເລືອກຄວາມສາມາດທາງດ້ານພາສາໃດໆ (ອ່ານ, ຂຽນ, ເວົ້າ). ທ່ານບໍ່ໄດ້ພາສາຕ່າງປະເທດແທ້ ຫຼື ທ່ານລືມຕິກເລືອກ?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReturnToLang}
                className="flex-1 rounded-2xl bg-corporate-primary py-3 font-bold text-white shadow-lg shadow-corporate-primary/20 transition-all hover:bg-corporate-primary/90 text-sm"
              >
                ກັບໄປເລືອກ/ຕິກຂໍ້ມູນ
              </button>
              <button
                type="button"
                onClick={handleConfirmSkipLang}
                className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-700 hover:bg-slate-200 transition-all text-sm border border-slate-300"
              >
                ດຳເນີນການສົ່ງຕໍ່
              </button>
            </div>
          </div>
        </div>
      )}

      {validationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md my-8 animate-in fade-in zoom-in duration-300 transform rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl border border-rose-100">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 border border-rose-100 animate-bounce">
              <AlertTriangle className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="mb-2 text-xl font-black text-slate-800">
              ຂໍ້ມູນບໍ່ຄົບຖ້ວນ ຫຼື ບໍ່ຖືກຕ້ອງ
            </h3>
            <p className="mb-6 text-slate-600 leading-relaxed text-sm">
              {validationError}
            </p>
            <button
              onClick={dismissError}
              className="w-full rounded-2xl bg-rose-500 py-3 font-bold text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-600 hover:-translate-y-0.5 active:translate-y-0 text-sm"
            >
              ຕົກລົງ — ໄປແກ້ໄຂຂໍ້ມູນ
            </button>
          </div>
        </div>
      )}

      {showSuccessModal && !isAdminEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-md my-8 animate-in fade-in zoom-in duration-300 transform rounded-3xl bg-white p-6 sm:p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="mb-2 text-2xl font-black text-slate-800">
              ສະໝັກສຳເລັດ!
            </h3>
            <p className="mb-6 text-slate-600 leading-relaxed text-xs sm:text-sm">
              ລະບົບໄດ້ຮັບຂໍ້ມູນ ແລະ ເອກະສານການສະໝັກຂອງທ່ານຮຽບຮ້ອຍແລ້ວ. ທາງພວກເຮົາຈະຕິດຕໍ່ກັບຫາທ່ານຜ່ານ Gmail ພາຍໃນ 7 ວັນເຮັດວຽກ ຫາກທ່ານຜ່ານການຄັດເລືອກໃນເບື້ອງຕົ້ນ.
            </p>

            {submittedRefCode && (
              <div className="mb-5 inline-block rounded-2xl bg-corporate-primary/5 border border-corporate-primary/15 px-5 py-2.5 w-full">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">ລະຫັດອ້າງອີງ (Ref Code)</span>
                <span className="text-lg font-black text-corporate-primary tracking-wider">{submittedRefCode}</span>
              </div>
            )}

            {submittedRefCode && (
              <div className="mb-5 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-slate-800 font-black text-xs uppercase tracking-wide border-b border-slate-200 pb-2">
                  <span className="text-base">💡</span>
                  <span>ວິທີນຳໃຊ້ ລະຫັດອ້າງອີງ (3 ຂັ້ນຕອນງ່າຍໆ):</span>
                </div>

                <div className="space-y-3 text-xs text-slate-700 font-semibold">
                  {/* Step 1: Copy Code */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 font-bold text-slate-800">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-corporate-primary text-[10px] font-black text-white">1</span>
                        ກ໋ອບປີ້ (Copy) ລະຫັດນີ້:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(submittedRefCode);
                          setCopiedRef(true);
                          setTimeout(() => setCopiedRef(false), 2000);
                        }}
                        className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                          copiedRef 
                            ? 'bg-green-600 text-white shadow-sm' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 active:scale-95'
                        }`}
                      >
                        {copiedRef ? '✓ ກ໋ອບປີ້ແລ້ວ!' : '📋 ກ໋ອບປີ້ລະຫັດ'}
                      </button>
                    </div>
                    <div className="bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Ref Code:</span>
                      <code className="font-mono text-corporate-primary font-black text-sm tracking-wider">{submittedRefCode}</code>
                    </div>
                  </div>

                  {/* Visual Arrow */}
                  <div className="flex justify-center -my-1">
                    <span className="text-slate-400 text-xs font-bold animate-bounce">⬇️</span>
                  </div>

                  {/* Step 2: Search */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-corporate-primary text-[10px] font-black text-white">2</span>
                      ວາງ (Paste) ໃສ່ຊ່ອງກວດສອບສະຖານະ:
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-300">
                      <div className="flex-1 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-800 font-mono font-bold truncate">
                        {submittedRefCode}
                      </div>
                      <div className="bg-corporate-primary text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shrink-0">
                        🔍 ຄົ້ນຫາ
                      </div>
                    </div>
                  </div>

                  {/* Visual Arrow */}
                  <div className="flex justify-center -my-1">
                    <span className="text-slate-400 text-xs font-bold">⬇️</span>
                  </div>

                  {/* Step 3: Result */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800 mb-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">3</span>
                      ລະບົບຈະສະແດງຜົນການສະໝັກ:
                    </span>
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-[11px] text-emerald-900 flex items-center justify-between font-bold">
                      <span>ສະຖານະ: <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">⏳ ພິຈາລະນາ (PENDING)</span></span>
                      <span className="text-[10px] bg-corporate-primary text-white px-2 py-0.5 rounded-md font-sans">📄 PDF</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {submittedPdfUrl && (
                <a
                  href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${submittedPdfUrl}`}
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-corporate-primary py-3 font-bold text-white shadow-lg shadow-corporate-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 text-sm"
                >
                  <Download className="w-4 h-4" /> ດາວໂຫຼດ PDF ໃບສະໝັກ
                </a>
              )}

              {submittedRefCode && (
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                    `🔴 *ບໍລິສັດ ລາວ ໂທລະຄົມ ມະຫາຊົນ (Lao Telecom)*\n` +
                    `📄 *ໃບສະໝັກວຽກ (LTC Portal)*\n` +
                    `📌 *ລະຫັດອ້າງອີງ:* ${submittedRefCode}\n` +
                    `👤 *ຊື່ຜູ້ສະໝັກ:* ${formData.first_name} ${formData.last_name}\n` +
                    `💼 *ຕຳແໜ່ງ:* ${formData.pos_applying || id}\n\n` +
                    `🖼️ *Logo & Portal:* ${window.location.origin}/2.png\n` +
                    `📱 *ຕິດຕາມສະຖານະ:* ${window.location.origin}/?status_check=1&q=${submittedRefCode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-emerald-600 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 text-sm"
                >
                  💬 ແຊຣ໌ຫາ WhatsApp
                </a>
              )}

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full rounded-2xl bg-slate-100 py-3 font-bold text-slate-700 hover:bg-slate-200 transition-all text-sm mt-1"
              >
                ກັບຄືນໜ້າຫຼັກ
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isAdminEdit && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-8 gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-corporate-primary" />
            <h2 className="text-lg font-bold text-slate-800">ຂໍ້ມູນແບບຟອມ (ສາມາດແກ້ໄຂໄດ້)</h2>
          </div>
          <button type="button" onClick={() => onAdminSave && onAdminSave(formData)} className="w-full sm:w-auto px-6 py-2.5 bg-corporate-primary hover:bg-corporate-primary/90 text-white font-bold rounded-xl transition-colors shadow-lg shadow-corporate-primary/20">
            ບັນທຶກການແກ້ໄຂ
          </button>
        </div>
      )}

      {restoredDraftToast && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>ລະບົບໄດ້ກູ້ຄືນຂໍ້ມູນຮ່າງໃບສະໝັກທີ່ທ່ານເຄີຍພິມໄວ້ອັດໂນມັດ (Autosaved Draft)</span>
          </div>
          <button type="button" onClick={() => setRestoredDraftToast(false)} className="text-emerald-600 hover:text-emerald-900 font-black">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="card-panel space-y-8 sm:space-y-12 shadow-none border-none">
        {!isAdminEdit && (
          <div>
            <div className="mb-2 flex items-start gap-3">
              <FileText className="h-7 w-7 shrink-0 text-corporate-primary sm:h-8 sm:w-8" />
              <h2 className="text-xl font-bold leading-tight text-corporate-ltc sm:text-2xl md:text-3xl">
                {FORM_20.name}
              </h2>
            </div>
            <p className="text-sm text-corporate-muted sm:text-base">
              ຕຳແໜ່ງທີ່ສະໝັກ:{' '}
              <span className="ml-1 inline-block rounded bg-slate-100 px-2 py-1 font-mono text-corporate-accent">
                {id}
              </span>
            </p>
          </div>
        )}

        {Object.entries(sections).map(([sectionName, fields]) => {
          return (
            <div key={sectionName} className="space-y-6">
            {!(isAdminEdit && sectionName === '13. ເອກະສານ ແລະ ການຢືນຢັນ') && (
              <h3 className="form-section-title">
                {sectionName}
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              {sectionName === '9. ຄວາມສາມາດທາງດ້ານພາສາ' ? (
                <div id="field-lang_skills" data-field-id="lang_skills" className="col-span-12"><LanguagesTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '3. ຄວາມສາມາດໃນການຂັບຂີ່' ? (
                <div id="field-motorbike_yes" data-field-id="motorbike_yes" className="col-span-12"><DrivingTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '6. ປະຫວັດການສຶກສາ' ? (
                <div id="field-edu1_school" data-field-id="edu1_school" className="col-span-12"><EducationTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '7. ການຝຶກອົບຮົມ' ? (
                <div className="col-span-12"><TrainingTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '8. ທັກສະຄອມພິວເຕີ' ? (
                <div id="field-com_skills" data-field-id="com_skills" className="col-span-12"><ComputerSkillsTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '11. ປະສົບການເຮັດວຽກ' ? (
                <div className="col-span-12"><WorkExperienceTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '12. ບຸກຄົນອ້າງອີງ/ສຸກເສີນ' ? (
                <div id="field-emg1_name" data-field-id="emg1_name" className="col-span-12"><EmergencyContactTable values={formData} onChange={handleValueChange} /></div>
              ) : (fields as any[]).map((field: any) => {
                const colClass = field.colSpan === 4 ? 'col-span-12 md:col-span-3'
                               : field.colSpan === 3 ? 'col-span-12 md:col-span-4'
                               : field.colSpan === 2 ? 'col-span-12'
                               : 'col-span-12 md:col-span-6';

                if (field.id === 'applicant_photo') {
                   if (isAdminEdit) return null;
                   return (
                     <div key={field.id} id="field-applicant_photo" className="col-span-12 sm:col-span-6 md:col-span-4 pt-4 pb-2">
                        <div className="flex items-end justify-between mb-3 px-1">
                          <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide">{field.label}</label>
                          <span className="text-xs text-slate-400">ສູງສຸດ 5MB</span>
                        </div>
                        <input type="file" accept="image/*" className="hidden" ref={photoInputRef} onChange={handlePhotoChange} />
                        <div 
                          className="bg-slate-50 border-2 border-dashed border-slate-200 hover:border-corporate-primary hover:bg-slate-100 transition-all rounded-2xl w-32 h-40 flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden shadow-sm"
                          onClick={() => photoInputRef.current?.click()}
                        >
                          {photoPreview ? (
                            <img src={photoPreview} alt="Applicant Photo" className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" />
                          ) : (
                            <div className="flex flex-col items-center justify-center w-full h-full relative z-10 pointer-events-none p-3 text-center">
                              <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-corporate-primary transition-colors mb-2" />
                              <p className="text-slate-400 font-bold group-hover:text-corporate-primary transition-colors text-[10px]">ເລືອກຟາຍລ໌ຮູບ 3x4</p>
                              <p className="text-[9px] text-slate-400 mt-1 font-normal">(.jpg, .png)</p>
                            </div>
                          )}
                          {photoPreview && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <p className="text-white font-bold bg-black/60 px-3 py-1.5 rounded-lg text-[10px] backdrop-blur-sm shadow-xl flex items-center gap-1"><UploadCloud className="w-3 h-3"/> ປ່ຽນຟາຍລ໌ຮູບ</p>
                            </div>
                          )}
                        </div>
                     </div>
                   );
                }

                if (field.id === 'applicant_signature') {
                   if (isAdminEdit) return null;
                   return (
                     <div key={field.id} id="field-applicant_signature" className="col-span-12 pt-4">
                        <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide px-1 block mb-3">{field.label}</label>
                        {/* Hidden file inputs */}
                        <input type="file" accept="image/png, image/jpeg, image/jpg" className="hidden" ref={fileInputRef} onChange={handleSignatureChange} />
                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[200px] transition-colors">
                          {signaturePreview ? (
                            <div className="relative">
                              <img src={signaturePreview} alt="Signature Preview" className="max-h-32 object-contain bg-white rounded-md p-2 shadow-inner" />
                              <button type="button" className="absolute -right-3 -top-3 bg-red-500 rounded-full w-8 h-8 text-slate-800 flex items-center justify-center" onClick={() => { setSignaturePreview(null); setSignatureFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}>&times;</button>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="w-10 h-10 text-slate-400 mb-4" />
                              <p className="text-slate-700 font-bold mb-2">ອັບໂຫຼດຮູບລາຍເຊັນ</p>
                              <p className="text-slate-500 text-xs mb-6">ຮອງຮັບ .png, .jpg, .jpeg ສຳລັບຝັງລົງ PDF</p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                <button type="button" onClick={() => startCamera('signature')} className="flex items-center justify-center gap-2 px-6 py-3 bg-corporate-accent hover:brightness-95 text-white font-bold rounded-xl transition-all hover:shadow-[0_0_15px_rgba(227,28,37,0.3)]">
                                  <Camera className="w-5 h-5" /> ຖ່າຍຮູບ
                                </button>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all border border-slate-300">
                                  <UploadCloud className="w-5 h-5" /> ເລືອກຮູບ
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                         {/* Photo tips */}
                         <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                           <p className="text-xs font-black text-amber-700 uppercase tracking-wide mb-2">📷 ຄຳແນະນຳການຖ່າຍຮູບລາຍເຊັນ</p>
                           <ul className="space-y-1.5 text-xs text-amber-800 leading-relaxed">
                             <li className="flex items-start gap-2"><span className="shrink-0">✅</span> <span>ວາງລາຍເຊັນໃສ່ <strong>ເຈ້ຍສີຂາວ</strong>, ໃຊ້ <strong>ປາກກາດຳ</strong> ຫຼື <strong>ຄ້ອຍດຳ</strong> ເທົ່ານັ້ນ</span></li>
                             <li className="flex items-start gap-2"><span className="shrink-0">✅</span> <span>ຖ່າຍ <strong>ຈາກຂ້າງເທິງ ຊື່ໆ</strong> — ຢ່າໝຸນ ຫຼື ອ້ຽງ ກ້ອງ</span></li>
                             <li className="flex items-start gap-2"><span className="shrink-0">✅</span> <span>ໃຫ້ <strong>ລາຍເຊັນຢູ່ກາງຮູບ</strong> ແລະ ເຫັນຊັດ, ບໍ່ຫຼຸດອອກຈາກກອບ</span></li>
                             <li className="flex items-start gap-2"><span className="shrink-0">❌</span> <span>ຫຼີກລ່ຽງ <strong>ດິນສໍ, ສໍາສີ ຫຼື ລາຍເຊັນສີຈາງ</strong> — ຈະເຫັນບໍ່ຊັດໃນ PDF</span></li>
                           </ul>
                         </div>

                     </div>
                   );
                }

                if (field.id === 'sign_date') {
                   const currentDateVal = (formData['sign_date'] as string) || getTodayLaoDate();
                   return (
                     <div key={field.id} id="field-sign_date" className={`flex flex-col space-y-1.5 md:space-y-2 ${colClass}`}>
                        <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide px-1">
                          {field.label}
                        </label>
                        <input 
                          type="text"
                          name="sign_date"
                          readOnly
                          disabled
                          value={currentDateVal}
                          className="bg-slate-100/90 border-2 border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl text-slate-700 font-bold w-full text-sm outline-none cursor-not-allowed select-none font-mono"
                        />
                     </div>
                   );
                }

                if (field.id === 'applicant_resume') {
                   if (isAdminEdit) return null;
                   return (
                     <div key={field.id} id="field-applicant_resume" data-field-id="applicant_resume" className="col-span-12 pt-4">
                        <div className="flex items-end justify-between mb-3 px-1">
                          <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide">{field.label} {field.required && <span className="text-red-500 ml-1">*</span>}</label>
                          <span className="text-xs text-slate-400">ສູງສຸດ 5MB</span>
                        </div>
                        <input type="file" multiple className="hidden" ref={attachmentInputRef} onChange={handleAttachmentChange} />
                         <div className="bg-white border-2 border-dashed border-slate-200 hover:border-corporate-primary hover:bg-slate-50 transition-colors rounded-2xl p-6 min-h-[150px] flex flex-col items-center justify-center relative">
                           {attachmentFiles.length > 0 ? (
                             <div className="flex flex-col gap-3 w-full" onClick={e => e.stopPropagation()}>
                               {attachmentFiles.map((f, i) => (
                                 <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                    <span className="text-sm text-slate-700 truncate font-semibold mr-4"><FileText className="inline w-4 h-4 mr-2 text-corporate-primary" />{f.name}</span>
                                    <button type="button" onClick={(e) => removeAttachment(e, i)} className="text-red-400 hover:text-red-500 px-3 py-1 bg-red-500/10 rounded-lg text-xs font-bold">X</button>
                                 </div>
                               ))}
                               <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                                 <button type="button" onClick={() => startCamera('document')} className="flex items-center justify-center gap-2 px-4 py-2 bg-corporate-accent text-white font-bold rounded-lg hover:brightness-95 transition-all text-sm shadow-sm hover:shadow-[0_0_10px_rgba(227,28,37,0.3)]">
                                   <Camera className="w-4 h-4" /> ຖ່າຍຮູບ & ແປງເປັນ PDF
                                 </button>
                                 <button type="button" onClick={() => attachmentInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-200 transition-all text-sm">
                                   <UploadCloud className="w-4 h-4" /> ອັບໂຫຼດເພີ່ມ
                                 </button>
                               </div>
                             </div>
                           ) : (
                             <div className="flex flex-col items-center justify-center w-full text-center">
                               <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                               <p className="text-slate-700 font-bold mb-1">ເລືອກເອກະສານຕ່າງໆ</p>
                               <p className="text-slate-500 text-xs mb-5">ເຊັ່ນ: ບັດປະຈຳຕົວ, ໃບປະກາດ, CV</p>
                               <div className="flex flex-col sm:flex-row gap-3">
                                 <button type="button" onClick={() => startCamera('document')} className="flex items-center justify-center gap-2 px-4 py-2 bg-corporate-accent text-white font-bold rounded-lg hover:brightness-95 transition-all text-sm shadow-sm hover:shadow-[0_0_10px_rgba(227,28,37,0.3)]">
                                   <Camera className="w-4 h-4" /> ຖ່າຍຮູບ & ແປງເປັນ PDF
                                 </button>
                                 <button type="button" onClick={() => attachmentInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-300 hover:bg-slate-200 transition-all text-sm">
                                   <UploadCloud className="w-4 h-4" /> ເລືອກຟາຍລ໌
                                 </button>
                               </div>
                             </div>
                           )}
                        </div>
                     </div>
                   );
                }

                if (field.type === 'checkbox') {
                  return (
                    <label key={field.id} id={`field-${field.id}`} data-field-id={field.id} className={`flex flex-row items-center cursor-pointer p-3 md:p-4 bg-slate-50 border-2 border-slate-200 rounded-xl md:rounded-2xl hover:border-corporate-primary/50 transition-all gap-3 md:gap-4 select-none ${colClass}`}>
                      <input 
                        type="checkbox" 
                        name={field.id} 
                        id={field.id}
                        checked={formData[field.id] === true || formData[field.id] === 'true'}
                        onChange={handleInputChange}
                        className="w-5 h-5 accent-corporate-primary bg-white border-2 border-slate-200 rounded focus:ring-corporate-primary cursor-pointer shrink-0"
                      />
                      <span className="text-xs md:text-sm font-bold text-slate-700">
                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </label>
                  );
                }

                return (
                  <div key={field.id} id={`field-${field.id}`} className={`flex flex-col space-y-1.5 md:space-y-2 ${colClass}`}>
                    <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide px-1">
                      {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                       <textarea 
                          name={field.id}
                          required={field.required}
                          value={(formData[field.id] as string) || ''}
                          onChange={handleInputChange as any}
                          rows={3}
                          className="bg-white border-2 border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl focus:border-corporate-primary outline-none text-slate-800 w-full text-sm placeholder:text-slate-700"
                       />
                    ) : field.type === 'radio' ? (
                       <div className="flex flex-row gap-3 md:gap-4 w-full">
                         {(field.options || []).map((opt: any) => {
                           const optValue = typeof opt === 'string' ? opt : opt.value;
                           const optLabel = typeof opt === 'string' ? opt : opt.label;
                           const isSelected = formData[field.id] === optValue;
                           return (
                             <label 
                               key={optValue}
                               className={`flex-1 flex items-center justify-center p-3 md:p-4 rounded-xl md:rounded-2xl border-2 cursor-pointer transition-all duration-200 select-none ${
                                 isSelected 
                                   ? 'bg-corporate-primary/10 border-corporate-primary text-corporate-primary font-black shadow-sm'
                                   : 'bg-white border-slate-200 text-slate-600 hover:border-corporate-primary/50 hover:bg-slate-50'
                               }`}
                             >
                               <input 
                                 type="radio" 
                                 name={field.id}
                                 value={optValue}
                                 checked={isSelected}
                                 onChange={handleInputChange as any}
                                 className="hidden"
                               />
                               {optLabel}
                             </label>
                           );
                         })}
                       </div>
                    ) : field.type === 'select' ? (
                       <CustomSelect field={field} formData={formData} handleInputChange={handleInputChange} />
                    ) : (
                       <input 
                         type={field.type}
                         name={field.id}
                         id={`field-${field.id}`}
                         required={field.required}
                         placeholder={field.placeholder || ''}
                         value={(formData[field.id] as string) || ''}
                         onChange={handleInputChange}
                         className="bg-white border-2 border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl focus:border-corporate-primary outline-none text-slate-800 w-full text-sm placeholder:text-slate-700 transition-all"
                       />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );})}
        
        {!isAdminEdit && (
          <div className="flex justify-stretch border-t border-corporate-border pt-6 sm:justify-end">
            <button type="submit" disabled={isSubmitting} className="btn-primary hover:shadow-[0_0_20px_rgba(227,28,37,0.3)] w-full sm:w-auto">
              {isSubmitting ? 'ກຳລັງສົ່ງຂໍ້ມູນ...' : 'ບັນທຶກ ແລະ ສ້າງ PDF'}
            </button>
          </div>
        )}
      </form>

      {cameraMode !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 p-0 sm:items-center sm:p-4">
          <div className="relative flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-corporate-border bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex justify-between items-center p-4 border-b border-corporate-border">
              <h3 className="text-slate-800 font-bold">{cameraMode === 'document' ? 'ຖ່າຍຮູບເອກະສານ' : 'ຖ່າຍຮູບລາຍເຊັນ'}</h3>
              <button type="button" onClick={stopCamera} className="text-corporate-muted hover:text-slate-800 p-1 bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-black w-full min-h-[60vh] sm:min-h-0 sm:aspect-video flex items-center justify-center">
               <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
               {cameraMode === 'document' && (
                 <div className="absolute inset-4 border-2 border-dashed border-corporate-primary/60 rounded-xl pointer-events-none flex flex-col justify-end p-4 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]">
                   <p className="text-white text-center text-sm font-bold drop-shadow-md bg-black/40 inline-block px-3 py-1 rounded mx-auto mb-4">ວາງເອກະສານໃຫ້ເຕັມຂອບ</p>
                 </div>
               )}
               {cameraMode === 'signature' && (
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[40%] border-2 border-dashed border-corporate-primary/60 rounded-xl pointer-events-none flex flex-col justify-end p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                   <p className="text-white text-center text-sm font-bold drop-shadow-md bg-black/40 inline-block px-3 py-1 rounded mx-auto mb-[-8px]">ວາງລາຍເຊັນໄວ້ພາຍໃນກອບນີ້</p>
                 </div>
               )}
            </div>
            <div className="p-4 flex justify-center border-t border-corporate-border">
               <button type="button" onClick={capturePhoto} className="flex items-center justify-center gap-2 px-8 py-3 w-full sm:w-auto bg-corporate-accent hover:brightness-95 text-white font-bold rounded-full transition-all shadow-[0_0_15px_rgba(227,28,37,0.3)]">
                 <Camera className="w-5 h-5" /> {cameraMode === 'document' ? 'ກົດຖ່າຍເປັນ PDF' : 'ກົດຖ່າຍ (Capture)'}
               </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );

  if (isAdminEdit) {
    return formContent;
  }

  return (
    <PageLayout maxWidth="5xl" showBack showHome>
      {formContent}
    </PageLayout>
  );
}


