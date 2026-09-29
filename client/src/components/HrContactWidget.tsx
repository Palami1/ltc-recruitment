import { Phone, Mail, Clock, MessageSquare, HelpCircle, MapPin } from 'lucide-react';

export default function HrContactWidget() {
  return (
    <div className="mt-8 rounded-3xl bg-gradient-to-br from-[#1a0505] via-[#450a0a] to-[#7f1d1d] text-white p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-red-800/40">
      {/* Background Decorative Rings & LTC Brand Glow */}
      <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-[#E31C25]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute left-1/4 -top-16 w-48 h-48 bg-[#FFD100]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left Side: Title & Description */}
        <div className="space-y-2.5 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/30 text-[11px] font-bold tracking-wide uppercase text-red-200 backdrop-blur-md shadow-inner">
            <HelpCircle className="w-3.5 h-3.5 text-[#FFD100]" />
            <span>ສູນຊ່ວຍເຫຼືອ & ສອບຖາມຂໍ້ມູນ ລາວ ໂທລະຄົມ</span>
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <span>ຕ້ອງການຄວາມຊ່ວຍເຫຼືອໃນການສະໝັກວຽກ?</span>
          </h3>
          <p className="text-xs sm:text-sm text-red-100/90 leading-relaxed font-normal">
            ຫາກທ່ານພົບຂໍ້ຂ້ອງໃຈ, ຕິດຂັດບັນຫາໃນການຕື່ມຟອມ ຫຼື ຕ້ອງການສອບຖາມເງື່ອນໄຂເພີ່ມເຕີມ ສາມາດຕິດຕໍ່ພະແນກຈັດຕັ້ງ-ບຸກຄະລາກອນ (HR) ໄດ້ໂດຍກົງ.
          </p>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
          <a
            href="tel:021216666"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
          >
            <Phone className="w-4 h-4 text-[#FFD100]" />
            <span>ໂທສາຍດ່ວນ HR</span>
          </a>
          <a
            href="https://wa.me/8562058787788"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#E31C25] hover:bg-red-600 text-white text-xs font-bold transition-all shadow-lg shadow-red-950/50 hover:shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] border border-red-400/30"
          >
            <MessageSquare className="w-4 h-4 text-white" />
            <span>WhatsApp ສອບຖາມ</span>
          </a>
        </div>
      </div>

      {/* Bottom Info Grid */}
      <div className="mt-6 pt-5 border-t border-red-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-red-100 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-950/70 border border-red-500/30 shrink-0 shadow-inner">
            <Mail className="w-4 h-4 text-[#FFD100]" />
          </div>
          <div>
            <p className="text-[10px] text-red-300 font-medium">ອີເມລພະແນກບຸກຄະລາກອນ</p>
            <p className="font-bold text-white tracking-wide">recruitment@laotel.com</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-950/70 border border-red-500/30 shrink-0 shadow-inner">
            <Clock className="w-4 h-4 text-[#FFD100]" />
          </div>
          <div>
            <p className="text-[10px] text-red-300 font-medium">ໂມງລັດຖະການ</p>
            <p className="font-bold text-white tracking-wide">ຈັນ - ສຸກ: 08:00 - 16:30</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-950/70 border border-red-500/30 shrink-0 shadow-inner">
            <MapPin className="w-4 h-4 text-[#FFD100]" />
          </div>
          <div>
            <p className="text-[10px] text-red-300 font-medium">ສະຖານທີ່</p>
            <p className="font-bold text-white tracking-wide">ສຳນັກງານໃຫຍ່ ລາວ ໂທລະຄົມ</p>
          </div>
        </div>
      </div>
    </div>
  );
}
