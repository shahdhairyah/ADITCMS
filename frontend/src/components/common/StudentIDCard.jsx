import { useState, useRef, useCallback } from 'react';
import { getInitials } from '../../utils/helpers';

const API_URL = import.meta.env.VITE_API_URL || 'https://adit.shahdhairyah.in/api';

function resolvePhotoUrl(photo) {
  if (!photo) return null;
  if (photo.startsWith('http')) return photo;
  return `${API_URL}/${photo}`;
}

const CARD_W = 340;
const CARD_H = 214;

const NAVY = '#0a2540';
const NAVY_2 = '#14407e';
const NAVY_3 = '#1d54a6';
const GOLD = '#c9a227';
const GOLD_L = '#ecd07a';

const MICRO = 'ADIT COLLEGE • STUDENT ID CARD • NON TRANSFERABLE • ';

export default function StudentIDCard({ profile, user, printRef }) {
  const [flipped, setFlipped] = useState(false);
  const cardRef = useRef(null);
  const p = profile || {};
  const initials = getInitials(p.first_name, p.last_name);
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Student';
  const dept = p.department_name || p.department || `Dept ${p.department_id || ''}`.trim() || '-';
  const enrollYear = p.enrollment_year || p.batch || new Date().getFullYear();
  const validFrom = enrollYear;
  const validUpto = Number(enrollYear) + 5 || '-';
  const rollDisplay = p.roll_number || `ADIT-${p.id || '0000'}`;
  const blood = p.blood_group || '-';
  const phone = p.phone || '-';
  const address = p.address || '-';
  const dob = p.dob || '-';
  const email = user?.email || '-';
  const semester = p.semester || '-';
  const course = p.course_name || p.course || 'B.Tech';
  const yearLabel = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const photoUrl = resolvePhotoUrl(p.photo);

  const handleFlip = useCallback(() => {
    setFlipped(f => !f);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4" id="student-id-card">
      {/* Card container with flip */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: 1000, width: CARD_W, height: CARD_H }}
        onClick={handleFlip}
        title="Click to flip"
      >
        <div
          className="absolute inset-0 transition-transform duration-700 ease-in-out"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)' }}
        >
          {/* ============================== FRONT ============================== */}
          <div
            className="absolute inset-0 rounded-[14px] overflow-hidden shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/30"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div ref={printRef || cardRef} className="relative w-full h-full" style={{ width: CARD_W, height: CARD_H }}>
              {/* Premium navy gradient base */}
              <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_2} 45%, ${NAVY_3} 78%, ${NAVY} 100%)` }} />

              {/* Guilloche security pattern */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 340 214" preserveAspectRatio="none">
                {Array.from({ length: 22 }).map((_, i) => (
                  <path
                    key={i}
                    d={`M ${-30 + i * 17} 214 Q ${170} ${-20 + i * 6} ${340 + 30 - i * 17} 214`}
                    fill="none"
                    stroke="rgba(255,255,255,0.055)"
                    strokeWidth="0.9"
                  />
                ))}
                {Array.from({ length: 14 }).map((_, i) => (
                  <path
                    key={`v${i}`}
                    d={`M 0 ${-20 + i * 17} Q ${120 + i * 4} 107 ${340} ${-20 + i * 17}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.035)"
                    strokeWidth="0.9"
                  />
                ))}
              </svg>

              {/* Diagonal light shine */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.09) 46%, rgba(255,255,255,0.02) 52%, transparent 60%)' }}
              />

              {/* Top gold hairline */}
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${GOLD_L} 30%, ${GOLD} 55%, ${GOLD_L} 80%, transparent)` }} />

              {/* ===== Header ===== */}
              <div className="absolute top-0 right-0 left-0 px-4 pt-3 pb-2 flex items-center gap-2.5">
                {/* CVM logo */}
                <div className="relative flex-shrink-0">
                  <img
                    src="/CVM.webp"
                    alt="CVM"
                    className="w-[38px] h-[38px] rounded-full object-contain bg-white ring-2 ring-[#c9a227] shadow-lg"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute -inset-[3px] rounded-full ring-1 ring-white/20 pointer-events-none" />
                </div>

                <div className="min-w-0 flex-1 text-center">
                  <h4 className="font-black text-[15px] leading-none tracking-[0.06em] uppercase text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                    ADIT College
                  </h4>
                  <p className="text-[6.5px] tracking-[0.42em] uppercase font-semibold mt-[3px] text-[#ecd07a]">
                    Excellence in Engineering
                  </p>
                  <div className="mx-auto mt-[3px] h-[2px] w-24 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD} 30%, ${GOLD_L} 50%, ${GOLD} 70%, transparent)` }} />
                </div>

                {/* ADIT logo */}
                <div className="relative flex-shrink-0">
                  <img
                    src="/adit.webp"
                    alt="ADIT"
                    className="w-[38px] h-[38px] rounded-full object-contain bg-white ring-2 ring-[#c9a227] shadow-lg"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute -inset-[3px] rounded-full ring-1 ring-white/20 pointer-events-none" />
                </div>
              </div>

              {/* Gold divider */}
              <div className="absolute top-[52px] left-4 right-4 h-px" style={{ background: `linear-gradient(90deg, transparent, rgba(201,162,39,0.55) 20%, rgba(236,208,122,0.9) 50%, rgba(201,162,39,0.55) 80%, transparent)` }} />

              {/* ===== Body ===== */}
              <div className="absolute top-[58px] right-4 bottom-[46px] left-4 flex gap-3.5">
                {/* Photo — realistic passport mount */}
                <div className="flex-shrink-0 self-center">
                  <div className="w-[68px] h-[82px] rounded-[7px] bg-white p-[3.5px] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)]">
                    <div className="w-full h-full rounded-[4px] overflow-hidden bg-[#dde6f2] ring-1 ring-[#8fa3c0]">
                      {photoUrl ? (
                        <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[#0b3d91] font-bold text-xl">{initials}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Photo mount rivets */}
                  <div className="absolute -top-[2px] left-[3px] w-[7px] h-[7px] rounded-full bg-[#c9a227] ring-2 ring-white/80" />
                  <div className="absolute -top-[2px] right-[3px] w-[7px] h-[7px] rounded-full bg-[#c9a227] ring-2 ring-white/80" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-[4px]">
                  <div>
                    <h3 className="text-[16px] font-extrabold leading-tight truncate text-white uppercase tracking-wide" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.45)' }}>
                      {fullName}
                    </h3>
                    <p className="text-[7.5px] font-bold tracking-[0.22em] uppercase mt-[3px] text-[#ecd07a]">
                      {course} • {dept}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-[5px] mt-[3px]">
                    <Field label="Roll No" value={rollDisplay} />
                    <Field label="Semester" value={semester} />
                    <Field label="Date of Birth" value={dob} />
                    <Field label="Blood Group" value={blood} />
                    <Field label="Batch" value={validFrom} />
                    <Field label="Card No" value={`ADIT${p.id || '0000'}`} />
                  </div>
                </div>

                {/* Hologram security seal */}
                <div className="absolute right-0 bottom-0 flex flex-col items-center gap-[2px]">
                  <div className="relative w-[46px] h-[46px] rounded-full overflow-hidden shadow-lg" style={{ background: 'conic-gradient(from 0deg, #ff5e7a, #ffd166, #7afcff, #b78bff, #ff5e7a)' }}>
                    <div className="absolute inset-[8px] rounded-full bg-white" />
                    <div className="absolute inset-[9px] rounded-full" style={{ background: 'conic-gradient(from 60deg, #ff5e7a, #ffd166, #7afcff, #b78bff, #ff5e7a)' }} />
                    <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), transparent 55%)' }} />
                  </div>
                  <p className="text-[5px] font-bold tracking-[0.3em] text-white/50">SECURITY</p>
                </div>
              </div>

              {/* Micro-print */}
              <div className="absolute top-[168px] left-0 right-0 overflow-hidden whitespace-nowrap pointer-events-none">
                <p className="text-[5px] tracking-[0.18em] text-white/30">{MICRO}{MICRO}{MICRO}{MICRO}</p>
              </div>

              {/* ===== Footer band ===== */}
              <div className="absolute bottom-0 left-0 right-0 h-[46px] px-4 flex items-center justify-between gap-3" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.28), rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.28))' }}>
                {/* Validity */}
                <div className="flex gap-5">
                  <MiniField label="Valid From" value={validFrom} />
                  <MiniField label="Valid Upto" value={validUpto} />
                </div>

                {/* Barcode */}
                <div className="flex flex-col items-end gap-[2px]">
                  <div className="flex gap-[1px] h-[20px] items-end">
                    {Array.from({ length: 32 }).map((_, i) => {
                      const h = [20, 12, 17, 9, 15, 20, 10, 16, 8, 18, 13, 20, 9, 17, 11, 14, 20, 8, 15, 10, 18, 13, 9, 20, 14, 11, 20, 10, 17, 12, 8, 20][i];
                      const w = [2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1][i];
                      return <div key={i} className="bg-white rounded-[0.5px]" style={{ height: h, width: w }} />;
                    })}
                  </div>
                  <p className="text-[6px] text-white/70 font-mono tracking-[0.22em]">{rollDisplay}</p>
                </div>
              </div>

              {/* Bottom gold stripe */}
              <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_L}, ${GOLD})` }} />

              {/* Corner accents */}
              <div className="absolute top-[8px] left-[8px] w-3.5 h-3.5 border-t-2 border-l-2 border-[#ecd07a]/60 rounded-tl" />
              <div className="absolute top-[8px] right-[8px] w-3.5 h-3.5 border-t-2 border-r-2 border-[#ecd07a]/60 rounded-tr" />
            </div>
          </div>

          {/* ============================== BACK ============================== */}
          <div
            className="absolute inset-0 rounded-[14px] overflow-hidden shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/30"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="relative w-full h-full" style={{ width: CARD_W, height: CARD_H }}>
              {/* Premium navy gradient base — same as front */}
              <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_2} 45%, ${NAVY_3} 78%, ${NAVY} 100%)` }} />

              {/* Guilloche security pattern — same as front */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 340 214" preserveAspectRatio="none">
                {Array.from({ length: 22 }).map((_, i) => (
                  <path
                    key={i}
                    d={`M ${-30 + i * 17} 214 Q ${170} ${-20 + i * 6} ${340 + 30 - i * 17} 214`}
                    fill="none"
                    stroke="rgba(255,255,255,0.055)"
                    strokeWidth="0.9"
                  />
                ))}
                {Array.from({ length: 14 }).map((_, i) => (
                  <path
                    key={`v${i}`}
                    d={`M 0 ${-20 + i * 17} Q ${120 + i * 4} 107 ${340} ${-20 + i * 17}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.035)"
                    strokeWidth="0.9"
                  />
                ))}
              </svg>

              {/* Diagonal light shine */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.09) 46%, rgba(255,255,255,0.02) 52%, transparent 60%)' }}
              />

              {/* Top gold hairline */}
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${GOLD_L} 30%, ${GOLD} 55%, ${GOLD_L} 80%, transparent)` }} />

              {/* Magnetic stripe */}
              <div className="absolute top-[3px] left-0 right-0 h-[24px]" style={{ background: 'repeating-linear-gradient(90deg, #171a20 0 15px, #23272f 15px 22px, #171a20 22px 37px, #20242c 37px 44px)' }} />
              <div className="absolute top-[27px] left-0 right-0 h-[1.5px] bg-black/50" />

              {/* ===== Header ===== */}
              <div className="absolute top-[32px] left-0 right-0 flex items-center justify-center gap-3 px-6">
                <div className="relative flex-shrink-0">
                  <img
                    src="/CVM.webp"
                    alt="CVM"
                    className="w-[34px] h-[34px] rounded-full object-contain bg-white ring-2 ring-[#c9a227] shadow-lg"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute -inset-[3px] rounded-full ring-1 ring-white/20 pointer-events-none" />
                </div>
                <div className="text-center min-w-0">
                  <h4 className="font-black text-[13px] leading-none tracking-[0.06em] uppercase text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                    ADIT College
                  </h4>
                  <p className="text-[6px] tracking-[0.36em] font-semibold uppercase mt-[3px] text-[#ecd07a]">Affiliated University • AICTE Approved</p>
                  <div className="mx-auto mt-[3px] h-[2px] w-20 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD} 30%, ${GOLD_L} 50%, ${GOLD} 70%, transparent)` }} />
                </div>
                <div className="relative flex-shrink-0">
                  <img
                    src="/adit.webp"
                    alt="ADIT"
                    className="w-[34px] h-[34px] rounded-full object-contain bg-white ring-2 ring-[#c9a227] shadow-lg"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div className="absolute -inset-[3px] rounded-full ring-1 ring-white/20 pointer-events-none" />
                </div>
              </div>

              {/* Gold divider */}
              <div className="absolute top-[72px] left-4 right-4 h-px" style={{ background: `linear-gradient(90deg, transparent, rgba(201,162,39,0.55) 20%, rgba(236,208,122,0.9) 50%, rgba(201,162,39,0.55) 80%, transparent)` }} />

              {/* Ghost photo (security) */}
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt=""
                  className="absolute right-5 top-[80px] w-[46px] h-[56px] rounded-[4px] object-cover opacity-[0.12] ring-1 ring-[#ecd07a]/50"
                />
              )}

              {/* ===== Barcode ===== */}
              <div className="absolute top-[80px] left-0 right-0 flex flex-col items-center gap-1">
                <div className="flex gap-[1px] h-[40px] items-end">
                  {Array.from({ length: 44 }).map((_, i) => {
                    const h = [42, 30, 38, 24, 34, 28, 44, 26, 36, 32, 40, 28, 34, 42, 24, 38, 30, 36, 32, 40, 26, 34, 44, 28, 30, 38, 24, 42, 32, 36, 34, 26, 40, 30, 44, 28, 36, 32, 38, 34, 26, 40, 30, 42][i];
                    const w = [2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2][i];
                    return <div key={i} className="bg-white rounded-[0.5px]" style={{ height: h, width: w }} />;
                  })}
                </div>
                <p className="text-[7px] text-white/80 font-mono tracking-[0.3em] font-bold">{rollDisplay}</p>
              </div>

              {/* ===== Contact ===== */}
              <div className="absolute top-[134px] left-5 right-5">
                <div className="grid grid-cols-2 gap-x-5 gap-y-[5px] text-[8px]">
                  <div className="flex gap-1.5 min-w-0">
                    <span className="font-black text-[#ecd07a] w-[42px] flex-shrink-0 uppercase text-[6.5px] tracking-wider pt-[1px]">Phone</span>
                    <span className="text-white/85 font-medium truncate">{phone}</span>
                  </div>
                  <div className="flex gap-1.5 min-w-0">
                    <span className="font-black text-[#ecd07a] w-[42px] flex-shrink-0 uppercase text-[6.5px] tracking-wider pt-[1px]">Email</span>
                    <span className="text-white/85 font-medium truncate">{email}</span>
                  </div>
                  <div className="flex gap-1.5 min-w-0 col-span-2">
                    <span className="font-black text-[#ecd07a] w-[42px] flex-shrink-0 uppercase text-[6.5px] tracking-wider pt-[1px]">Address</span>
                    <span className="text-white/85 font-medium truncate">{address}</span>
                  </div>
                </div>
              </div>

              <div className="absolute top-[156px] left-5 right-5 h-px" style={{ background: `linear-gradient(90deg, transparent, rgba(236,208,122,0.5) 50%, transparent)` }} />

              {/* ===== Signatures ===== */}
              <div className="absolute top-[160px] left-6 right-6 flex justify-between">
                <SigBlock label="Student's Signature" name={fullName} />
                <SigBlock label="Principal's Signature" />
              </div>

              {/* ===== Rules ===== */}
              <div className="absolute top-[184px] left-5 right-5">
                <p className="text-[5px] leading-[1.4] text-white/45 tracking-[0.02em]">
                  1. This card is the property of ADIT College and is strictly non-transferable.
                </p>
                <p className="text-[5px] leading-[1.4] text-white/45 tracking-[0.02em]">
                  2. Must be produced on demand by authorized staff inside the campus.
                </p>
                <p className="text-[5px] leading-[1.4] text-white/45 tracking-[0.02em]">
                  3. Misuse or tampering of this card will attract disciplinary action.
                </p>
              </div>

              {/* ===== Found note ===== */}
              <div className="absolute bottom-[6px] left-0 right-0 text-center">
                <p className="text-[6px] font-bold tracking-[0.16em] uppercase text-[#ecd07a]">
                  If found, please return to ADIT College Office
                </p>
                <p className="text-[5px] tracking-[0.12em] text-white/40 mt-[1px]">Academic Year {yearLabel} • {dept}</p>
              </div>

              {/* Bottom gold stripe */}
              <div className="absolute bottom-0 left-0 right-0 h-[4px]" style={{ background: `linear-gradient(90deg, ${GOLD}, ${GOLD_L}, ${GOLD})` }} />

              {/* Corner accents */}
              <div className="absolute top-[8px] left-[8px] w-3.5 h-3.5 border-t-2 border-l-2 border-[#ecd07a]/60 rounded-tl" />
              <div className="absolute top-[8px] right-[8px] w-3.5 h-3.5 border-t-2 border-r-2 border-[#ecd07a]/60 rounded-tr" />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleFlip}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
          {flipped ? 'Front' : 'Back'}
        </button>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #student-id-card, #student-id-card * { visibility: visible !important; }
          #student-id-card { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); }
          #student-id-card button { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[5.5px] font-black text-[#ecd07a] uppercase tracking-[0.14em]">{label}</p>
      <p className="text-[9px] text-white font-semibold truncate leading-tight">{value}</p>
    </div>
  );
}

function MiniField({ label, value }) {
  return (
    <div>
      <p className="text-[6px] text-white/50 tracking-wider uppercase">{label}</p>
      <p className="text-[9.5px] text-white font-bold">{value}</p>
    </div>
  );
}

function SigBlock({ label, name }) {
  return (
    <div className="text-center w-[110px]">
      <div className="border-b-2 border-[#c9a227]/80 mb-1 h-[18px] flex items-end justify-center" style={{ background: 'repeating-linear-gradient(90deg, rgba(236,208,122,0.14) 0 1px, transparent 1px 3px)' }}>
        {name && <span className="text-[6px] text-white/35 italic leading-none pb-[2px]">{name}</span>}
      </div>
      <p className="text-[5.5px] font-black text-[#ecd07a] tracking-[0.12em] uppercase">{label}</p>
    </div>
  );
}
