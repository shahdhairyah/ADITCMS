export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function getInitials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

export function getStatusColor(status) {
  const colors = {
    active: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
    inactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700',
    suspended: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    pending: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30',
    approved: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
    rejected: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    accepted: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
    completed: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    failed: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    present: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
    absent: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    late: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30',
    withdrawn: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700',
    forwarded: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    under_review: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30',
    reviewed: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
    graded: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
  };
  return colors[status] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700';
}

export function getRoleName(role) {
  const names = {
    admin: 'Administrator',
    hod: 'Head of Department',
    faculty: 'Faculty',
    student: 'Student',
    librarian: 'Librarian',
  };
  return names[role] || role;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function truncateText(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

import { useEffect, useRef, useState } from 'react';

export function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export function useCountUp(target, { duration = 1800, start = false, delay = 0 } = {}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start || !target) return;
    let raf;
    let startTime;
    const timeout = setTimeout(() => {
      startTime = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(target * eased));
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration, start, delay]);

  return value;
}

export function useTypewriter(words, { typeSpeed = 65, deleteSpeed = 30, pause = 1700 } = {}) {
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[wordIndex % words.length];
    let timer;
    if (!deleting && text === word) {
      timer = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && text === '') {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % words.length);
    } else {
      timer = setTimeout(
        () => setText(word.slice(0, text.length + (deleting ? -1 : 1))),
        deleting ? deleteSpeed : typeSpeed
      );
    }
    return () => clearTimeout(timer);
  }, [text, deleting, wordIndex, words, typeSpeed, deleteSpeed, pause]);

  return text;
}
