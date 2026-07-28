import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, dbAvailable } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { t } from '../lib/i18n';

const LandingContext = createContext(null);

const DEFAULT_SECTIONS = [
  { type: 'hero', title: 'القسم الرئيسي', visible: true, sort_order: 1 },
  { type: 'honor_board', title: 'لوحة الشرف', visible: true, sort_order: 2 },
  { type: 'events', title: 'الفعاليات', visible: true, sort_order: 3 },
  { type: 'achievements', title: 'الإنجازات', visible: true, sort_order: 4 },
  { type: 'about', title: 'عن المدرسة', visible: true, sort_order: 5 },
  { type: 'teachers', title: 'المعلمون', visible: true, sort_order: 6 },
  { type: 'contact', title: 'اتصل بنا', visible: true, sort_order: 7 },
  { type: 'registration', title: 'التسجيل للعام الجديد', visible: false, sort_order: 8 },
];

const DEFAULT_EVENTS = [
  { id: 1, title: { ar: 'معرض العلوم السنوي', en: 'Annual Science Fair' }, date: '2026-09-15', description: { ar: 'يعرض الطلاب مشاريعهم العلمية. مرحب بالأهالي وأعضاء المجتمع.', en: 'Students showcase their science projects. Parents and community welcome.' }, image: null, time: '10:00 ص', location: { ar: 'قاعة المدرسة', en: 'School Hall' } },
  { id: 2, title: { ar: 'يوم الرياضة', en: 'Sports Day' }, date: '2026-10-01', description: { ar: 'منافسات رياضية سنوية عبر جميع الصفوف.', en: 'Annual sports competitions across all grades.' }, image: null, time: '8:00 ص', location: { ar: 'ملعب المدرسة', en: 'School Grounds' } },
  { id: 3, title: { ar: 'اجتماع أولياء الأمور والمعلمين', en: 'Parent-Teacher Meeting' }, date: '2026-10-20', description: { ar: 'قابل معلم طفلك. ناقش التقدم والمجالات للتحسين.', en: 'Meet your child\'s teacher. Discuss progress and areas for improvement.' }, image: null, time: '4:00 م', location: { ar: 'الفصول الدراسية', en: 'Classrooms' } },
];

const DEFAULT_ACHIEVEMENTS = [
  { id: 1, title: { ar: 'أبطال الرياضيات الإقليميين', en: 'Regional Math Champions' }, description: { ar: 'فاز فريقنا بالمركز الأول في الأولمبياد الرياضيات الإقليمي.', en: 'Our team won first place in the regional Math Olympiad.' }, date: '2026-03-15', image: null },
  { id: 2, title: { ar: 'نسبة تخريج 100%', en: '100% Graduation Rate' }, description: { ar: 'تخرج جميع الطلاب بمعدل متميز هذا العام الأكاديمي.', en: 'All students graduated with distinction this academic year.' }, date: '2026-06-01', image: null },
  { id: 3, title: { ar: 'جائزة المدرسة الخضراء', en: 'Green School Award' }, description: { ar: 'تم التعرف على التميز في التعليم البيئي والاستدامة.', en: 'Recognized for excellence in environmental education and sustainability.' }, date: '2025-12-10', image: null },
];

const DEFAULT_TEACHERS = [
  { id: 1, name: { ar: 'الأستاذ محمد أحمد', en: 'Mr. Mohammed Ahmed' }, subject: { ar: 'الرياضيات', en: 'Mathematics' }, bio: { ar: 'خبرة 15 عاماً في التدريس. شغوف بجعل الرياضيات ممتعة.', en: '15 years of teaching experience. Passionate about making math fun.' }, image: null },
  { id: 2, name: { ar: 'الأستاذة فاطمة علي', en: 'Ms. Fatima Ali' }, subject: { ar: 'العلوم', en: 'Science' }, bio: { ar: 'عالمة أبحاث سابرة تحولت إلى معلمة. تحب التجارب العملية.', en: 'Former researcher turned educator. Loves hands-on experiments.' }, image: null },
  { id: 3, name: { ar: 'الأستاذة خديجة حسن', en: 'Ms. Khadija Hassan' }, subject: { ar: 'اللغة العربية', en: 'Arabic Language' }, bio: { ar: 'كاتبة منشئة ومعلمة أدب متفانية.', en: 'Creative writer and dedicated literature teacher.' }, image: null },
  { id: 4, name: { ar: 'الأستاذ عمر محمد', en: 'Mr. Omar Mohammed' }, subject: { ar: 'علوم الحاسب', en: 'Computer Science' }, bio: { ar: 'خبير في صناعة التكنولوجيا. يعلم البرمجة والثقافة الرقمية.', en: 'Tech industry expert. Teaches programming and digital literacy.' }, image: null },
];

const DEFAULT_HERO = {
  title: { ar: 'مدرسه العامريه', en: 'Al-Amiriya School' },
  subtitle: { ar: 'نرعى العقول، نبني المستقبل — حيث يتفوق كل طالب.', en: 'Nurturing minds, building futures — where every student excels.' },
  cta_text: { ar: 'اعرف المزيد', en: 'Learn More' },
  cta_link: '#about',
  video_url: '',
  image_url: '',
};

const DEFAULT_ABOUT = {
  title: { ar: 'عن مدرستنا', en: 'About Our School' },
  content: { ar: 'توفر مدرسة العامريه التعليم الجيد منذ أكثر من 50 عاماً. نؤمن بتدريب الأفراد المتكاملين من خلال منهج متوازن من الأكاديميين والفنون والرياضية. يعمل مجلسنا المتفاني بجد لإنشاء بيئة داعمة يمكن لكل طالب فيها أن يزدهر.', en: 'Al-Amiriya School has provided quality education for over 50 years. We believe in developing well-rounded individuals through a balanced curriculum of academics, arts, and sports. Our dedicated board works hard to create a supportive environment where every student can thrive.' },
  vision: { ar: 'تمكين كل طالب من تحقيق إمكاناته الكاملة كمتعلم مدى الحياة ومواطن عالمي مسؤول، مزود بالمهارات والشخصية لإحداث تأثير إيجابي في العالم.', en: 'To empower every student to reach their full potential as lifelong learners and responsible global citizens, equipped with the skills and character to make a positive impact on the world.' },
  image_url: '',
  stats: { students: 1245, teachers: 85, years: 52, awards: 28 },
};

const DEFAULT_CONTACT = {
  phone: '+249 91 234 5678',
  email: 'info@al-amriya.netlify.app',
  address: { ar: 'العامريه، الخرتوم', en: 'Al-Amiriya, Khartoum' },
};

const DEFAULT_REGISTRATION = {
  title: { ar: 'التسجيل للعام الدراسي الجديد', en: 'Registration for New Academic Year' },
  subtitle: { ar: 'سجل الآن واحجز مقعد طفلك في فصله المفضل', en: 'Register now and secure your child\'s spot in their preferred class' },
  deadline: '2026-08-30',
  classes: [
    { id: '1', name: { ar: 'صف أول', en: 'Grade 1' }, description: { ar: 'المرحلة الابتدائية', en: 'Primary Stage' }, maxSpots: 30 },
    { id: '2', name: { ar: 'صف ثاني', en: 'Grade 2' }, description: { ar: 'المرحلة الابتدائية', en: 'Primary Stage' }, maxSpots: 30 },
    { id: '3', name: { ar: 'صف ثالث', en: 'Grade 3' }, description: { ar: 'المرحلة الابتدائية', en: 'Primary Stage' }, maxSpots: 30 },
    { id: '4', name: { ar: 'صف رابع', en: 'Grade 4' }, description: { ar: 'المرحلة الابتدائية', en: 'Primary Stage' }, maxSpots: 30 },
  ],
  trustSignals: [{ ar: 'التسجيل مجاني', en: 'Registration is free' }, { ar: 'لا تتطلب وثائق الآن', en: 'No documents required now' }, { ar: 'تأكيد فوري', en: 'Instant confirmation' }],
  privacyNote: { ar: 'معلوماتك محمية ولن تُستخدم إلا لأغراض التسجيل', en: 'Your information is protected and will only be used for registration purposes' },
  successMessage: { ar: 'تم تسجيل طفلك بنجاح! سيتم التواصل معك قريباً لتأكيد التسجيل.', en: 'Your child has been registered successfully! We will contact you shortly to confirm enrollment.' },
  fullClassMessage: { ar: 'هذا الصف ممتلئ، تواصل مع المديرية للتسجيل', en: 'This class is full. Contact the school administration to register.' },
};

const DEFAULT_HONOR_BOARD = {
  entries: [
    { name: { ar: 'أحمد محمد علي', en: 'Ahmed Mohammed Ali' }, grade: 'التاسع', class: '9A', score: 95, rank: 'الأول', medal: 'الميدالية الذهبية' },
    { name: { ar: 'سارة عبدالله حسن', en: 'Sara Abdullah Hassan' }, grade: 'التاسع', class: '9A', score: 81, rank: 'الثاني', medal: 'الميدالية الفضية' },
    { name: { ar: 'محمد إبراهيم خالد', en: 'Mohammed Ibrahim Khaled' }, grade: 'السادس', class: '6B', score: 92, rank: 'الثالث', medal: 'الميدالية البرونزية' },
  ],
};

const LANDING_STORAGE_KEY = 'eduadmin_landing_data';

function loadFromStorage(defaultValue, key) {
  try {
    const stored = localStorage.getItem(LANDING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed[key] !== undefined ? parsed[key] : defaultValue;
    }
  } catch { /* silent */ }
  return defaultValue;
}

function saveAllToStorage(data) {
  try { localStorage.setItem(LANDING_STORAGE_KEY, JSON.stringify(data)); } catch { /* silent */ }
}

export function LandingProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [sections, setSections] = useState(() => loadFromStorage(DEFAULT_SECTIONS, 'sections'));
  const [events, setEvents] = useState(() => loadFromStorage(DEFAULT_EVENTS, 'events'));
  const [achievements, setAchievements] = useState(() => loadFromStorage(DEFAULT_ACHIEVEMENTS, 'achievements'));
  const [teachers, setTeachers] = useState(() => loadFromStorage(DEFAULT_TEACHERS, 'teachers'));
  const [hero, setHero] = useState(() => loadFromStorage(DEFAULT_HERO, 'hero'));
  const [about, setAbout] = useState(() => loadFromStorage(DEFAULT_ABOUT, 'about'));
  const [honorBoard, setHonorBoard] = useState(() => loadFromStorage(DEFAULT_HONOR_BOARD, 'honorBoard'));
  const [contact, setContact] = useState(() => loadFromStorage(DEFAULT_CONTACT, 'contact'));
  const [registration, setRegistration] = useState(() => loadFromStorage(DEFAULT_REGISTRATION, 'registration'));
  const [loading, setLoading] = useState(false);

  // ponytail: debounced localStorage save — was writing on every keystroke
  const saveTimeoutRef = useRef(null);
  const debouncedSave = useCallback((d) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveAllToStorage(d), 500);
  }, []);

  useEffect(() => {
    if (!dbAvailable) return;
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      supabase.from('landing_sections').select('*').order('sort_order'),
      supabase.from('landing_content').select('*'),
    ]).then(([sectionsRes, contentRes]) => {
      if (controller.signal.aborted) return;
      if (sectionsRes.data && sectionsRes.data.length) {
        const dbTypes = new Set(sectionsRes.data.map(s => s.type));
        const missing = DEFAULT_SECTIONS.filter(s => !dbTypes.has(s.type));
        setSections([...sectionsRes.data, ...missing]);
      }
      if (contentRes.data) {
        const heroData = contentRes.data.find(c => c.key === 'hero');
        const aboutData = contentRes.data.find(c => c.key === 'about');
        const honorBoardData = contentRes.data.find(c => c.key === 'honor_board');
        const contactData = contentRes.data.find(c => c.key === 'contact');
        const registrationData = contentRes.data.find(c => c.key === 'registration');
        if (heroData) setHero(prev => ({ ...prev, ...heroData.content }));
        if (aboutData) setAbout(prev => ({ ...prev, ...aboutData.content }));
        if (honorBoardData) setHonorBoard(prev => ({ ...prev, ...honorBoardData.content }));
        if (contactData) setContact(prev => ({ ...prev, ...contactData.content }));
        if (registrationData) setRegistration(prev => ({ ...prev, ...registrationData.content }));
      }
      setLoading(false);
    }).catch(() => { if (!controller.signal.aborted) setLoading(false); });
    Promise.all([
      supabase.from('events').select('*').order('date'),
      supabase.from('achievements').select('*').order('date', { ascending: false }),
      supabase.from('teachers').select('*'),
    ]).then(([eventsRes, achievementsRes, teachersRes]) => {
      if (controller.signal.aborted) return;
      if (eventsRes.data && eventsRes.data.length) setEvents(eventsRes.data);
      if (achievementsRes.data && achievementsRes.data.length) setAchievements(achievementsRes.data);
      if (teachersRes.data && teachersRes.data.length) setTeachers(teachersRes.data);
    }).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    debouncedSave({ sections, events, achievements, teachers, hero, about, honorBoard, contact, registration });
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [sections, events, achievements, teachers, hero, about, honorBoard, contact, registration, debouncedSave]);

  const notify = useCallback(async (message) => {
    if (!message?.trim() || !dbAvailable || !supabase) return;
    try { await supabase.from('notifications').insert({ message: message.trim(), target_roles: ['admin'] }); } catch { /* silent */ }
  }, []);

  const toggleSection = useCallback(async (type, visible) => {
    setSections(prev => prev.map(s => s.type === type ? { ...s, visible } : s));
    if (!dbAvailable || !isAdmin) return;
    const { error } = await supabase.from('landing_sections').upsert({ type, visible }, { onConflict: 'type' });
    if (error) return;
    const sectionLabel = t(`landingCMS.section_${type}`) || type;
    const statusLabel = visible ? t('notifications.sectionToggledVisible') : t('notifications.sectionToggledHidden');
    try { await notify(t('notifications.sectionToggled').replace('{section}', sectionLabel).replace('{status}', statusLabel)); } catch { /* silent */ }
  }, [isAdmin, notify]);

  const reorderSections = useCallback(async (orderedTypes) => {
    setSections(prev => orderedTypes.map((type, i) => ({ ...prev.find(s => s.type === type), sort_order: i + 1 })));
    if (!dbAvailable || !isAdmin) return;
    for (let i = 0; i < orderedTypes.length; i++) {
      const { error } = await supabase.from('landing_sections').update({ sort_order: i + 1 }).eq('type', orderedTypes[i]);
      if (error) return;
    }
  }, [isAdmin]);

  const updateContent = useCallback(async (key, content) => {
    if (key === 'hero') setHero(content);
    if (key === 'about') setAbout(content);
    if (!dbAvailable || !isAdmin) return;
    const { data } = await supabase.from('landing_content').select('id').eq('key', key).single();
    if (data) { await supabase.from('landing_content').update({ content }).eq('key', key); }
    else { await supabase.from('landing_content').insert({ key, content }); }
    const sectionLabel = t(`landingCMS.section_${key}`) || key;
    try { await notify(t('notifications.sectionUpdated').replace('{section}', sectionLabel)); } catch { /* silent */ }
  }, [isAdmin, notify]);

  const addEvent = useCallback(async (event) => {
    if (!dbAvailable || !isAdmin) { setEvents(prev => [...prev, { ...event, id: Date.now() }]); return; }
    const { data, error } = await supabase.from('events').insert(event).select().single();
    if (error) return;
    if (data) setEvents(prev => [...prev, data]);
    try { await notify(t('notifications.eventAdded')); } catch { /* silent */ }
  }, [notify, isAdmin]);

  const updateEvent = useCallback(async (id, updates) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    if (!dbAvailable || !isAdmin) return;
    const { error } = await supabase.from('events').update(updates).eq('id', id);
    if (error) return;
  }, [isAdmin]);

  const deleteEvent = useCallback(async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    if (!dbAvailable || !isAdmin) return;
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return;
    try { await notify(t('notifications.eventDeleted')); } catch { /* silent */ }
  }, [isAdmin, notify]);

  const addAchievement = useCallback(async (achievement) => {
    if (!dbAvailable || !isAdmin) { setAchievements(prev => [...prev, { ...achievement, id: Date.now() }]); return; }
    const { data, error } = await supabase.from('achievements').insert(achievement).select().single();
    if (error) return;
    if (data) setAchievements(prev => [...prev, data]);
    try { await notify(t('notifications.achievementAdded')); } catch { /* silent */ }
  }, [notify, isAdmin]);

  const updateAchievement = useCallback(async (id, updates) => {
    setAchievements(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    if (!dbAvailable || !isAdmin) return;
    const { error } = await supabase.from('achievements').update(updates).eq('id', id);
    if (error) return;
  }, [isAdmin]);

  const deleteAchievement = useCallback(async (id) => {
    setAchievements(prev => prev.filter(a => a.id !== id));
    if (!dbAvailable || !isAdmin) return;
    const { error } = await supabase.from('achievements').delete().eq('id', id);
    if (error) return;
    try { await notify(t('notifications.achievementDeleted')); } catch { /* silent */ }
  }, [isAdmin, notify]);

  const updateHonorBoard = useCallback(async (content) => {
    setHonorBoard(content);
    if (!dbAvailable || !isAdmin) return;
    const { data } = await supabase.from('landing_content').select('id').eq('key', 'honor_board').single();
    if (data) { await supabase.from('landing_content').update({ content }).eq('key', 'honor_board'); }
    else { await supabase.from('landing_content').insert({ key: 'honor_board', content }); }
    try { await notify(t('notifications.honorBoardUpdated')); } catch { /* silent */ }
  }, [isAdmin, notify]);

  const updateContact = useCallback(async (content) => {
    setContact(content);
    if (!dbAvailable || !isAdmin) return;
    const { data } = await supabase.from('landing_content').select('id').eq('key', 'contact').single();
    if (data) { await supabase.from('landing_content').update({ content }).eq('key', 'contact'); }
    else { await supabase.from('landing_content').insert({ key: 'contact', content }); }
    try { await notify(t('notifications.contactUpdated')); } catch { /* silent */ }
  }, [isAdmin, notify]);

  const updateRegistration = useCallback(async (content) => {
    setRegistration(content);
    if (!dbAvailable || !isAdmin) return;
    const { data } = await supabase.from('landing_content').select('id').eq('key', 'registration').single();
    if (data) { await supabase.from('landing_content').update({ content }).eq('key', 'registration'); }
    else { await supabase.from('landing_content').insert({ key: 'registration', content }); }
    try { await notify(t('notifications.registrationUpdated')); } catch { /* silent */ }
  }, [isAdmin, notify]);

  const addTeacher = useCallback(async (teacher) => {
    if (!dbAvailable || !isAdmin) { setTeachers(prev => [...prev, { ...teacher, id: Date.now() }]); return; }
    const { data, error } = await supabase.from('teachers').insert(teacher).select().single();
    if (error) return;
    if (data) setTeachers(prev => [...prev, data]);
    try { await notify(t('notifications.teacherAdded')); } catch { /* silent */ }
  }, [notify, isAdmin]);

  const updateTeacher = useCallback(async (id, updates) => {
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    if (!dbAvailable || !isAdmin) return;
    const { error } = await supabase.from('teachers').update(updates).eq('id', id);
    if (error) return;
  }, [isAdmin]);

  const deleteTeacher = useCallback(async (id) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    if (!dbAvailable || !isAdmin) return;
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) return;
    try { await notify(t('notifications.teacherDeleted')); } catch { /* silent */ }
  }, [isAdmin, notify]);

  return <LandingContext.Provider value={{
    sections, events, achievements, teachers, hero, about, honorBoard, contact, registration, loading,
    toggleSection, reorderSections, updateContent,
    addEvent, updateEvent, deleteEvent,
    addAchievement, updateAchievement, deleteAchievement,
    updateHonorBoard, updateContact, updateRegistration,
    addTeacher, updateTeacher, deleteTeacher,
  }}>{children}</LandingContext.Provider>;
}

export function useLanding() {
  const ctx = useContext(LandingContext);
  if (!ctx) throw new Error('useLanding must be used within LandingProvider');
  return ctx;
}
