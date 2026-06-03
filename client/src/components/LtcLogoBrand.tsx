const IMG_LTC = '/2.png';

type LtcLogoBrandProps = {
  className?: string;
  showText?: boolean;
};

export default function LtcLogoBrand({
  className = '',
  showText = true,
}: LtcLogoBrandProps) {
  const titleClass = 'text-[#303681]';
  const subtitleClass = 'text-[#303681]/75';

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      <img
        src={IMG_LTC}
        alt="Lao Telecom 30th Anniversary"
        className="h-12 w-auto shrink-0 object-contain sm:h-14 md:h-16 lg:h-[72px]"
      />
      {showText && (
        <div className="min-w-0 font-lao leading-tight">
          <p className={`truncate text-base font-bold sm:text-lg md:text-xl ${titleClass}`}>
            ລາວ ໂທລະຄົມ
          </p>
          <p
            className={`truncate text-xs font-semibold lowercase sm:text-sm md:text-base ${subtitleClass}`}
          >
            lao telecom
          </p>
        </div>
      )}
    </div>
  );
}
