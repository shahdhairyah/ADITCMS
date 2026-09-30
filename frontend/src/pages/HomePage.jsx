import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReveal, useTypewriter } from '../utils/helpers';
import {
  ArrowRight, AttendanceIcon, AssignmentIcon, FeeIcon, ExamIcon,
  TimetableIcon, LibraryIcon, NoticeIcon, StudentIcon, FacultyIcon,
  DepartmentIcon, ShieldIcon, MenuIcon, XIcon, MailIcon, HomeIcon,
  CheckIcon, ResultIcon, ChevronDown, ActivityIcon, BookOpen
} from '../utils/icons';

const features = [
  { icon: AttendanceIcon, title: 'Attendance Tracking', desc: 'Mark, manage, and monitor daily attendance with real-time reports and analytics.' },
  { icon: AssignmentIcon, title: 'Assignments & Submissions', desc: 'Create assignments, collect online submissions, and grade them in one place.' },
  { icon: FeeIcon, title: 'Fee Management', desc: 'Track fee structures, payments, dues, and generate fee reports instantly.' },
  { icon: ExamIcon, title: 'Exams & Results', desc: 'Manage unit tests, external marks, and publish results with full marksheets.' },
  { icon: TimetableIcon, title: 'Smart Timetables', desc: 'Department-wise timetables with conflict detection and classroom allocation.' },
  { icon: LibraryIcon, title: 'Library & Materials', desc: 'Digital library, study materials, syllabus, and lab manuals for every course.' },
  { icon: NoticeIcon, title: 'Notices & Announcements', desc: 'Broadcast college notices and announcements to the right people instantly.' },
  { icon: ResultIcon, title: 'Performance Analytics', desc: 'Semester trends, CGPA calculations, and academic insights for every student.' },
];

const roles = [
  { icon: DepartmentIcon, title: 'Principal', desc: 'Full control over the entire system — departments, faculty, fees, and timetables.' },
  { icon: FacultyIcon, title: 'HOD', desc: 'Manage your department — subjects, faculty workload, students, and reports.' },
  { icon: ShieldIcon, title: 'Faculty', desc: 'Mark attendance, grade assignments, publish results, and share materials.' },
  { icon: StudentIcon, title: 'Student', desc: 'View attendance, results, fees, timetable, notices, and download your ID card.' },
];

const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Roles', href: '#roles' },
  { label: 'About', href: '#about' },
];

const typedWords = ['Attendance.', 'Assignments.', 'Fees.', 'Exams.', 'Timetables.'];

function Reveal({ children, delay = 0, className = '' }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`reveal-up ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ kicker, title, subtitle }) {
  return (
    <Reveal className="text-center max-w-2xl mx-auto mb-14">
      <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-[11px] font-semibold uppercase tracking-widest mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        {kicker}
      </span>
      <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">{title}</h2>
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </Reveal>
  );
}

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const typed = useTypewriter(typedWords);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      setScrollY(el.scrollTop);
      setScrolled(el.scrollTop > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(scrollY / maxScroll, 1);

  const BrandBlock = ({ compact = false }) => (
    <div className={`flex items-center gap-3 ${compact ? '' : 'lg:scale-100'}`}>
      <img
        src="/adit.webp"
        alt="ADIT"
        className="w-11 h-11 rounded-xl object-contain bg-white ring-1 ring-accent/40 shadow-glow-sm"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
      <div className="leading-tight">
        <p className="text-base font-bold text-white tracking-tight">
          ADIT <span className="gradient-text text-gradient-animate">CMS</span>
        </p>
        <p className="text-[11px] text-muted">A.D. Institute of Technology</p>
        <p className="text-[11px] text-muted flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-accent animate-pulse" /> CVM University
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-base text-muted">
      {/* Scroll progress */}
      <div className="fixed top-0 inset-x-0 z-[60] h-0.5 bg-transparent pointer-events-none">
        <div
          className="h-full bg-gradient-accent transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* ===== NAVBAR ===== */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'glass border-b border-surface-border shadow-elevated' : 'bg-transparent'}`}>
        <nav className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-20'}`}>
          <Link to="/" className="hover:opacity-85 transition-opacity">
            <BrandBlock />
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map(l => (
              <a key={l.label} href={l.href} className="group relative text-sm text-muted hover:text-white transition-colors">
                {l.label}
                <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 bg-gradient-accent rounded-full transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/register" className="btn-ghost">Register</Link>
            <Link to="/login" className="btn-primary flex items-center gap-2">
              Login <ArrowRight size={15} />
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden text-muted hover:text-white p-2"
            aria-label="Toggle menu"
          >
            {menuOpen ? <XIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="lg:hidden border-t border-surface-border bg-base/95 backdrop-blur-xl animate-slide-down">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map(l => (
                <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-sm text-muted hover:bg-surface-hover hover:text-white transition-colors">
                  {l.label}
                </a>
              ))}
              <div className="pt-3 space-y-2">
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="block text-center btn-primary w-full">
                  Login
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)}
                  className="block text-center btn-secondary w-full">
                  Register
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ===== HERO ===== */}
      <section id="home" className="relative overflow-hidden min-h-[92vh] flex items-center pt-24 pb-16">
        <div className="absolute inset-0 bg-noise opacity-60" />
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] bg-accent/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/4 -right-40 w-[30rem] h-[30rem] bg-info/15 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-32 left-1/4 w-[26rem] h-[26rem] bg-accent/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl mx-auto text-center">
            <Reveal>
              <div className="flex items-center justify-center gap-5 mb-7">
                <img
                  src="/CVM.webp"
                  alt="CVM University"
                  className="w-16 h-16 rounded-2xl object-contain bg-white ring-2 ring-accent/30 shadow-glow animate-float"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="w-px h-14 bg-surface-border" />
                <img
                  src="/adit.webp"
                  alt="ADIT"
                  className="w-16 h-16 rounded-2xl object-contain bg-white ring-2 ring-accent/30 shadow-glow animate-float-slow"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </Reveal>

            <Reveal delay={100}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                ADIT Campus · Live Portal
              </span>
            </Reveal>

            <Reveal delay={180}>
              <h1 className="text-4xl sm:text-5xl lg:text-[4.2rem] font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
                One Platform for the
                <br />
                <span className="gradient-text text-gradient-animate">ADIT Campus</span>
              </h1>
            </Reveal>

            <Reveal delay={260}>
              <p className="text-xl text-muted-light font-medium mb-2 h-8">
                {typed}
                <span className="inline-block w-0.5 h-6 ml-1 bg-accent align-middle animate-blink" />
              </p>
              <p className="text-muted text-base sm:text-lg mb-10 leading-relaxed">
                A modern, secure, all-in-one college management platform built for
                A.D. Institute of Technology — affiliated to CVM University.
              </p>
            </Reveal>

            <Reveal delay={340}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                <Link to="/login" className="btn-primary w-full sm:w-auto px-8 py-3.5 text-base flex items-center justify-center gap-2 animate-pulse-glow">
                  Login to Dashboard <ArrowRight size={17} />
                </Link>
                <a href="#features" className="btn-secondary w-full sm:w-auto px-8 py-3.5 text-base flex items-center justify-center gap-2">
                  Explore Features
                </a>
              </div>
            </Reveal>
          </div>
        </div>

        <a href="#features" className="absolute bottom-5 left-1/2 -translate-x-1/2 text-muted hover:text-white transition-colors animate-bounce hidden md:block">
          <ChevronDown size={22} />
        </a>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-24 border-t border-surface-border bg-base-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Features"
            title="Everything ADIT needs"
            subtitle="Powerful modules designed for students, faculty, HODs, and administrators."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 4) * 90}>
                <div className="card-hover group h-full">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 text-accent-light flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                    <f.icon size={20} />
                  </div>
                  <h3 className="font-semibold text-muted-light mb-2 group-hover:text-white transition-colors">{f.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ROLES ===== */}
      <section id="roles" className="py-24 border-t border-surface-border bg-base-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Who is it for?"
            title="Built for every role"
            subtitle="Role-based dashboards keep everything relevant, secure, and easy to use."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {roles.map((r, i) => (
              <Reveal key={r.title} delay={i * 100}>
                <Link to="/login" className="card-hover block group h-full">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 text-accent-light flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:rotate-6 transition-all duration-300">
                    <r.icon size={20} />
                  </div>
                  <h3 className="font-semibold text-muted-light mb-2 group-hover:text-white transition-colors">{r.title}</h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">{r.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-light group-hover:gap-2.5 transition-all">
                    Sign in <ArrowRight size={13} />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section id="about" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-50" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-info/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left - Visual collage */}
            <Reveal>
              <div className="relative max-w-lg mx-auto">
                <div className="absolute -inset-8 bg-gradient-accent/10 rounded-[3rem] blur-2xl animate-pulse-slow" />
                <div className="relative rounded-[2rem] border border-surface-border bg-surface-raised/60 backdrop-blur-sm p-8 shadow-elevated">
                  <div className="flex items-center justify-center gap-6 mb-8">
                    <img
                      src="/CVM.webp"
                      alt="CVM University"
                      className="w-24 h-24 rounded-2xl object-contain bg-white ring-2 ring-accent/30 shadow-glow animate-float"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="w-px h-20 bg-surface-border" />
                    <img
                      src="/adit.webp"
                      alt="ADIT"
                      className="w-24 h-24 rounded-2xl object-contain bg-white ring-2 ring-accent/30 shadow-glow animate-float-slow"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">ADIT</p>
                    <p className="text-sm text-muted">A.D. Institute of Technology</p>
                    <p className="text-xs text-muted mt-1">Affiliated to CVM University, Anand</p>
                  </div>
                </div>

                <div className="absolute -top-6 -left-6 bg-surface-raised border border-accent/30 rounded-2xl px-4 py-3 shadow-glow animate-float hidden sm:block">
                  <p className="text-xs text-muted">Established</p>
                  <p className="text-lg font-bold text-white">2000</p>
                </div>
              </div>
            </Reveal>

            {/* Right - Story */}
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-[11px] font-semibold uppercase tracking-widest mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  About ADIT
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 tracking-tight">
                  A.D. Institute of <span className="gradient-text text-gradient-animate">Technology</span>
                </h2>
                <p className="text-muted leading-relaxed mb-4">
                  ADIT is a premier technical institute affiliated with CVM University, Anand,
                  committed to shaping the next generation of engineers and technologists.
                </p>
                <p className="text-muted leading-relaxed mb-8">
                  Our portal brings the entire ADIT campus online — from classrooms to
                  examinations — so students, faculty, and administration can focus on
                  what matters most: learning and growth.
                </p>
              </Reveal>

              <Reveal delay={120}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: BookOpen, title: 'Quality Education', desc: 'Industry-aligned curriculum' },
                    { icon: ShieldIcon, title: 'Secure Portal', desc: 'Role-based access for all' },
                    { icon: ActivityIcon, title: 'Smart Campus', desc: 'Everything digital, in one place' },
                  ].map(p => (
                    <div key={p.title} className="card-hover p-4 group">
                      <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 text-accent-light flex items-center justify-center mb-3 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                        <p.icon size={17} />
                      </div>
                      <p className="text-sm font-semibold text-muted-light group-hover:text-white transition-colors">{p.title}</p>
                      <p className="text-xs text-muted mt-1">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </Reveal>

              <Reveal delay={200}>
                <ul className="space-y-3 mb-8">
                  {[
                    'Role-based secure access for students, faculty, HODs, and admins',
                    'Real-time attendance, results, and fee tracking',
                    'Digital ID cards, marksheets, and CGPA calculator',
                    'Works on desktop, tablet, and mobile',
                  ].map(item => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted">
                      <span className="w-5 h-5 rounded-full bg-success/10 border border-success/20 flex items-center justify-center flex-shrink-0">
                        <CheckIcon size={12} className="text-success" />
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={280}>
                <div className="flex flex-wrap gap-3">
                  <Link to="/login" className="btn-primary flex items-center gap-2">
                    Join ADIT <ArrowRight size={15} />
                  </Link>
                  <Link to="/register" className="btn-secondary">Contact Admin</Link>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-surface-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <BrandBlock />
            <div className="flex items-center gap-6 text-xs text-muted">
              <Link to="/login" className="hover:text-white transition-colors flex items-center gap-1.5">
                <HomeIcon size={13} /> Home
              </Link>
              <Link to="/login" className="hover:text-white transition-colors flex items-center gap-1.5">
                <MailIcon size={13} /> Contact
              </Link>
            </div>
            <p className="text-xs text-muted-dark">© {new Date().getFullYear()} ADIT. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ===== BACK TO TOP ===== */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-xl bg-accent text-white shadow-glow flex items-center justify-center hover:bg-accent-hover transition-all duration-300 ${scrollY > 600 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        aria-label="Back to top"
      >
        <ChevronDown size={20} className="rotate-180" />
      </button>
    </div>
  );
}
