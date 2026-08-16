-- Arabic-only migration: rewrite landing_content for hero / about / honor_board.
--
-- These rows were stored as plain English strings from the old (English-first)
-- data model, so the Arabic-only UI rendered English. This rewrites them as
-- {ar, en} objects with the canonical Arabic text in `ar` (the original English
-- preserved in the dormant `en` field). Idempotent — safe to run repeatedly.
--
-- Run this in the Supabase SQL editor.

INSERT INTO landing_content (key, content) VALUES
('hero', '{"title":{"ar":"مدرسه العامريه","en":"Al-Amiriya School"},"subtitle":{"ar":"نرعى العقول، نبني المستقبل","en":"Nurturing minds and building a future where every student excels."},"cta_text":{"ar":"اعرف المزيد","en":"Learn More"},"cta_link":"#about","video_url":"","image_url":"","stats":[{"value":1245,"label":{"ar":"الطلاب","en":"Students"}},{"value":85,"label":{"ar":"المعلمين","en":"Teachers"}},{"value":28,"label":{"ar":"الجوائز","en":"Awards"}},{"value":52,"label":{"ar":"سنوات","en":"Years"}}]}'),
('about', '{"title":{"ar":"عن مدرستنا","en":"About Our School"},"content":{"ar":"توفر مدرسة العامريه التعليم الجيد منذ أكثر من 50 عاماً. نؤمن بتدريب الأفراد المتكاملين من خلال منهج متوازن من الأكاديميين والفنون والرياضية. يعمل مجلسنا المتفاني بجد لإنشاء بيئة داعمة يمكن لكل طالب فيها أن يزدهر.","en":"Al-Amiriya Elementary/Medium School has been providing high-quality education for over 50 years. We believe in caring for integrated individuals through a balanced approach of academic, artistic and sports studies. Our dedicated faculty work tirelessly to create a supportive environment where every student can thrive."},"vision":{"ar":"تمكين كل طالب من تحقيق إمكاناته الكاملة كمتعلم مدى الحياة ومواطن عالمي مسؤول، مزود بالمهارات والشخصية لإحداث تأثير إيجابي في العالم.","en":"Enabling every student to achieve their full potential as a lifelong learner and responsible global citizen, equipped with the skills and personality needed to make a positive impact on the world."},"image_url":"","stats":{"students":1245,"teachers":85,"years":52,"awards":28}}'),
('honor_board', '{"entries":[{"name":{"ar":"أحمد محمد علي","en":"Ahmed Mohammed Ali"},"grade":{"ar":"التاسع","en":"9th"},"class":"9A","score":95,"rank":"الأول","medal":"الميدالية الذهبية"},{"name":{"ar":"سارة عبدالله حسن","en":"Sara Abdullah Hassan"},"grade":{"ar":"التاسع","en":"9th"},"class":"9A","score":81,"rank":"الثاني","medal":"الميدالية الفضية"},{"name":{"ar":"محمد إبراهيم خالد","en":"Mohammed Ibrahim Khaled"},"grade":{"ar":"السادس","en":"6th"},"class":"6B","score":92,"rank":"الثالث","medal":"الميدالية البرونزية"}]}')
ON CONFLICT (key) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
