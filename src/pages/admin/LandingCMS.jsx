import { useState } from 'react';
import { useLanding } from '../../context/LandingContext';
import { useLanguage } from '../../context/LanguageContext';
import { Eye, EyeOff, Edit3, Save, Plus, Trash2, GripVertical, ArrowUp, ArrowDown, Medal, UserPlus, Globe } from 'lucide-react';
import Reveal from '../../components/Reveal';

import { getLocalized, setLocalized } from '../../lib/localized';

function Field({ label, value, onChange, multiline, type = 'text' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-on-surface-variant mb-1">{label}</label>
      {multiline ? (
        <textarea className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm focus:border-primary focus:ring-1" rows="3" value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <input className="w-full h-10 rounded-lg border border-outline-variant bg-surface px-3 text-sm focus:border-primary focus:ring-1" type={type} value={value} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}

function BilingualField({ label, field, onFieldChange, multiline }) {
  const { lang } = useLanguage();
  return (
    <Field
      label={`${label} (${lang === 'ar' ? 'عربي' : 'EN'})`}
      value={getLocalized(field, lang)}
      onChange={v => onFieldChange(setLocalized(field, v, lang))}
      multiline={multiline}
    />
  );
}

export default function LandingCMS() {
  const { sections, events, achievements, teachers, hero, about, honorBoard, contact, registration, toggleSection, reorderSections, updateContent, addEvent, updateEvent, deleteEvent, addAchievement, updateAchievement, deleteAchievement, updateHonorBoard, updateContact, updateRegistration, addTeacher, updateTeacher, deleteTeacher } = useLanding();
  const { t, lang } = useLanguage();
  const [localHero, setLocalHero] = useState(hero);
  const [localAbout, setLocalAbout] = useState(about);
  const [localHonorBoard, setLocalHonorBoard] = useState(honorBoard);
  const [honorSaved, setHonorSaved] = useState(false);
  const [localContact, setLocalContact] = useState(contact);
  const [contactSaved, setContactSaved] = useState(false);
  const [localRegistration, setLocalRegistration] = useState(registration);
  const [registrationSaved, setRegistrationSaved] = useState(false);
  const [newClass, setNewClass] = useState({ name: { ar: '', en: '' }, description: { ar: '', en: '' }, maxSpots: 30 });
  const [newEvent, setNewEvent] = useState({ title: { ar: '', en: '' }, date: '', description: { ar: '', en: '' }, time: '', location: { ar: '', en: '' }, image: '' });
  const [newAchievement, setNewAchievement] = useState({ title: { ar: '', en: '' }, date: '', description: { ar: '', en: '' }, image: '' });
  const [newTeacher, setNewTeacher] = useState({ name: { ar: '', en: '' }, subject: { ar: '', en: '' }, bio: { ar: '', en: '' }, image: '' });
  const [editEventId, setEditEventId] = useState(null);
  const [editAchievementId, setEditAchievementId] = useState(null);
  const [editTeacherId, setEditTeacherId] = useState(null);
  const [savingSection, setSavingSection] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSaveContent = async () => {
    await updateContent('hero', localHero);
    await updateContent('about', localAbout);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveRegistration = async () => {
    await updateRegistration(localRegistration);
    setRegistrationSaved(true);
    setTimeout(() => setRegistrationSaved(false), 2000);
  };

  const handleToggle = async (type) => {
    const s = sections.find(x => x.type === type);
    setSavingSection(type);
    await toggleSection(type, !s.visible);
    setSavingSection(null);
  };

  const handleReorder = (type, dir) => {
    const sorted = [...sections].filter(s => s.visible).sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(s => s.type === type);
    if (idx === -1 || (dir === 'up' && idx === 0) || (dir === 'down' && idx === sorted.length - 1)) return;
    const newOrder = sorted.map(s => s.type);
    const swap = newOrder[idx + (dir === 'up' ? -1 : 1)];
    newOrder[idx + (dir === 'up' ? -1 : 1)] = newOrder[idx];
    newOrder[idx] = swap;
    reorderSections(newOrder);
  };

  const visibleSections = sections.filter(s => s.visible).sort((a, b) => a.sort_order - b.sort_order);
  const langLabel = lang === 'ar' ? 'عربي' : 'EN';

  const resetNewEvent = () => setNewEvent({ title: { ar: '', en: '' }, date: '', description: { ar: '', en: '' }, time: '', location: { ar: '', en: '' }, image: '' });
  const resetNewAchievement = () => setNewAchievement({ title: { ar: '', en: '' }, date: '', description: { ar: '', en: '' }, image: '' });
  const resetNewTeacher = () => setNewTeacher({ name: { ar: '', en: '' }, subject: { ar: '', en: '' }, bio: { ar: '', en: '' }, image: '' });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">
      <Reveal>
        <div>
          <h2 className="text-headline-md text-on-background">{t('landingCMS.title')}</h2>
          <p className="text-body-md text-secondary mt-1">{t('landingCMS.subtitle')}</p>
          <p className="text-xs text-primary mt-1 flex items-center gap-1"><Globe className="w-3 h-3" /> {t('landingCMS.editingLang', { lang: langLabel })}</p>
        </div>
      </Reveal>

      <Reveal delay={0.1}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <h3 className="text-headline-md text-on-surface mb-4 flex items-center justify-between">
          <span>{t('landingCMS.sections')}</span>
          <span className="text-xs text-secondary font-normal">{t('landingCMS.of', { visible: visibleSections.length, total: sections.length })}</span>
        </h3>
        <div className="space-y-2">
          {[...sections].sort((a, b) => a.sort_order - b.sort_order).map(s => (
            <div key={s.type} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleReorder(s.type, 'up')} className="text-secondary hover:text-primary p-0.5 disabled:opacity-30" disabled={s.sort_order <= 1}><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => handleReorder(s.type, 'down')} className="text-secondary hover:text-primary p-0.5 disabled:opacity-30" disabled={s.sort_order >= sections.length}><ArrowDown className="w-3 h-3" /></button>
                </div>
                <GripVertical className="w-4 h-4 text-outline" />
                <span className="text-sm font-semibold text-on-background capitalize">{t('landingCMS.section_' + s.type)}</span>
              </div>
              <button onClick={() => handleToggle(s.type)} disabled={savingSection === s.type}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${s.visible ? 'bg-tertiary/10 text-tertiary hover:bg-tertiary/20' : 'bg-surface-container-high text-secondary hover:bg-surface-container-highest'}`}>
                {savingSection === s.type ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : s.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {s.visible ? t('landingCMS.visible') : t('landingCMS.hidden')}
              </button>
            </div>
          ))}
        </div>
      </section></Reveal>

      <Reveal delay={0.15}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <h3 className="text-headline-md text-on-surface mb-4 flex items-center justify-between">
          <span>{t('landingCMS.heroAbout')}</span>
          <button onClick={handleSaveContent} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
            {saved ? t('landingCMS.saved') : <><Save className="w-3.5 h-3.5" /> {t('landingCMS.save')}</>}
          </button>
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-on-background border-b border-outline-variant pb-2">{t('landingCMS.hero')}</h4>
            <BilingualField label={t('landingCMS.title')} field={localHero.title} onFieldChange={v => setLocalHero(p => ({ ...p, title: v }))} />
            <BilingualField label={t('landingCMS.subtitle')} field={localHero.subtitle} onFieldChange={v => setLocalHero(p => ({ ...p, subtitle: v }))} />
            <BilingualField label={t('landingCMS.ctaText')} field={localHero.cta_text} onFieldChange={v => setLocalHero(p => ({ ...p, cta_text: v }))} />
            <Field label={t('landingCMS.ctaLink')} value={localHero.cta_link} onChange={v => setLocalHero(p => ({ ...p, cta_link: v }))} />
            <Field label={t('landingCMS.videoUrl')} value={localHero.video_url} onChange={v => setLocalHero(p => ({ ...p, video_url: v }))} />
            <Field label={t('landingCMS.imageUrl')} value={localHero.image_url} onChange={v => setLocalHero(p => ({ ...p, image_url: v }))} />
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-on-background border-b border-outline-variant pb-2">{t('landingCMS.about')}</h4>
            <BilingualField label={t('landingCMS.title')} field={localAbout.title} onFieldChange={v => setLocalAbout(p => ({ ...p, title: v }))} />
            <BilingualField label={t('landingCMS.mission')} field={localAbout.content} onFieldChange={v => setLocalAbout(p => ({ ...p, content: v }))} multiline />
            <BilingualField label={t('landingCMS.vision')} field={localAbout.vision} onFieldChange={v => setLocalAbout(p => ({ ...p, vision: v }))} multiline />
            <Field label={t('landingCMS.imageUrlAlt')} value={localAbout.image_url} onChange={v => setLocalAbout(p => ({ ...p, image_url: v }))} />
            <p className="text-xs font-semibold text-secondary mt-3 mb-1">{t('landingCMS.stats')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('landingCMS.students')} value={localAbout.stats?.students || ''} onChange={v => setLocalAbout(p => ({ ...p, stats: { ...p.stats, students: Number(v) } }))} type="number" />
              <Field label={t('landingCMS.teachers')} value={localAbout.stats?.teachers || ''} onChange={v => setLocalAbout(p => ({ ...p, stats: { ...p.stats, teachers: Number(v) } }))} type="number" />
              <Field label={t('landingCMS.years')} value={localAbout.stats?.years || ''} onChange={v => setLocalAbout(p => ({ ...p, stats: { ...p.stats, years: Number(v) } }))} type="number" />
              <Field label={t('landingCMS.awards')} value={localAbout.stats?.awards || ''} onChange={v => setLocalAbout(p => ({ ...p, stats: { ...p.stats, awards: Number(v) } }))} type="number" />
            </div>
          </div>
        </div>
      </section></Reveal>

      <Reveal delay={0.18}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <h3 className="text-headline-md text-on-surface mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2"><Medal className="w-5 h-5 text-yellow-500" /> {t('landingCMS.honorBoard')}</span>
          <button onClick={async () => { await updateHonorBoard(localHonorBoard); setHonorSaved(true); setTimeout(() => setHonorSaved(false), 2000); }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
            {honorSaved ? t('landingCMS.saved') : <><Save className="w-3.5 h-3.5" /> {t('landingCMS.save')}</>}
          </button>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {localHonorBoard.entries.map((entry, i) => (
            <div key={i} className="border border-outline-variant rounded-xl p-4 space-y-3 bg-surface">
              <div className="flex items-center gap-2 pb-2 border-b border-outline-variant">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i === 0 ? 'bg-yellow-500/10 text-yellow-600' : i === 1 ? 'bg-gray-400/10 text-gray-500' : 'bg-amber-600/10 text-amber-700'}`}>
                  {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : '🥉 '}{entry.rank || `#${i + 1}`}
                </span>
              </div>
              <BilingualField label={t('landingCMS.name')} field={entry.name} onFieldChange={v => {
                const next = [...localHonorBoard.entries];
                next[i] = { ...next[i], name: v };
                setLocalHonorBoard(p => ({ ...p, entries: next }));
              }} />
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('landingCMS.grade')} value={entry.grade} onChange={v => {
                  const next = [...localHonorBoard.entries];
                  next[i] = { ...next[i], grade: v };
                  setLocalHonorBoard(p => ({ ...p, entries: next }));
                }} />
                <Field label={t('landingCMS.class')} value={entry.class} onChange={v => {
                  const next = [...localHonorBoard.entries];
                  next[i] = { ...next[i], class: v };
                  setLocalHonorBoard(p => ({ ...p, entries: next }));
                }} />
              </div>
              <Field label={t('landingCMS.score')} value={String(entry.score)} type="number" onChange={v => {
                const next = [...localHonorBoard.entries];
                next[i] = { ...next[i], score: Number(v) };
                setLocalHonorBoard(p => ({ ...p, entries: next }));
              }} />
            </div>
          ))}
        </div>
      </section></Reveal>

      <Reveal delay={0.2}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <h3 className="text-headline-md text-on-surface mb-4">{t('landingCMS.events')}</h3>
        <div className="space-y-3 mb-6">
          {events.map(e => (
            <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant">
              {editEventId === e.id ? (
                <div className="flex-1 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <BilingualField label={t('landingCMS.title')} field={e.title} onFieldChange={v => updateEvent(e.id, { title: v })} />
                    <BilingualField label={t('landingCMS.location')} field={e.location} onFieldChange={v => updateEvent(e.id, { location: v })} />
                  </div>
                  <BilingualField label={t('landingCMS.description')} field={e.description} onFieldChange={v => updateEvent(e.id, { description: v })} multiline />
                  <div className="grid sm:grid-cols-4 gap-3">
                    <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" type="date" value={e.date} onChange={v => updateEvent(e.id, { date: v.target.value })} />
                    <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" placeholder={t('landingCMS.timePlaceholder')} value={e.time || ''} onChange={v => updateEvent(e.id, { time: v.target.value })} />
                    <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" placeholder={t('landingCMS.imagePlaceholder')} value={e.image || ''} onChange={v => updateEvent(e.id, { image: v.target.value })} />
                    <div className="flex gap-2">
                      <button onClick={() => setEditEventId(null)} className="px-3 py-1.5 text-xs font-semibold bg-primary text-on-primary rounded-lg hover:bg-primary-container">{t('landingCMS.done')}</button>
                      <button onClick={() => deleteEvent(e.id)} className="px-3 py-1.5 text-xs font-semibold bg-error/10 text-error rounded-lg hover:bg-error/20"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-on-background">{getLocalized(e.title, lang)}</p>
                    <p className="text-xs text-secondary">{e.date} — {getLocalized(e.description, lang)?.slice(0, 60)}...</p>
                  </div>
                  <button onClick={() => setEditEventId(e.id)} className="text-secondary hover:text-primary p-1"><Edit3 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-outline-variant pt-4">
          <p className="text-xs font-semibold text-secondary mb-2">{t('landingCMS.addEvent')}</p>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <BilingualField label={t('landingCMS.title')} field={newEvent.title} onFieldChange={v => setNewEvent(p => ({ ...p, title: v }))} />
              <BilingualField label={t('landingCMS.location')} field={newEvent.location} onFieldChange={v => setNewEvent(p => ({ ...p, location: v }))} />
            </div>
            <BilingualField label={t('landingCMS.description')} field={newEvent.description} onFieldChange={v => setNewEvent(p => ({ ...p, description: v }))} multiline />
            <div className="grid sm:grid-cols-4 gap-3">
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" type="date" value={newEvent.date} onChange={e => setNewEvent(p => ({ ...p, date: e.target.value }))} />
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" placeholder={t('landingCMS.timePlaceholder')} value={newEvent.time} onChange={e => setNewEvent(p => ({ ...p, time: e.target.value }))} />
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" placeholder={t('landingCMS.imagePlaceholder')} value={newEvent.image} onChange={e => setNewEvent(p => ({ ...p, image: e.target.value }))} />
              <button onClick={() => { if (getLocalized(newEvent.title, lang)) { addEvent(newEvent); resetNewEvent(); } }}
                className="flex items-center justify-center gap-1 h-9 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t('landingCMS.add')}
              </button>
            </div>
          </div>
        </div>
      </section></Reveal>

      <Reveal delay={0.3}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <h3 className="text-headline-md text-on-surface mb-4">{t('landingCMS.achievements')}</h3>
        <div className="space-y-3 mb-6">
          {achievements.map(a => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant">
              {editAchievementId === a.id ? (
                <div className="flex-1 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <BilingualField label={t('landingCMS.title')} field={a.title} onFieldChange={v => updateAchievement(a.id, { title: v })} />
                    <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" type="date" value={a.date} onChange={v => updateAchievement(a.id, { date: v.target.value })} />
                  </div>
                  <BilingualField label={t('landingCMS.description')} field={a.description} onFieldChange={v => updateAchievement(a.id, { description: v })} multiline />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" placeholder={t('landingCMS.imagePlaceholder')} value={a.image || ''} onChange={v => updateAchievement(a.id, { image: v.target.value })} />
                    <div className="flex gap-2">
                      <button onClick={() => setEditAchievementId(null)} className="px-3 py-1.5 text-xs font-semibold bg-primary text-on-primary rounded-lg hover:bg-primary-container">{t('landingCMS.done')}</button>
                      <button onClick={() => deleteAchievement(a.id)} className="px-3 py-1.5 text-xs font-semibold bg-error/10 text-error rounded-lg hover:bg-error/20"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-on-background">{getLocalized(a.title, lang)}</p>
                    <p className="text-xs text-secondary">{a.date} — {getLocalized(a.description, lang)?.slice(0, 60)}</p>
                  </div>
                  <button onClick={() => setEditAchievementId(a.id)} className="text-secondary hover:text-primary p-1"><Edit3 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-outline-variant pt-4">
          <p className="text-xs font-semibold text-secondary mb-2">{t('landingCMS.addAchievement')}</p>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <BilingualField label={t('landingCMS.title')} field={newAchievement.title} onFieldChange={v => setNewAchievement(p => ({ ...p, title: v }))} />
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" type="date" value={newAchievement.date} onChange={e => setNewAchievement(p => ({ ...p, date: e.target.value }))} />
            </div>
            <BilingualField label={t('landingCMS.description')} field={newAchievement.description} onFieldChange={v => setNewAchievement(p => ({ ...p, description: v }))} multiline />
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" placeholder={t('landingCMS.imagePlaceholder')} value={newAchievement.image} onChange={e => setNewAchievement(p => ({ ...p, image: e.target.value }))} />
              <button onClick={() => { if (getLocalized(newAchievement.title, lang)) { addAchievement(newAchievement); resetNewAchievement(); } }}
                className="flex items-center justify-center gap-1 h-9 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t('landingCMS.add')}
              </button>
            </div>
          </div>
        </div>
      </section></Reveal>

      <Reveal delay={0.35}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <h3 className="text-headline-md text-on-surface mb-4 flex items-center gap-2"><span className="text-primary">👨‍🏫</span> {t('landingCMS.teachersSection')}</h3>
        <div className="space-y-3 mb-6">
          {teachers.map(teacher => (
            <div key={teacher.id} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant">
              {editTeacherId === teacher.id ? (
                <div className="flex-1 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <BilingualField label={t('landingCMS.name')} field={teacher.name} onFieldChange={v => updateTeacher(teacher.id, { name: v })} />
                    <BilingualField label={t('landingCMS.subject')} field={teacher.subject} onFieldChange={v => updateTeacher(teacher.id, { subject: v })} />
                  </div>
                  <BilingualField label={t('landingCMS.bio')} field={teacher.bio} onFieldChange={v => updateTeacher(teacher.id, { bio: v })} multiline />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" placeholder={t('landingCMS.imagePlaceholder')} value={teacher.image || ''} onChange={v => updateTeacher(teacher.id, { image: v.target.value })} />
                    <div className="flex gap-2">
                      <button onClick={() => setEditTeacherId(null)} className="px-3 py-1.5 text-xs font-semibold bg-primary text-on-primary rounded-lg hover:bg-primary-container">{t('landingCMS.done')}</button>
                      <button onClick={() => deleteTeacher(teacher.id)} className="px-3 py-1.5 text-xs font-semibold bg-error/10 text-error rounded-lg hover:bg-error/20"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-on-background">{getLocalized(teacher.name, lang)}</p>
                    <p className="text-xs text-secondary">{getLocalized(teacher.subject, lang)}{teacher.bio ? ` — ${getLocalized(teacher.bio, lang)?.slice(0, 60)}` : ''}</p>
                  </div>
                  <button onClick={() => setEditTeacherId(teacher.id)} className="text-secondary hover:text-primary p-1"><Edit3 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="border-t border-outline-variant pt-4">
          <p className="text-xs font-semibold text-secondary mb-2">{t('landingCMS.addTeacher')}</p>
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <BilingualField label={t('landingCMS.name')} field={newTeacher.name} onFieldChange={v => setNewTeacher(p => ({ ...p, name: v }))} />
              <BilingualField label={t('landingCMS.subject')} field={newTeacher.subject} onFieldChange={v => setNewTeacher(p => ({ ...p, subject: v }))} />
            </div>
            <BilingualField label={t('landingCMS.bio')} field={newTeacher.bio} onFieldChange={v => setNewTeacher(p => ({ ...p, bio: v }))} multiline />
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs" placeholder={t('landingCMS.imagePlaceholder')} value={newTeacher.image} onChange={e => setNewTeacher(p => ({ ...p, image: e.target.value }))} />
              <button onClick={() => { if (getLocalized(newTeacher.name, lang)) { addTeacher(newTeacher); resetNewTeacher(); } }}
                className="flex items-center justify-center gap-1 h-9 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
                <Plus className="w-3.5 h-3.5" /> {t('landingCMS.add')}
              </button>
            </div>
          </div>
        </div>
      </section></Reveal>

      <Reveal delay={0.4}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <h3 className="text-headline-md text-on-surface mb-4 flex items-center justify-between">
          <span>{t('landingCMS.contactInfo')}</span>
          <button onClick={async () => { await updateContact(localContact); setContactSaved(true); setTimeout(() => setContactSaved(false), 2000); }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
            {contactSaved ? t('landingCMS.saved') : <><Save className="w-3.5 h-3.5" /> {t('landingCMS.save')}</>}
          </button>
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Field label={t('landingCMS.phone')} value={localContact.phone} onChange={v => setLocalContact(p => ({ ...p, phone: v }))} />
          <Field label={t('landingCMS.email')} value={localContact.email} onChange={v => setLocalContact(p => ({ ...p, email: v }))} />
          <BilingualField label={t('landingCMS.address')} field={localContact.address} onFieldChange={v => setLocalContact(p => ({ ...p, address: v }))} />
        </div>
      </section></Reveal>

      <Reveal delay={0.45}><section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
        <h3 className="text-headline-md text-on-surface mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-primary" /> {t('landingCMS.section_registration')}</span>
          <button onClick={handleSaveRegistration}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
            {registrationSaved ? t('landingCMS.saved') : <><Save className="w-3.5 h-3.5" /> {t('landingCMS.save')}</>}
          </button>
        </h3>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <BilingualField label={t('landingCMS.title')} field={localRegistration.title || ''} onFieldChange={v => setLocalRegistration(p => ({ ...p, title: v }))} />
            <BilingualField label={t('landingCMS.subtitle')} field={localRegistration.subtitle || ''} onFieldChange={v => setLocalRegistration(p => ({ ...p, subtitle: v }))} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={t('registration.deadline')} value={localRegistration.deadline || ''} onChange={v => setLocalRegistration(p => ({ ...p, deadline: v }))} type="date" />
            <BilingualField label={t('registration.privacy')} field={localRegistration.privacyNote || ''} onFieldChange={v => setLocalRegistration(p => ({ ...p, privacyNote: v }))} />
          </div>
          <BilingualField label={t('registration.successMessage')} field={localRegistration.successMessage || ''} onFieldChange={v => setLocalRegistration(p => ({ ...p, successMessage: v }))} multiline />
          <BilingualField label={t('registration.fullClassMessage')} field={localRegistration.fullClassMessage || ''} onFieldChange={v => setLocalRegistration(p => ({ ...p, fullClassMessage: v }))} multiline />

          <div className="border-t border-outline-variant pt-4">
            <p className="text-xs font-semibold text-secondary mb-3">{t('registration.classes')}</p>
            <div className="space-y-2 mb-4">
              {(localRegistration.classes || []).map((cls, i) => (
                <div key={cls.id} className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant bg-surface">
                  <div className="flex-1 grid sm:grid-cols-3 gap-2">
                    <BilingualField label={t('registration.classes')} field={cls.name} onFieldChange={v => {
                      const next = [...localRegistration.classes]; next[i] = { ...next[i], name: v }; setLocalRegistration(p => ({ ...p, classes: next }));
                    }} />
                    <BilingualField label={t('landingCMS.subtitle')} field={cls.description || ''} onFieldChange={v => {
                      const next = [...localRegistration.classes]; next[i] = { ...next[i], description: v }; setLocalRegistration(p => ({ ...p, classes: next }));
                    }} />
                    <Field label={t('registration.spots')} value={cls.maxSpots} type="number" onChange={e => {
                      const next = [...localRegistration.classes]; next[i] = { ...next[i], maxSpots: Number(e.target.value) }; setLocalRegistration(p => ({ ...p, classes: next }));
                    }} />
                  </div>
                  <button onClick={() => setLocalRegistration(p => ({ ...p, classes: p.classes.filter((_, j) => j !== i) }))} className="text-error/70 hover:text-error p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs flex-1" placeholder={`${t('registration.classes')} (${langLabel})`} value={getLocalized(newClass.name, lang)} onChange={e => setNewClass(p => ({ ...p, name: setLocalized(p.name, e.target.value, lang) }))} />
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs flex-1" placeholder={`${t('landingCMS.subtitle')} (${langLabel})`} value={getLocalized(newClass.description, lang)} onChange={e => setNewClass(p => ({ ...p, description: setLocalized(p.description, e.target.value, lang) }))} />
              <input className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-xs w-20" type="number" placeholder={t('registration.spots')} value={newClass.maxSpots} onChange={e => setNewClass(p => ({ ...p, maxSpots: Number(e.target.value) }))} />
              <button onClick={() => { if (getLocalized(newClass.name, lang)) { setLocalRegistration(p => ({ ...p, classes: [...(p.classes || []), { ...newClass, id: String(Date.now()) }] })); setNewClass({ name: { ar: '', en: '' }, description: { ar: '', en: '' }, maxSpots: 30 }); } }}
                className="flex items-center justify-center gap-1 h-9 px-3 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-outline-variant mt-6 pt-4">
          <a href="/admin/registrations" className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-container transition-colors">
            {t('sidebar.registrations')} →
          </a>
        </div>
      </section></Reveal>
    </div>
  );
}
