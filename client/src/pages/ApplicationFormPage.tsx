import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, Camera, X } from 'lucide-react';
import { FORM_20 } from '../lib/form20Schema';
import axios from 'axios';
import { LanguagesTable, DrivingTable, EducationTable, TrainingTable, ComputerSkillsTable, WorkExperienceTable, EmergencyContactTable } from '../components/Form20Tables';
import PageLayout from '../components/PageLayout';

export default function ApplicationFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Record<string, string | boolean | number>>({
    pos_applying: id || ''
  });
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // WebRTC Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setVideoStream(stream);
      setIsCameraOpen(true);
      // Wait for React to render the <video> element before assigning the stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 0);
    } catch (err) {
      console.error("Camera error:", err);
      alert("ບໍ່ສາມາດເປີດກ້ອງໄດ້. ໝັ້ນໃຈວ່າອຸປະກອນມີກ້ອງ ແລະ ທ່ານໄດ້ອະນຸຍາດນຳໃຊ້ກ້ອງ (Camera Permission).");
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    setVideoStream(null);
    setIsCameraOpen(false);
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
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera_signature.jpg", { type: "image/jpeg" });
            setSignatureFile(file);
            setSignaturePreview(URL.createObjectURL(file));
            stopCamera();
          }
        }, "image/jpeg");
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
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
    if (!signatureFile) {
      alert("ກະລຸນາອັບໂຫຼດລາຍເຊັນກ່ອນສົ່ງຟອມ (Please upload a signature).");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value.toString());
      });
      payload.append('applicant_signature', signatureFile);
      attachmentFiles.forEach(file => {
        payload.append('applicant_resume', file);
      });

      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/applications`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if(res.status === 200 || res.status === 201) {
        alert("ສະໝັກສຳເລັດ! ລະບົບໄດ້ບັນທຶກຂໍ້ມູນແລ້ວ.");
        navigate('/');
      }
    } catch(err: any) {
      console.error(err);
      alert(`ເກີດຂໍ້ຜິດພາດໃນການສົ່ງຟອມ: ${err.message || 'Unknown Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group fields by section
  const sections = FORM_20.fields.reduce((acc, field) => {
    if(!acc[field.section || 'General']) acc[field.section || 'General'] = [];
    acc[field.section || 'General'].push(field);
    return acc;
  }, {} as Record<string, typeof FORM_20.fields>);

  return (
    <PageLayout maxWidth="5xl" showBack showHome>
      <form onSubmit={handleSubmit} className="card-panel space-y-8 sm:space-y-12">
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

        {Object.entries(sections).map(([sectionName, fields]) => (
          <div key={sectionName} className="space-y-6">
            <h3 className="form-section-title">
              {sectionName}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              {sectionName === '9. ຄວາມສາມາດທາງດ້ານພາສາ' ? (
                <div className="col-span-12"><LanguagesTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '3. ຄວາມສາມາດໃນການຂັບຂີ່' ? (
                <div className="col-span-12"><DrivingTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '6. ປະຫວັດການສຶກສາ' ? (
                <div className="col-span-12"><EducationTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '7. ການຝຶກອົບຮົມ' ? (
                <div className="col-span-12"><TrainingTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '8. ທັກສະຄອມພິວເຕີ' ? (
                <div className="col-span-12"><ComputerSkillsTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '11. ປະສົບການເຮັດວຽກ' ? (
                <div className="col-span-12"><WorkExperienceTable values={formData} onChange={handleValueChange} /></div>
              ) : sectionName === '12. ບຸກຄົນອ້າງອີງ/ສຸກເສີນ' ? (
                <div className="col-span-12"><EmergencyContactTable values={formData} onChange={handleValueChange} /></div>
              ) : fields.map(field => {
                const colClass = field.colSpan === 4 ? 'col-span-12 md:col-span-3'
                               : field.colSpan === 3 ? 'col-span-12 md:col-span-4'
                               : field.colSpan === 2 ? 'col-span-12'
                               : 'col-span-12 md:col-span-6';

                if (field.id === 'applicant_signature') {
                   return (
                     <div key={field.id} className="col-span-12 pt-4">
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
                                <button type="button" onClick={startCamera} className="flex items-center justify-center gap-2 px-6 py-3 bg-corporate-primary hover:bg-[#0055aa] text-white font-bold rounded-xl transition-all hover:shadow-[0_0_15px_rgba(0,102,204,0.3)]">
                                  <Camera className="w-5 h-5" /> ຖ່າຍຮູບ
                                </button>
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all border border-slate-300">
                                  <UploadCloud className="w-5 h-5" /> ເລືອກຮູບ
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                     </div>
                   );
                }

                if (field.id === 'applicant_resume') {
                   return (
                     <div key={field.id} className="col-span-12 pt-4">
                        <div className="flex items-end justify-between mb-3 px-1">
                          <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide">{field.label}</label>
                          <span className="text-xs text-slate-400">ສູງສຸດ 5MB</span>
                        </div>
                        <input type="file" multiple className="hidden" ref={attachmentInputRef} onChange={handleAttachmentChange} />
                        <div className="bg-white border-2 border-dashed border-slate-200 hover:border-corporate-primary hover:bg-slate-50 transition-colors rounded-2xl p-6 min-h-[150px] cursor-pointer flex flex-col" onClick={() => attachmentInputRef.current?.click()}>
                           {attachmentFiles.length > 0 ? (
                             <div className="flex flex-col gap-3 w-full" onClick={e => e.stopPropagation()}>
                               {attachmentFiles.map((f, i) => (
                                 <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                                    <span className="text-sm text-slate-700 truncate font-semibold mr-4"><FileText className="inline w-4 h-4 mr-2 text-corporate-primary" />{f.name}</span>
                                    <button type="button" onClick={(e) => removeAttachment(e, i)} className="text-red-400 hover:text-red-500 px-3 py-1 bg-red-500/10 rounded-lg text-xs font-bold">X</button>
                                 </div>
                               ))}
                               <div className="mt-2 text-center text-corporate-primary font-bold hover:underline cursor-pointer" onClick={() => attachmentInputRef.current?.click()}>+ ເພີ່ມເອກະສານອີກ</div>
                             </div>
                           ) : (
                             <div className="flex flex-col items-center justify-center m-auto text-center pointer-events-none">
                               <UploadCloud className="w-10 h-10 text-slate-400 mb-3" />
                               <p className="text-slate-700 font-bold mb-1">ເລືອກເອກະສານຕ່າງໆ</p>
                               <p className="text-slate-500 text-xs">ເຊັ່ນ: ບັດປະຈຳຕົວ, ໃບປະກາດ, CV</p>
                             </div>
                           )}
                        </div>
                     </div>
                   );
                }

                if (field.type === 'checkbox') {
                  return (
                    <label key={field.id} className={`flex flex-row items-center cursor-pointer p-3 md:p-4 bg-slate-50 border-2 border-slate-200 rounded-xl md:rounded-2xl hover:border-corporate-primary/50 transition-all gap-3 md:gap-4 select-none ${colClass}`}>
                      <input 
                        type="checkbox" 
                        name={field.id} 
                        id={field.id}
                        checked={Boolean(formData[field.id])}
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
                  <div key={field.id} className={`flex flex-col space-y-1.5 md:space-y-2 ${colClass}`}>
                    <label className="text-[11px] md:text-sm font-black text-slate-500 uppercase tracking-wide px-1">
                      {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                       <textarea 
                          name={field.id}
                          required={field.required}
                          value={(formData[field.id] as string) || ''}
                          onChange={handleInputChange}
                          rows={3}
                          className="bg-white border-2 border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl focus:border-corporate-primary outline-none text-slate-800 w-full text-sm placeholder:text-slate-700"
                       />
                    ) : (
                       <input 
                         type={field.type}
                         name={field.id}
                         required={field.required}
                         placeholder={field.placeholder || ''}
                         value={(formData[field.id] as string) || ''}
                         onChange={handleInputChange}
                         className="bg-white border-2 border-slate-200 p-3 md:p-4 rounded-xl md:rounded-2xl focus:border-corporate-primary outline-none text-slate-800 w-full text-sm placeholder:text-slate-700"
                       />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="flex justify-stretch border-t border-corporate-border pt-6 sm:justify-end">
          <button type="submit" disabled={isSubmitting} className="btn-primary hover:shadow-[0_0_20px_rgba(0,102,204,0.3)]">
            {isSubmitting ? 'ກຳລັງສົ່ງຂໍ້ມູນ...' : 'ບັນທຶກ ແລະ ສ້າງ PDF'}
          </button>
        </div>
      </form>

      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/90 p-0 sm:items-center sm:p-4">
          <div className="relative flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-corporate-border bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex justify-between items-center p-4 border-b border-corporate-border">
              <h3 className="text-slate-800 font-bold">ຖ່າຍຮູບລາຍເຊັນ</h3>
              <button type="button" onClick={stopCamera} className="text-corporate-muted hover:text-slate-800 p-1 bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative bg-black w-full aspect-video flex items-center justify-center">
               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="p-4 flex justify-center border-t border-corporate-border">
               <button type="button" onClick={capturePhoto} className="flex items-center gap-2 px-8 py-3 bg-corporate-primary hover:bg-[#0055aa] text-white font-bold rounded-full transition-all shadow-[0_0_15px_rgba(0,102,204,0.3)]">
                 <Camera className="w-5 h-5" /> ກົດຖ່າຍ (Capture)
               </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </PageLayout>
  );
}
