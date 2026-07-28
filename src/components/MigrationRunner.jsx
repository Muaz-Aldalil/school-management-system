import { useState } from 'react';
import { useSchool } from '../context/SchoolContext';
import { useLanguage } from '../context/LanguageContext';
import { uploadStudentPhoto, isBase64Photo } from '../lib/storage';

export default function MigrationRunner() {
  const { t } = useLanguage();
  const { students, schoolId } = useSchool();
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] });

  const base64Students = students.filter(s => isBase64Photo(s.photo));

  const migrate = async () => {
    if (base64Students.length === 0) return;
    setStatus('running');
    setProgress({ done: 0, total: base64Students.length, errors: [] });
    const errors = [];

    for (let i = 0; i < base64Students.length; i++) {
      const s = base64Students[i];
      try {
        const res = await fetch(s.photo);
        const blob = await res.blob();
        const ext = s.photo.includes('image/png') ? 'png' : 'jpg';
        const file = new File([blob], `${s.id}.${ext}`, { type: blob.type });
        await uploadStudentPhoto(file, s.id, schoolId);
      } catch (err) {
        errors.push({ name: s.name, error: err.message });
      }
      setProgress(p => ({ ...p, done: i + 1, errors }));
    }
    setStatus('done');
  };

  if (base64Students.length === 0) return null;

  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant p-4 mb-6">
      <h3 className="font-semibold text-on-surface mb-2">{t('migration.title', 'Photo Migration')}</h3>
      <p className="text-sm text-secondary mb-3">
        {t('migration.description', `${base64Students.length} student(s) have inline photos that should be migrated to cloud storage.`)}
      </p>
      {status === 'running' && (
        <div className="mb-3">
          <div className="w-full bg-surface-container-high rounded-full h-2 mb-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="text-xs text-secondary">{progress.done}/{progress.total}</p>
          {progress.errors.length > 0 && (
            <p className="text-xs text-error mt-1">{progress.errors.length} error(s)</p>
          )}
        </div>
      )}
      {status === 'idle' && (
        <button onClick={migrate} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors">
          {t('migration.start', 'Start Migration')}
        </button>
      )}
      {status === 'done' && (
        <p className="text-sm text-success font-medium">{t('migration.complete', 'Migration complete!')} {progress.errors.length > 0 && `${progress.errors.length} failed.`}</p>
      )}
    </div>
  );
}
