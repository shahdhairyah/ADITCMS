import { Link } from 'react-router-dom';
import { ArrowRight, ShieldIcon, CheckIcon } from '../../utils/icons';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex bg-base">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent-dim via-surface to-base">
        <div className="absolute inset-0 bg-noise opacity-50" />
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/3 -left-20 w-80 h-80 bg-info/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="relative p-12 flex flex-col justify-center z-10">
          <div className="max-w-lg">
            <div className="flex items-center gap-4 mb-10">
              <img
                src="/CVM.webp"
                alt="CVM University"
                className="w-14 h-14 rounded-2xl object-contain bg-white ring-2 ring-accent/40 shadow-glow animate-float"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="leading-tight">
                <p className="text-xl font-bold text-white">A.D. Institute of Technology</p>
                <p className="text-sm text-muted">Affiliated to CVM University, Anand</p>
              </div>
              <img
                src="/adit.webp"
                alt="ADIT"
                className="w-14 h-14 rounded-2xl object-contain bg-white ring-2 ring-accent/40 shadow-glow animate-float-slow"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              College Management<br />
              <span className="gradient-text text-gradient-animate">System</span>
            </h2>
            <p className="text-muted text-lg leading-relaxed">
              A centralized digital platform for managing all college operations
              including attendance, assignments, fees, examinations, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-30" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" />

        <div className="w-full max-w-md text-center relative z-10">
          {/* Mobile header with both logos */}
          <div className="flex items-center justify-center gap-3 mb-10 lg:hidden">
            <img
              src="/CVM.webp"
              alt="CVM University"
              className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-accent/30"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <img
              src="/adit.webp"
              alt="ADIT"
              className="w-9 h-9 rounded-xl object-contain bg-white ring-1 ring-accent/30"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span className="text-xl font-bold text-white">ADIT CMS</span>
          </div>

          {/* Gradient border card */}
          <div className="relative p-[1.5px] rounded-3xl overflow-hidden shadow-glow-lg text-left">
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#f59e0b,#6366f1)] opacity-40 animate-spin-slow" />
            <div className="relative rounded-3xl bg-surface-raised p-8 sm:p-10">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto mb-5">
                  <ShieldIcon size={32} className="text-warning" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Registration Closed</h2>
                <p className="text-muted text-sm leading-relaxed">
                  Self-registration is currently disabled. Accounts can only be created by the system administrator.
                </p>
              </div>

              <div className="bg-surface-overlay rounded-xl border border-surface-border p-5 mb-7">
                <h3 className="text-sm font-semibold text-muted-light mb-3">How to get access:</h3>
                <ol className="space-y-3">
                  {[
                    'Contact the college administration office',
                    'Request them to create your account',
                    'Receive your login credentials via email',
                  ].map((step, i) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-muted">
                      <span className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex items-center gap-2 mb-7">
                <CheckIcon size={15} className="text-success flex-shrink-0" />
                <p className="text-xs text-muted">
                  Accounts are verified and approved by the college administration for security.
                </p>
              </div>

              <Link
                to="/login"
                className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-sm
                  hover:bg-accent-hover active:scale-[0.98]
                  transition-all duration-200 shadow-sm hover:shadow-glow-sm animate-pulse-glow
                  flex items-center justify-center gap-2"
              >
                Go to Sign In
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <p className="text-center text-muted text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-light hover:text-accent font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
