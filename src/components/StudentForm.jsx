import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Upload } from 'lucide-react';
import { SUDANESE_GRADES } from '../lib/utils';
import { isStorageUrl } from '../lib/storage';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export default function StudentForm({ student, onSubmit, onCancel, classes }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: '', class: '', grade: '1', email: '', status: 'Active', parent: '', phone: '', photo: null,
    nationalId: '', birthDate: '',
  });
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name || '',
        class: student.class || '',
        grade: student.grade || '10',
        email: student.email || '',
        status: student.status || 'Active',
        parent: student.parent || '',
        phone: student.phone || '',
        photo: student.photo || null,
        nationalId: student.nationalId || '',
        birthDate: student.birthDate || '',
      });
      setPreview(student.photo);
    }
  }, [student]);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handlePhoto = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { alert('Photo must be under 2MB'); return; }
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    const objectUrl = URL.createObjectURL(file);
    setForm(f => ({ ...f, photo: file }));
    setPreview(objectUrl);
  };

  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.class.trim() || !form.parent.trim()) {
      setError(t('bulkImport.required'));
      return;
    }
    setError('');
    setSubmitting(true);
    try { await onSubmit(form); } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="bg-error/10 text-error text-sm px-4 py-2.5 rounded-lg" role="alert">{error}</div>}
      <div className="flex items-center gap-4 mb-2">
        <div className="w-16 h-16 rounded-full overflow-hidden border border-outline-variant bg-surface-container-high flex items-center justify-center shrink-0">
          {preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-secondary">{t('studentForm.photo')}</span>}
        </div>
        <label className="flex items-center gap-2 px-3 py-2 border border-outline-variant rounded-lg text-sm text-secondary hover:bg-surface-container-low cursor-pointer transition-colors">
          <Upload className="w-4 h-4" /> {form.photo ? t('studentForm.change') : t('studentForm.upload')}
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.fullName')}</label><input name="name" value={form.name} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.class')}</label>{classes ? (
          <select name="class" value={form.class} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="">{t('studentForm.selectClass')}</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : <input name="class" value={form.class} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" />}</div>
        <div>
          <label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.grade')}</label>
          <select name="grade" value={form.grade} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary">
            <optgroup label={t('studentForm.stagePrimary')}>
              {SUDANESE_GRADES.filter(g => g.stageEn === 'Primary').map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </optgroup>
            <optgroup label={t('studentForm.stageIntermediate')}>
              {SUDANESE_GRADES.filter(g => g.stageEn === 'Intermediate').map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
        <div><label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.email')}</label><input name="email" type="email" value={form.email} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.parentGuardian')}</label><input name="parent" value={form.parent} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.phone')}</label><input name="phone" value={form.phone} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.nationalId')}</label><input name="nationalId" value={form.nationalId} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.birthDate')}</label><input name="birthDate" type="date" value={form.birthDate} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        <div><label className="block text-xs font-semibold text-secondary mb-1">{t('studentForm.status')}</label><select name="status" value={form.status} onChange={handle} className="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"><option value="Active">{t('studentForm.active')}</option><option value="Inactive">{t('studentForm.inactive')}</option></select></div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-low transition-colors">{t('studentForm.cancel')}</button>
        <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors shadow-sm">{student ? t('studentForm.update') : t('studentForm.add')}</button>
      </div>
    </form>
  );
}
