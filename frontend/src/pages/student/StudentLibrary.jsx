import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { LibraryIcon, SearchIcon, BookOpen, CalendarIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { libraryAPI } from '../../services/api';

export default function StudentLibrary() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [issuedBooks, setIssuedBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError('');
      const [booksRes, historyRes] = await Promise.allSettled([
        libraryAPI.getBooks().catch(() => ({ success: true, data: [] })),
        libraryAPI.getHistory(user?.profile?.id).catch(() => ({ success: true, data: [] })),
      ]);
      const br = booksRes.status === 'fulfilled' ? booksRes.value : null;
      const hr = historyRes.status === 'fulfilled' ? historyRes.value : null;
      if (br && br.success !== false) setBooks(br.data || br || []);
      if (hr && hr.success !== false) {
        const histData = hr.data || hr || [];
        setIssuedBooks(Array.isArray(histData) ? histData : []);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load library data');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter((book) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (book.title || '').toLowerCase().includes(q) ||
      (book.author || '').toLowerCase().includes(q) ||
      (book.isbn || '').toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner size="lg" text="Loading library..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Library" subtitle="Browse books and manage your issued books" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Search Books</h3>
          <div className="relative max-w-xs w-full">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dark" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, ISBN..."
              className="w-full bg-surface-overlay border border-surface-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <EmptyState title="No Books Found" description={search ? 'Try a different search term.' : 'No books available in the library.'} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => {
              const available = book.available_copies > 0;
              return (
                <div key={book.id} className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={18} className="text-accent-light" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-muted-light truncate">{book.title}</p>
                      <p className="text-xs text-muted mt-0.5">by {book.author || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    {book.isbn && <span className="text-muted-dark">ISBN: {book.isbn}</span>}
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      available ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}>
                      {available ? `${book.available_copies} Available` : 'Unavailable'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">My Issued Books</h3>
        {issuedBooks.length === 0 ? (
          <EmptyState title="No Books Issued" description="You have not issued any books." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Book</th>
                  <th className="text-left py-3 pr-4">Issue Date</th>
                  <th className="text-left py-3 pr-4">Due Date</th>
                  <th className="text-center py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {issuedBooks.map((issue, idx) => (
                  <tr key={issue.id || idx} className="border-b border-surface-border/50 last:border-0">
                    <td className="py-3.5 pr-4">
                      <p className="text-muted-light">{issue.book_title || issue.title}</p>
                      <p className="text-xs text-muted">{issue.book_author || issue.author}</p>
                    </td>
                    <td className="py-3.5 pr-4 text-muted">{formatDate(issue.issue_date || issue.issued_at)}</td>
                    <td className="py-3.5 pr-4 text-muted">{formatDate(issue.due_date)}</td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                        {(issue.status || 'issued').charAt(0).toUpperCase() + (issue.status || 'issued').slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
