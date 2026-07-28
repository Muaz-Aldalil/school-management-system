import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useSchool } from '../context/SchoolContext';
import { Upload, CheckCircle, XCircle } from 'lucide-react';

export default function BulkImport({ onImported }) {
  const toast = useToast();
  const { t } = useLanguage();
  const { schoolId } = useSchool();
  const fileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast(t('bulkImport.csvHeader')); setImporting(false); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h === 'name');
      const classIdx = headers.findIndex(h => h === 'class');
      const gradeIdx = headers.findIndex(h => h === 'grade');
      if (nameIdx === -1 || classIdx === -1 || gradeIdx === -1) {
        toast(t('bulkImport.csvColumns')); setImporting(false); return;
      }

      const students = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          name: cols[nameIdx],
          class: cols[classIdx],
          grade: cols[gradeIdx],
          email: cols[headers.findIndex(h => h === 'email')] || null,
          parent: cols[headers.findIndex(h => h === 'parent')] || null,
          phone: cols[headers.findIndex(h => h === 'phone')] || null,
          status: 'Active',
          school_id: schoolId,
        };
      }).filter(s => s.name);

      const { data, error } = await supabase.from('students').insert(students).select();
      if (error) throw error;

      setResult({ success: data.length, failed: 0 });
      toast(t('bulkImport.imported', { count: data.length }));
      onImported?.();
    } catch (err) {
      const msg = err?.message?.includes('duplicate') ? t('bulkImport.duplicateExists') : t('bulkImport.importFailed');
      toast(msg);
      setResult({ success: 0, failed: 1 });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input ref={fileRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" id="bulk-import" />
      <label htmlFor="bulk-import" className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg text-sm font-semibold text-secondary hover:bg-surface-container-low transition-colors cursor-pointer">
        {importing ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
        {importing ? t('bulkImport.importing') : t('bulkImport.importCSV')}
      </label>
      {result && (
        <span className="text-xs text-secondary flex items-center gap-1">
          {result.success > 0 && <><CheckCircle className="w-3 h-3 text-tertiary" /> {t('bulkImport.imported', { count: result.success })}</>}
          {result.failed > 0 && <><XCircle className="w-3 h-3 text-error" /> {t('bulkImport.failed')}</>}
        </span>
      )}
    </div>
  );
}
