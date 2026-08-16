import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase, dbAvailable } from '../lib/supabase';
import { getArabicScore } from '../lib/utils';
import { uploadStudentPhoto, deleteStudentPhoto } from '../lib/storage';
import { DEFAULT_SCHOOL_NAME, normalizeSchoolName } from '../lib/constants';
import { getAll, put, putMany, deleteRecord } from '../lib/offline-db';
import { enqueue, removeByTableAndRecord } from '../lib/sync-engine';
import { t } from '../lib/i18n';

const SchoolContext = createContext(null);

const STUDENT_COLUMNS = 'id, name, class, grade, status, email, parent, phone, user_id, parent_user_id, created_at, national_id, birth_date, school_id, updated_at';
const GRADE_COLUMNS = 'id, student_id, subject, score, grade, created_at, school_id, updated_at';
const PAYMENT_COLUMNS = 'id, student_id, amount, due_date, status, created_at, method, receipt_number, notes, school_id, updated_at';

const normalizeGrade = (g) => ({ ...g, studentId: g.student_id });
const normalizePayment = (p) => ({ ...p, studentId: p.student_id, dueDate: p.due_date });

const EMPTY_DATA = {
  students: [], grades: [], payments: [],
  settings: { supervisors: [], accountants: [] },
  teacherAssignments: {}, studentLinks: {}, parentLinks: {},
  schoolInfo: { schoolName: DEFAULT_SCHOOL_NAME, schoolAddress: '', schoolPhone: '', adminName: '', adminEmail: '', schoolEmail: '', schoolLogoUrl: '', academicYear: '', academicTerm: '', smsOn: true, emailOn: false },
  schoolId: null,
};

async function fetchSchoolData(user) {
  if (!user || !supabase) return null;

  const role = user.role;
  const email = user.email;

  let studentsQuery = supabase.from('students').select(STUDENT_COLUMNS).is('deleted_at', null).order('name');
  let gradesQuery = supabase.from('grades').select(GRADE_COLUMNS);
  let paymentsQuery = supabase.from('payments').select(PAYMENT_COLUMNS);

  if (role === 'student' || role === 'parent') {
    try {
      const { data: links } = await supabase.from('user_student_links').select('student_id, relationship').eq('user_email', email);
      const studentIds = (links || []).map(l => l.student_id);
      if (studentIds.length) {
        studentsQuery = studentsQuery.in('id', studentIds);
        gradesQuery = gradesQuery.in('student_id', studentIds);
        paymentsQuery = paymentsQuery.in('student_id', studentIds);
      } else {
        studentsQuery = studentsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        gradesQuery = gradesQuery.eq('student_id', '00000000-0000-0000-0000-000000000000');
        paymentsQuery = paymentsQuery.eq('student_id', '00000000-0000-0000-0000-000000000000');
      }
    } catch {
      studentsQuery = studentsQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      gradesQuery = gradesQuery.eq('student_id', '00000000-0000-0000-0000-000000000000');
      paymentsQuery = paymentsQuery.eq('student_id', '00000000-0000-0000-0000-000000000000');
    }
  }

  studentsQuery = studentsQuery.range(0, 999);

  const [sRes, gRes, pRes, setRes, taRes, uslRes] = await Promise.all([
    studentsQuery, gradesQuery, paymentsQuery,
    supabase.from('school_settings').select('*').single(),
    role === 'student' || role === 'parent'
      ? { data: null, error: null }
      : role === 'teacher'
        ? supabase.from('teacher_assignments').select('*').eq('teacher_email', email)
        : supabase.from('teacher_assignments').select('*'),
    role === 'student' || role === 'parent'
      ? supabase.from('user_student_links').select('student_id, relationship').eq('user_email', email)
      : { data: null, error: null },
  ]);

  const settings = setRes.data || {};
  const links = {}; const parentLinks = {};
  (uslRes.data || []).forEach(l => {
    if (l.relationship === 'self') links[l.user_email] = l.student_id;
    if (l.relationship === 'parent') {
      if (!parentLinks[l.user_email]) parentLinks[l.user_email] = [];
      parentLinks[l.user_email].push(l.student_id);
    }
  });
  const assignments = {};
  (taRes.data || []).forEach(a => {
    if (!assignments[a.teacher_email]) assignments[a.teacher_email] = { classes: [] };
    assignments[a.teacher_email].classes.push(a.class);
  });

  const studentsData = sRes.data || [];
  const paymentsData = (pRes.data || []).map(normalizePayment);
  const studentMap = Object.fromEntries(studentsData.map(s => [s.id, s.name]));
  paymentsData.forEach(p => { if (!p.student) p.student = studentMap[p.studentId] || ''; });

  return {
    students: studentsData,
    grades: (gRes.data || []).map(normalizeGrade),
    payments: paymentsData,
    settings: { supervisors: settings.supervisors || [], accountants: settings.accountants || [] },
    schoolInfo: { schoolName: normalizeSchoolName(settings.school_name) || DEFAULT_SCHOOL_NAME, schoolAddress: settings.school_address || '', schoolPhone: settings.school_phone || '', adminName: settings.admin_name || '', adminEmail: settings.admin_email || '', schoolEmail: settings.school_email || '', schoolLogoUrl: settings.school_logo_url || '', academicYear: settings.academic_year || '', academicTerm: settings.academic_term || '', smsOn: settings.sms_on !== false, emailOn: settings.email_on === true },
    teacherAssignments: assignments,
    studentLinks: links,
    parentLinks,
    hasMore: (sRes.data || []).length >= 1000,
    schoolId: settings.school_id || null,
  };
}

export function SchoolProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [schoolId, setSchoolId] = useState(null);
  const pendingIdsRef = useRef(new Set());
  const dataRef = useRef(data);
  dataRef.current = data;

  // --- Offline-first: load from IndexedDB, then fetch fresh from Supabase ---
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const controller = new AbortController();

    async function load() {
      // 1. Read from IndexedDB (instant)
      if (dbAvailable) {
        try {
          const [cachedStudents, cachedGrades, cachedPayments] = await Promise.all([
            getAll('students'),
            getAll('grades'),
            getAll('payments'),
          ]);
          if (cachedStudents.length || cachedGrades.length || cachedPayments.length) {
            const studentMap = Object.fromEntries(cachedStudents.map(s => [s.id, s.name]));
            setData(d => ({
              ...d,
              students: cachedStudents,
              grades: cachedGrades.map(normalizeGrade),
              payments: cachedPayments.map(p => ({ ...normalizePayment(p), student: p.student || studentMap[p.studentId] || '' })),
            }));
          }
        } catch { /* silent */ }
      }

      // 2. Fetch fresh data from Supabase
      try {
        const d = await fetchSchoolData(user);
        if (controller.signal.aborted || !d) return;

        setData(d);
        setHasMore(d.hasMore);
        setSchoolId(d.schoolId);

        // 3. Write fresh data to IndexedDB
        if (dbAvailable) {
          try {
            await Promise.all([
              putMany('students', d.students),
              putMany('grades', d.grades),
              putMany('payments', d.payments),
            ]);
          } catch { /* silent */ }
        }
      } catch { /* silent */ }

      setLoading(false);
    }

    load();
    return () => controller.abort();
  }, [user]);

  // --- Debounced IndexedDB cache save on every data change ---
  const saveRef = useRef(null);
  useEffect(() => {
    if (!user?.id || !dbAvailable) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      Promise.all([
        putMany('students', data.students),
        putMany('grades', data.grades),
        putMany('payments', data.payments),
      ]).catch(() => {});
    }, 1000);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [data, user?.id]);

  // --- Realtime: skip events for entities with pending mutations ---
  const getStudentIdForUser = useCallback((authEmail) => {
    const link = data.studentLinks?.[authEmail];
    if (link) return link;
    const parentLink = data.parentLinks?.[authEmail];
    if (Array.isArray(parentLink)) return parentLink[0] || null;
    return parentLink || null;
  }, [data.studentLinks, data.parentLinks]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel('school-changes');
    const isScoped = user?.role === 'student' || user?.role === 'parent';
    const studentIdForRealtime = getStudentIdForUser(user?.email);

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students', ...(!isScoped ? {} : { filter: `id=eq.${studentIdForRealtime || '00000000-0000-0000-0000-000000000000'}` }) }, payload => {
        if (pendingIdsRef.current.has(payload.new?.id || payload.old?.id)) return;
        if (payload.eventType === 'INSERT') setData(d => ({ ...d, students: [...d.students, payload.new] }));
        else if (payload.eventType === 'UPDATE') setData(d => ({ ...d, students: d.students.map(s => s.id === payload.new.id ? payload.new : s) }));
        else setData(d => ({ ...d, students: d.students.filter(s => s.id !== payload.old.id) }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grades', ...(isScoped ? { filter: `student_id=eq.${studentIdForRealtime || '00000000-0000-0000-0000-000000000000'}` } : {}) }, payload => {
        if (pendingIdsRef.current.has(payload.new?.id || payload.old?.id)) return;
        if (payload.eventType === 'INSERT') setData(d => ({ ...d, grades: [...d.grades, normalizeGrade(payload.new)] }));
        else if (payload.eventType === 'UPDATE') setData(d => ({ ...d, grades: d.grades.map(g => g.id === payload.new.id ? normalizeGrade(payload.new) : g) }));
        else setData(d => ({ ...d, grades: d.grades.filter(g => g.id !== payload.old.id) }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', ...(isScoped ? { filter: `student_id=eq.${studentIdForRealtime || '00000000-0000-0000-0000-000000000000'}` } : {}) }, payload => {
        if (pendingIdsRef.current.has(payload.new?.id || payload.old?.id)) return;
        const normalized = normalizePayment(payload.new);
        if (payload.eventType === 'INSERT') {
          setData(d => ({ ...d, payments: [...d.payments, { ...normalized, student: d.students.find(s => s.id === normalized.studentId)?.name || '' }] }));
        } else if (payload.eventType === 'UPDATE') {
          setData(d => ({ ...d, payments: d.payments.map(p => p.id === normalized.id ? { ...p, ...normalized, student: normalized.student || d.students.find(s => s.id === normalized.studentId)?.name || '' } : p) }));
        } else {
          setData(d => ({ ...d, payments: d.payments.filter(p => p.id !== payload.old.id) }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, user?.role, user?.email, getStudentIdForUser]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !supabase) return;
    const nextPage = page + 1;
    const from = nextPage * 1000;
    const to = from + 999;
    const { data: moreStudents } = await supabase.from('students').select(STUDENT_COLUMNS).is('deleted_at', null).order('name').range(from, to);
    if (moreStudents?.length) {
      setData(d => ({ ...d, students: [...d.students, ...moreStudents] }));
      setPage(nextPage);
      setHasMore(moreStudents.length >= 1000);
      if (dbAvailable) putMany('students', moreStudents).catch(() => {});
    } else {
      setHasMore(false);
    }
  }, [hasMore, page]);

  const email = user?.email || '';
  const assignment = data.teacherAssignments?.[email];
  const isSupervisor = data.settings?.supervisors?.includes(email);
  const isAccountant = data.settings?.accountants?.includes(email);

  const getEditableStudentIds = useCallback(() => {
    if (!assignment) return [];
    if (assignment.allClasses) return data.students.map(s => s.id);
    return data.students.filter(s => (assignment.classes || []).includes(s.class)).map(s => s.id);
  }, [assignment, data.students]);

  const getAssignedClasses = useCallback(() => {
    if (!assignment) return [];
    if (assignment.allClasses) return [...new Set(data.students.map(s => s.class))];
    return assignment.classes || [];
  }, [assignment, data.students]);

  const canEditStudent = useCallback((studentId) => {
    if (user?.role === 'admin') return true;
    if (!assignment) return false;
    const student = data.students.find(s => s.id === studentId);
    if (!student) return false;
    if (assignment.allClasses) return true;
    return (assignment.classes || []).includes(student.class);
  }, [assignment, data.students, user]);

  const canEditGrade = useCallback((studentId, subject) => {
    if (user?.role === 'admin') return true;
    if (!assignment) return false;
    const student = data.students.find(s => s.id === studentId);
    if (!student) return false;
    const classes = assignment.classes || [];
    const subjects = assignment.subjects || [];
    const inClass = classes.includes(student.class);
    const inSubject = subjects.includes(subject);
    if (assignment.allClasses && inSubject) return true;
    if (inClass && (subjects.length === 0 || inSubject)) return true;
    return false;
  }, [assignment, data.students, user]);

  // --- Helper: add ID to pending set, remove after sync ---
  const trackPending = useCallback((id) => {
    pendingIdsRef.current.add(id);
    return () => pendingIdsRef.current.delete(id);
  }, []);

  const sendNotification = useCallback(async (message, targetRoles = ['admin']) => {
    if (!message?.trim()) return;

    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();

    const optimistic = {
      id: clientId, message: message.trim(),
      school_id: schoolId || null, target_roles: targetRoles,
      created_at: now,
    };

    await enqueue({
      table: 'notifications',
      operation: 'insert',
      data: optimistic,
      recordId: clientId,
      baseVersion: now,
    });

    if (navigator.onLine && supabase) {
      const { error } = await supabase.from('notifications').insert({
        message: message.trim(),
        school_id: schoolId || null,
        target_roles: targetRoles,
      });
      if (error) throw error;
    }
  }, [schoolId]);

  // --- Mutations: offline-first with optimistic writes + outbox ---

  const addStudent = useCallback(async (s) => {
    if (user?.role !== 'admin' && !isSupervisor) return;

    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();

    const optimistic = {
      id: clientId,
      name: s.name, class: s.class, grade: s.grade,
      email: s.email || null, status: s.status || 'Active',
      parent: s.parent || null, phone: s.phone || null, photo: null,
      national_id: s.nationalId || null, birth_date: s.birthDate || null,
      school_id: user?.schoolId || schoolId,
      created_at: now, updated_at: now,
    };

    // Optimistic: write to IndexedDB + UI
    if (dbAvailable) put('students', optimistic).catch(() => {});
    setData(d => ({ ...d, students: [...d.students, optimistic] }));
    const untrack = trackPending(clientId);

    // Enqueue to outbox
    await enqueue({
      table: 'students',
      operation: 'insert',
      data: optimistic,
      recordId: clientId,
      baseVersion: now,
    });

    // Try Supabase immediately if online
    if (navigator.onLine && supabase) {
      try {
        const { data: created, error } = await supabase
          .from('students')
          .insert(optimistic)
          .select()
          .single();
        if (error) throw error;
        if (created) {
          if (dbAvailable) put('students', created).catch(() => {});
          setData(d => ({ ...d, students: d.students.map(st => st.id === clientId ? created : st) }));
          await removeByTableAndRecord('students', clientId);
          try { await sendNotification(t('notifications.studentAdded').replace('{name}', s.name), ['admin', 'supervisor']); } catch { /* silent */ }
        }
      } catch { /* silent */ }
    }

    untrack();

    // Handle photo upload (fire-and-forget, always needs network)
    if (s.photo instanceof File && navigator.onLine) {
      supabase.from('students').select('id').eq('id', clientId).single().then(({ data: fresh }) => {
        if (fresh) {
          uploadStudentPhoto(s.photo, clientId, user?.schoolId || schoolId)
            .then(url => supabase.from('students').update({ photo: url }).eq('id', clientId))
            .then(() => {
              const url = URL.createObjectURL(s.photo);
              setData(d => ({ ...d, students: d.students.map(st => st.id === clientId ? { ...st, photo: url } : st) }));
              if (dbAvailable) put('students', { ...optimistic, photo: url }).catch(() => {});
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }
  }, [user?.role, user?.schoolId, isSupervisor, schoolId, trackPending, sendNotification]);

  const updateStudent = useCallback(async (id, updates) => {
    if (!canEditStudent(id)) return;

    const dbUpdates = { ...updates };
    if ('nationalId' in dbUpdates) { dbUpdates.national_id = dbUpdates.nationalId; delete dbUpdates.nationalId; }
    if ('birthDate' in dbUpdates) { dbUpdates.birth_date = dbUpdates.birthDate; delete dbUpdates.birthDate; }

    // Handle photo separately (needs network)
    let photoUrl = undefined;
    if (dbUpdates.photo instanceof File) {
      if (navigator.onLine) {
        try {
          photoUrl = await uploadStudentPhoto(dbUpdates.photo, id, user?.schoolId);
          dbUpdates.photo = photoUrl;
        } catch { delete dbUpdates.photo; }
      } else {
        delete dbUpdates.photo;
      }
    } else if (dbUpdates.photo === null && navigator.onLine) {
      deleteStudentPhoto(user?.schoolId, id).catch(() => {});
    }

    const now = new Date().toISOString();
    dbUpdates.updated_at = now;

    // Optimistic: write to IndexedDB + UI
    if (dbAvailable) {
      const existing = dataRef.current.students.find(s => s.id === id);
      if (existing) put('students', { ...existing, ...dbUpdates }).catch(() => {});
    }
    setData(d => ({ ...d, students: d.students.map(s => s.id === id ? { ...s, ...dbUpdates } : s) }));
    const untrack = trackPending(id);

    // Enqueue to outbox
    await enqueue({
      table: 'students',
      operation: 'update',
      data: dbUpdates,
      recordId: id,
      baseVersion: now,
    });

    // Try Supabase immediately if online
    if (navigator.onLine && supabase) {
      try {
        const { error } = await supabase.from('students').update(dbUpdates).eq('id', id);
        if (error) throw error;
        await removeByTableAndRecord('students', id);
        const studentName = dataRef.current.students.find(s => s.id === id)?.name || id;
        try { await sendNotification(t('notifications.studentUpdated').replace('{name}', studentName), ['admin', 'supervisor']); } catch { /* silent */ }
      } catch { /* silent */ }
    }

    untrack();
  }, [canEditStudent, user?.schoolId, trackPending, sendNotification]);

  const deleteStudent = useCallback(async (id) => {
    if (user?.role !== 'admin' && !isSupervisor) return;

    // Optimistic: remove from IndexedDB + UI
    if (dbAvailable) {
      deleteRecord('students', id).catch(() => {});
      deleteRecord('grades', id).catch(() => {});
      deleteRecord('payments', id).catch(() => {});
    }
    setData(d => ({
      ...d,
      students: d.students.filter(s => s.id !== id),
      grades: d.grades.filter(g => g.studentId !== id),
      payments: d.payments.filter(p => p.studentId !== id),
    }));
    const untrack = trackPending(id);

    // Enqueue cascade delete as single entry
    await enqueue({
      table: 'students',
      operation: 'delete_cascade',
      data: null,
      recordId: id,
      baseVersion: new Date().toISOString(),
    });

    // Try Supabase immediately if online
    if (navigator.onLine && supabase) {
      try {
        deleteStudentPhoto(user?.schoolId, id).catch(() => {});
        const { error } = await supabase.rpc('admin_delete_student', { p_student_id: id });
        if (error) {
          await supabase.from('grades').delete().eq('student_id', id);
          await supabase.from('payments').delete().eq('student_id', id);
          await supabase.from('students').delete().eq('id', id);
        }
        await removeByTableAndRecord('students', id);
        const deletedName = dataRef.current.students.find(s => s.id === id)?.name || id;
        try { await sendNotification(t('notifications.studentDeleted').replace('{name}', deletedName), ['admin', 'supervisor']); } catch { /* silent */ }
      } catch { /* silent */ }
    }

    untrack();
  }, [user?.role, user?.schoolId, isSupervisor, trackPending, sendNotification]);

  const addGrade = useCallback(async (g) => {
    if (!canEditGrade(g.studentId, g.subject)) return;

    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();
    const arabicScore = getArabicScore(g.score);

    const optimistic = {
      id: clientId, student_id: g.studentId, subject: g.subject,
      score: g.score, grade: arabicScore,
      created_at: now, updated_at: now, school_id: schoolId,
    };

    if (dbAvailable) put('grades', optimistic).catch(() => {});
    setData(d => ({ ...d, grades: [...d.grades, normalizeGrade(optimistic)] }));
    const untrack = trackPending(clientId);

    await enqueue({
      table: 'grades',
      operation: 'insert',
      data: optimistic,
      recordId: clientId,
      baseVersion: now,
    });

    if (navigator.onLine && supabase) {
      try {
        const { data: created, error } = await supabase
          .from('grades')
          .insert(optimistic)
          .select()
          .single();
        if (error) throw error;
        if (created) {
          if (dbAvailable) put('grades', created).catch(() => {});
          setData(d => ({ ...d, grades: d.grades.map(gr => gr.id === clientId ? normalizeGrade(created) : gr) }));
          await removeByTableAndRecord('grades', clientId);
          const gradeStudent = dataRef.current.students.find(s => s.id === g.studentId)?.name || g.studentId;
          try { await sendNotification(t('notifications.gradeAdded').replace('{name}', gradeStudent), ['admin', 'supervisor']); } catch { /* silent */ }
        }
      } catch { /* silent */ }
    }

    untrack();
  }, [canEditGrade, schoolId, trackPending, sendNotification]);

  const updateGrade = useCallback(async (id, updates) => {
    if (user?.role !== 'admin' && !isSupervisor) return;

    const now = new Date().toISOString();
    const gradeUpdate = { ...updates, updated_at: now };
    if (updates.score) gradeUpdate.grade = getArabicScore(updates.score);

    if (dbAvailable) {
      const existing = dataRef.current.grades.find(g => g.id === id);
      if (existing) put('grades', { ...existing, ...gradeUpdate }).catch(() => {});
    }
    setData(d => ({ ...d, grades: d.grades.map(g => g.id === id ? { ...g, ...gradeUpdate } : g) }));
    const untrack = trackPending(id);

    await enqueue({
      table: 'grades',
      operation: 'update',
      data: gradeUpdate,
      recordId: id,
      baseVersion: now,
    });

    if (navigator.onLine && supabase) {
      try {
        const { error } = await supabase.from('grades').update(gradeUpdate).eq('id', id);
        if (error) throw error;
        await removeByTableAndRecord('grades', id);
        try { await sendNotification(t('notifications.gradeUpdated').replace('{name}', updates.subject || ''), ['admin', 'supervisor']); } catch { /* silent */ }
      } catch { /* silent */ }
    }

    untrack();
  }, [user?.role, isSupervisor, trackPending, sendNotification]);

  const deleteGrade = useCallback(async (id) => {
    if (user?.role !== 'admin' && !isSupervisor) return;

    if (dbAvailable) deleteRecord('grades', id).catch(() => {});
    setData(d => ({ ...d, grades: d.grades.filter(g => g.id !== id) }));
    const untrack = trackPending(id);

    await enqueue({
      table: 'grades',
      operation: 'delete',
      data: null,
      recordId: id,
      baseVersion: new Date().toISOString(),
    });

    if (navigator.onLine && supabase) {
      try {
        const { error } = await supabase.from('grades').delete().eq('id', id);
        if (error) throw error;
        await removeByTableAndRecord('grades', id);
        try { await sendNotification(t('notifications.gradeDeleted'), ['admin', 'supervisor']); } catch { /* silent */ }
      } catch { /* silent */ }
    }

    untrack();
  }, [user?.role, isSupervisor, trackPending, sendNotification]);

  const addPayment = useCallback(async (p) => {
    if (user?.role !== 'admin' && !isAccountant) return;

    const clientId = crypto.randomUUID();
    const now = new Date().toISOString();

    const optimistic = {
      id: clientId, student_id: p.studentId || null,
      amount: p.amount, due_date: p.dueDate,
      status: 'Pending', created_at: now, updated_at: now,
      school_id: schoolId,
    };

    if (dbAvailable) put('payments', optimistic).catch(() => {});
    setData(d => ({
      ...d,
      payments: [...d.payments, {
        ...normalizePayment(optimistic),
        student: p.student || d.students.find(s => s.id === p.studentId)?.name || '',
      }],
    }));
    const untrack = trackPending(clientId);

    await enqueue({
      table: 'payments',
      operation: 'insert',
      data: optimistic,
      recordId: clientId,
      baseVersion: now,
    });

    if (navigator.onLine && supabase) {
      try {
        const { data: created, error } = await supabase
          .from('payments')
          .insert(optimistic)
          .select()
          .single();
        if (error) throw error;
        if (created) {
          if (dbAvailable) put('payments', created).catch(() => {});
          setData(d => ({
            ...d,
            payments: d.payments.map(pay => pay.id === clientId
              ? { ...normalizePayment(created), student: pay.student || d.students.find(s => s.id === created.student_id)?.name || '' }
              : pay),
          }));
          await removeByTableAndRecord('payments', clientId);
          const payStudent = dataRef.current.students.find(s => s.id === p.studentId)?.name || p.studentId;
          try { await sendNotification(t('notifications.paymentAdded').replace('{name}', payStudent), ['admin', 'accountant']); } catch { /* silent */ }
        }
      } catch { /* silent */ }
    }

    untrack();
  }, [user?.role, isAccountant, schoolId, trackPending, sendNotification]);

  const updatePaymentStatus = useCallback(async (id, status) => {
    if (user?.role !== 'admin' && !isAccountant) return;

    const now = new Date().toISOString();

    if (dbAvailable) {
      const existing = dataRef.current.payments.find(p => p.id === id);
      if (existing) put('payments', { ...existing, status, updated_at: now }).catch(() => {});
    }
    setData(d => ({ ...d, payments: d.payments.map(p => p.id === id ? { ...p, status } : p) }));
    const untrack = trackPending(id);

    await enqueue({
      table: 'payments',
      operation: 'update',
      data: { status },
      recordId: id,
      baseVersion: now,
    });

    if (navigator.onLine && supabase) {
      try {
        const { error } = await supabase.from('payments').update({ status }).eq('id', id);
        if (error) throw error;
        await removeByTableAndRecord('payments', id);
        const payStatus = status === 'Paid' ? t('dashboard.paid') : status === 'Overdue' ? t('dashboard.overdue') : t('dashboard.pending');
        try { await sendNotification(t('notifications.paymentStatusUpdated').replace('{name}', payStatus), ['admin', 'accountant']); } catch { /* silent */ }
      } catch { /* silent */ }
    }

    untrack();
  }, [user?.role, isAccountant, trackPending, sendNotification]);

  const deletePayment = useCallback(async (id) => {
    if (user?.role !== 'admin' && !isAccountant) return;

    if (dbAvailable) deleteRecord('payments', id).catch(() => {});
    setData(d => ({ ...d, payments: d.payments.filter(p => p.id !== id) }));
    const untrack = trackPending(id);

    await enqueue({
      table: 'payments',
      operation: 'delete',
      data: null,
      recordId: id,
      baseVersion: new Date().toISOString(),
    });

    if (navigator.onLine && supabase) {
      try {
        const { error } = await supabase.from('payments').delete().eq('id', id);
        if (error) throw error;
        await removeByTableAndRecord('payments', id);
        try { await sendNotification(t('notifications.paymentDeleted'), ['admin', 'accountant']); } catch { /* silent */ }
      } catch { /* silent */ }
    }

    untrack();
  }, [user?.role, isAccountant, trackPending, sendNotification]);

  const updateSettings = useCallback(async (settings) => {
    if (user?.role !== 'admin') return;

    setData(d => ({ ...d, settings }));

    await enqueue({
      table: 'school_settings',
      operation: 'update',
      data: { supervisors: settings.supervisors, accountants: settings.accountants },
      recordId: null,
      baseVersion: new Date().toISOString(),
    });

    if (navigator.onLine && supabase) {
      try {
        const { data: existing } = await supabase.from('school_settings').select('id').single();
        if (existing) {
          await supabase.from('school_settings').update({ supervisors: settings.supervisors, accountants: settings.accountants }).eq('id', existing.id);
        } else {
          await supabase.from('school_settings').insert({ supervisors: settings.supervisors, accountants: settings.accountants });
        }
        await removeByTableAndRecord('school_settings', null);
        try { await sendNotification(t('notifications.settingsUpdated'), ['admin']); } catch { /* silent */ }
      } catch { /* silent */ }
    }
  }, [user?.role, sendNotification]);

  const saveSchoolInfo = useCallback(async (info) => {
    if (user?.role !== 'admin') return;

    const record = {
      school_name: info.schoolName, school_address: info.schoolAddress,
      school_phone: info.schoolPhone, admin_name: info.adminName,
      admin_email: info.adminEmail, school_email: info.schoolEmail,
      school_logo_url: info.schoolLogoUrl, academic_year: info.academicYear,
      academic_term: info.academicTerm, sms_on: info.smsOn,
      email_on: info.emailOn, supervisors: info.supervisors,
      accountants: info.accountants,
    };

    setData(d => ({
      ...d,
      schoolInfo: info,
      settings: { supervisors: info.supervisors || [], accountants: info.accountants || [] },
    }));

    await enqueue({
      table: 'school_settings',
      operation: 'update',
      data: record,
      recordId: null,
      baseVersion: new Date().toISOString(),
    });

    if (navigator.onLine && supabase) {
      try {
        const { data: existing } = await supabase.from('school_settings').select('id').single();
        if (existing) {
          await supabase.from('school_settings').update(record).eq('id', existing.id);
        } else {
          await supabase.from('school_settings').insert(record);
        }
        await removeByTableAndRecord('school_settings', null);
      } catch { /* silent */ }
    }
  }, [user?.role]);

  // --- Stats ---
  const stats = useMemo(() => {
    const active = data.students.filter(s => s.status === 'Active').length;
    const paidPayments = data.payments.filter(p => p.status === 'Paid');
    const pendingPayments = data.payments.filter(p => p.status === 'Pending');
    const overduePayments = data.payments.filter(p => p.status === 'Overdue');
    const collected = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpected = data.payments.reduce((sum, p) => sum + p.amount, 0);
    const collectionRate = totalExpected > 0 ? Math.round((collected / totalExpected) * 100) : 0;
    const gradesWithScores = data.grades.filter(g => typeof g.score === 'number');
    const avgGrade = gradesWithScores.length > 0
      ? Math.round(gradesWithScores.reduce((sum, g) => sum + g.score, 0) / gradesWithScores.length)
      : 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const newThisMonth = data.students.filter(s => {
      if (!s.created_at) return false;
      const d = new Date(s.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    return {
      students: data.students.length, active,
      pendingPayments: pendingPayments.length,
      overdueCount: overduePayments.length,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
      collected, totalExpected, collectionRate,
      avgGrade, gradesCount: gradesWithScores.length,
      newThisMonth,
    };
  }, [data]);

  const fetchStudentPhoto = useCallback(async (studentId) => {
    if (!studentId || !supabase) return null;
    const { data: photoData } = await supabase.from('students').select('photo').eq('id', studentId).single();
    if (photoData?.photo) {
      setData(d => ({ ...d, students: d.students.map(s => s.id === studentId ? { ...s, photo: photoData.photo } : s) }));
      return photoData.photo;
    }
    return null;
  }, []);

  const value = useMemo(() => ({
    ...data, stats, loading, hasMore, loadMore, addStudent, updateStudent, deleteStudent, addGrade, updateGrade, deleteGrade,
    addPayment, updatePaymentStatus, deletePayment, sendNotification,
    isSupervisor, isAccountant, canEditStudent, canEditGrade, getEditableStudentIds,
    getAssignedClasses, getAssignedSubjects: () => assignment?.subjects || [],
    updateSettings, saveSchoolInfo, getStudentIdForUser, schoolId, fetchStudentPhoto,
  }), [data, stats, loading, hasMore, loadMore, addStudent, updateStudent, deleteStudent, addGrade, updateGrade, deleteGrade,
      addPayment, updatePaymentStatus, deletePayment, sendNotification, isSupervisor, isAccountant,
      canEditStudent, canEditGrade, getEditableStudentIds, getAssignedClasses, assignment,
      updateSettings, saveSchoolInfo, getStudentIdForUser, schoolId, fetchStudentPhoto]);

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used within SchoolProvider');
  return ctx;
}
