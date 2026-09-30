import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import { StudentIcon, FacultyIcon, FeeIcon, ActivityIcon, UsersIcon, NoticeIcon, CalendarIcon, ReportIcon, SettingsIcon } from '../../utils/icons';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle="College administration overview and management."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<StudentIcon size={22} />}
          label="Total Students"
          value="1,250"
          color="primary"
          trend={3.2}
          subtext="24 new this month"
        />
        <StatCard
          icon={<FacultyIcon size={22} />}
          label="Total Faculty"
          value="45"
          color="info"
          subtext="12 departments"
        />
        <StatCard
          icon={<FeeIcon size={22} />}
          label="Revenue (This Month)"
          value="₹12.5L"
          color="success"
          trend={8.1}
        />
        <StatCard
          icon={<ActivityIcon size={22} />}
          label="Avg Attendance"
          value="82%"
          color="warning"
          trend={-1.5}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Overview */}
        <div className="card animate-fade-in lg:col-span-1">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <UsersIcon size={18} className="text-accent-light" />
              Department Overview
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Computer Engineering', students: 320, faculty: 12 },
              { name: 'Information Technology', students: 280, faculty: 10 },
              { name: 'Civil Engineering', students: 250, faculty: 8 },
              { name: 'Mechanical Engineering', students: 220, faculty: 9 },
              { name: 'Electrical Engineering', students: 180, faculty: 6 },
            ].map((dept, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-surface-overlay rounded-xl border border-surface-border/50">
                <div>
                  <p className="font-medium text-sm text-muted-light">{dept.name}</p>
                  <p className="text-xs text-muted mt-0.5">{dept.faculty} Faculty</p>
                </div>
                <span className="text-sm font-semibold text-accent-light">{dept.students}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activities */}
          <div className="card animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <ActivityIcon size={18} className="text-accent-light" />
                Recent Activities
              </h3>
              <button className="text-xs text-accent-light hover:text-accent font-medium transition-colors">View all</button>
            </div>
            <div className="space-y-3">
              {[
                { action: 'New student admitted', time: '2 hours ago', icon: StudentIcon, color: 'text-success bg-success/10' },
                { action: 'Fee payment received', time: '3 hours ago', icon: FeeIcon, color: 'text-success bg-success/10' },
                { action: 'Exam results published', time: '1 day ago', icon: ActivityIcon, color: 'text-accent-light bg-accent/10' },
                { action: 'New notice posted', time: '2 days ago', icon: NoticeIcon, color: 'text-info bg-info/10' },
              ].map((activity, idx) => {
                const Icon = activity.icon;
                return (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-surface-overlay rounded-xl border border-surface-border/50">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.color} border border-current/20 flex-shrink-0`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-light">{activity.action}</p>
                      <p className="text-xs text-muted mt-0.5">{activity.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: 'Add Student', icon: StudentIcon, color: 'text-accent-light bg-accent/10' },
                { label: 'Add Faculty', icon: FacultyIcon, color: 'text-info bg-info/10' },
                { label: 'Create Notice', icon: NoticeIcon, color: 'text-warning bg-warning/10' },
                { label: 'Fee Report', icon: FeeIcon, color: 'text-success bg-success/10' },
                { label: 'Backup DB', icon: ReportIcon, color: 'text-muted bg-surface-hover' },
                { label: 'Settings', icon: SettingsIcon, color: 'text-muted bg-surface-hover' },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    className="group flex flex-col items-center gap-2 p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-accent/30 hover:bg-surface-hover transition-all duration-200"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color} border border-current/20`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-medium text-muted group-hover:text-muted-light transition-colors">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection Summary */}
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FeeIcon size={18} className="text-accent-light" />
              Fee Collection Summary
            </h3>
          </div>
          <div className="space-y-4">
            {[
              { type: 'Tuition Fee', collected: '₹45L', pending: '₹8L', percentage: 85 },
              { type: 'Lab Fee', collected: '₹5L', pending: '₹1L', percentage: 83 },
              { type: 'Exam Fee', collected: '₹2L', pending: '₹0.5L', percentage: 80 },
            ].map((fee, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm text-muted-light">{fee.type}</span>
                  <span className="text-sm text-muted">{fee.percentage}%</span>
                </div>
                <div className="relative w-full h-2 bg-surface-overlay rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-success to-success/60 transition-all duration-500"
                    style={{ width: `${fee.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>Collected: {fee.collected}</span>
                  <span>Pending: {fee.pending}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <CalendarIcon size={18} className="text-accent-light" />
              Upcoming Events
            </h3>
          </div>
          <div className="space-y-3">
            {[
              { event: 'Mid-Semester Exams', date: 'Sep 15-25, 2026', type: 'exam' },
              { event: 'ADITECH 2026', date: 'Oct 15-16, 2026', type: 'event' },
              { event: 'Parent-Teacher Meeting', date: 'Aug 20, 2026', type: 'meeting' },
              { event: 'Independence Day', date: 'Aug 15, 2026', type: 'holiday' },
            ].map((ev, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3.5 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors">
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">
                    {ev.type === 'exam' ? '📝' : ev.type === 'event' ? '🎉' : ev.type === 'meeting' ? '🤝' : '🎌'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-light">{ev.event}</p>
                  <p className="text-xs text-muted mt-0.5">{ev.date}</p>
                </div>
                <span className={`badge text-[10px] ${
                  ev.type === 'exam' ? 'badge-danger' :
                  ev.type === 'event' ? 'badge-success' :
                  ev.type === 'meeting' ? 'badge-warning' : 'badge-info'
                }`}>
                  {ev.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
