import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SITE_NAME, SITE_DOMAIN, SUPPORT_EMAIL } from "@/lib/site";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { title: `${locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"} — ${SITE_NAME}` };
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-display text-ink-text mt-7 mb-2">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-ink-text2 leading-relaxed mb-3">{children}</p>
);
const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc ps-5 text-sm text-ink-text2 leading-relaxed space-y-1.5 mb-3">{children}</ul>
);
const B = ({ children }: { children: React.ReactNode }) => (
  <strong className="text-ink-text font-medium">{children}</strong>
);

export default async function PrivacyPage() {
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const ar = locale === "ar";

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20">
      <h1 className="text-2xl sm:text-3xl font-display text-ink-text">
        {ar ? "سياسة الخصوصية" : "Privacy Policy"}
      </h1>
      <p className="text-sm text-ink-text3 mt-1 mb-6 border-b border-ink-border pb-4">
        {ar ? "آخر تحديث 3 يونيو 2026" : "Last updated June 3, 2026"}
      </p>

      {ar ? (
        <>
          <P>
            تدير {SITE_NAME} («نحن») منصة الكتابة على {SITE_DOMAIN}. توضح هذه السياسة ما نجمعه،
            وكيف نستخدمه، والأطراف الثالثة المعنية &mdash; بما في ذلك مزوّدو الذكاء الاصطناعي
            الذين يعالجون النص الذي تكتبه.
          </P>

          <H>1. المعلومات التي نجمعها</H>
          <UL>
            <li><B>الحساب.</B> عند إنشاء حساب، نخزّن بريدك الإلكتروني واسم العرض. وتُحفظ كلمة المرور بصيغة تجزئة bcrypt مملّحة فقط &mdash; ولا نخزّنها أبدًا كنص صريح.</li>
            <li><B>محتواك.</B> القصص والفصول والشخصيات والعوالم والملاحظات وصور الأغلفة التي تنشئها أو ترفعها.</li>
            <li><B>بيانات الاستخدام.</B> سجلات إجراءات الذكاء الاصطناعي التي تشغّلها (المزوّد والنموذج والتوقيت وأعداد الرموز المميزة ومقتطفات قصيرة)، واستخدام المزايا، وبيانات أساسية عن السجلات والأجهزة.</li>
            <li><B>الفوترة.</B> فئة اشتراكك وحالته. تُعالَج المدفوعات عبر تاجر التسجيل لدينا، Polar &mdash; ولا نتلقى تفاصيل بطاقتك كاملة ولا نخزّنها.</li>
          </UL>

          <H>2. مزايا الذكاء الاصطناعي ومزوّدو النماذج اللغوية الخارجيون</H>
          <P>
            عند استخدام أي ميزة ذكاء اصطناعي (الكتابة في التدفق، مرافق الكتابة، تدقيق القصة،
            استوديو صوت الشخصية، وما شابهها)، يُرسَل النص الذي تقدّمه &mdash; <B>بما في ذلك محتوى
            قصتك والتوجيهات (prompts)</B> &mdash; إلى مزوّدي ذكاء اصطناعي ونماذج لغوية كبيرة من
            أطراف ثالثة (مثل DeepSeek وغيرهم من المزوّدين المتوافقين مع OpenAI) لتوليد رد.
          </P>
          <UL>
            <li>يعالج هؤلاء المزوّدون محتواك وفق شروط الخصوصية والاحتفاظ <B>الخاصة بهم</B>، التي لا نتحكم فيها. ولا نرسل إلا ما تتطلبه الميزة.</li>
            <li>نحتفظ بسجل لكل طلب ذكاء اصطناعي (البيانات الوصفية أعلاه، إضافة إلى مقتطفات مبتورة) لأغراض الموثوقية ومنع إساءة الاستخدام ودقة الفوترة وسجل استخدامك الخاص.</li>
            <li>نحن لا نبيع محتواك، ولا نستخدمه لتدريب نماذجنا الخاصة.</li>
          </UL>

          <H>3. «استخدم مفتاحك الخاص» (BYOK)</H>
          <P>
            إذا استخدمت مفتاح API الخاص بمزوّدك (BYOK)، فإن طلبات الذكاء الاصطناعي الخاصة بك
            تظل <B>ممرَّرة عبر خوادم G-Ink</B> &mdash; فهكذا نجمّع التوجيهات وندير سياق القصة
            ونطبّق إجراءات السلامة ونسجّل الاستخدام. وبناءً على ذلك:
          </P>
          <UL>
            <li>نعالج وقد نسجّل نفس <B>البيانات الوصفية</B> للطلب (والمحتوى بشكل عابر) كما نفعل مع نماذجنا المدمجة.</li>
            <li>مفتاح API الخاص بك <B>مشفّر عند التخزين</B> ويُستخدم فقط لإجراء المكالمات نيابة عنك.</li>
            <li>تظل مسؤولًا عن تكاليف مزوّدك وتلتزم بشروط مزوّدك.</li>
          </UL>

          <H>4. كيف نستخدم المعلومات</H>
          <P>
            لتقديم الخدمة وتشغيلها، وتوليد مساعدات الذكاء الاصطناعي، وتطبيق حدود الخطط، ومنع
            إساءة الاستخدام والاحتيال، ومعالجة الاشتراكات، والتواصل معك بشأن حسابك، والامتثال
            للالتزامات القانونية.
          </P>

          <H>5. الأطراف الثالثة التي نشارك البيانات معها</H>
          <UL>
            <li><B>Polar</B> &mdash; مدفوعات الاشتراك، بصفتها تاجر التسجيل.</li>
            <li><B>مزوّدو الذكاء الاصطناعي والنماذج اللغوية</B> (مثل DeepSeek والمزوّدين المتوافقين مع OpenAI) &mdash; لتوليد ردود الذكاء الاصطناعي، على النحو الموضح في القسم 2.</li>
            <li><B>Cloudflare</B> &mdash; تقديم المحتوى والأمان.</li>
          </UL>
          <P>نحن لا نبيع معلوماتك الشخصية.</P>

          <H>6. ملفات تعريف الارتباط والجلسات</H>
          <P>نُبقيك مسجّل الدخول عبر رمز جلسة مخزّن في متصفحك. ولا نستخدم ملفات تعريف ارتباط إعلانية.</P>

          <H>7. الاحتفاظ بالبيانات وحذفها</H>
          <P>
            نحتفظ بحسابك ومحتواك ما دام حسابك نشطًا. ويمكنك تعديل قصصك أو حذفها في أي وقت
            وتصدير أعمالك. لحذف حسابك والبيانات المرتبطة به، تواصل معنا؛ وقد تُحتفظ ببعض السجلات
            حيثما تقتضي ذلك أسباب قانونية أو أمنية أو متعلقة بالفوترة.
          </P>

          <H>8. حقوقك</H>
          <P>
            بحسب مكان إقامتك، قد تكون لك حقوق في الوصول إلى بياناتك الشخصية أو تصحيحها أو
            تصديرها أو حذفها. ويمكنك ممارسة كثير من هذه الحقوق داخل التطبيق، أو بالتواصل معنا.
          </P>

          <H>9. الأمان</H>
          <P>
            نحمي البيانات أثناء النقل باستخدام TLS ونشفّر الأسرار الحساسة (مثل مفاتيح BYOK) عند
            التخزين. ولا توجد وسيلة نقل أو تخزين آمنة تمامًا، ولا يمكننا ضمان أمان مطلق.
          </P>

          <H>10. المعالجة الدولية</H>
          <P>
            قد نعالج نحن ومزوّدونا بياناتك في بلدان غير بلدك، بما في ذلك الأماكن التي يعمل فيها
            مزوّدو الذكاء الاصطناعي والبنية التحتية لدينا.
          </P>

          <H>11. الأطفال</H>
          <P>
            G-Ink غير موجّه للأطفال دون سن 13 عامًا (أو الحد الأدنى للسن المطلوب في بلدك)، ولا
            نجمع بياناتهم عن علم.
          </P>

          <H>12. التغييرات على هذه السياسة</H>
          <P>
            قد نحدّث هذه السياسة من حين لآخر. وسنحدّث تاريخ «آخر تحديث» أعلاه، وسنُخطرك داخل
            التطبيق في حال التغييرات الجوهرية.
          </P>

          <H>13. التواصل</H>
          <P>
            هل لديك أسئلة حول هذه السياسة؟ راسلنا على{" "}
            <a className="text-ink-gold hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </P>
        </>
      ) : (
        <>
          <P>
            {SITE_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates the writing
            platform at {SITE_DOMAIN}. This policy explains what we collect, how we use it, and the
            third parties involved &mdash; including the AI providers that process the text you write.
          </P>

          <H>1. Information we collect</H>
          <UL>
            <li><B>Account.</B> When you sign up, we store your email and display name. Your password is kept only as a salted bcrypt hash &mdash; we never store it in plain text.</li>
            <li><B>Your content.</B> The stories, chapters, characters, worlds, notes, and cover images you create or upload.</li>
            <li><B>Usage data.</B> Records of the AI actions you run (provider, model, timing, token counts, and short excerpts), feature usage, and basic log/device data.</li>
            <li><B>Billing.</B> Your subscription tier and status. Payments are processed by our Merchant of Record, Polar &mdash; we never receive or store your full card details.</li>
          </UL>

          <H>2. AI features &amp; third-party LLM providers</H>
          <P>
            When you use any AI feature (Flow writing, Writing Companion, Story Check, Character Voice
            Studio, and similar), the text you provide &mdash; <B>including your story content and prompts</B>{" "}
            &mdash; is transmitted to third-party AI / large-language-model providers (such as DeepSeek and
            other OpenAI-compatible providers) so they can generate a response.
          </P>
          <UL>
            <li>These providers process your content under <B>their own</B> privacy and retention terms, which we do not control. We send only what the feature requires.</li>
            <li>We keep a log of each AI request (the metadata above, plus truncated excerpts) for reliability, abuse prevention, billing accuracy, and your own usage history.</li>
            <li>We do <B>not</B> sell your content, and we do <B>not</B> use your content to train our own models.</li>
          </UL>

          <H>3. &ldquo;Bring Your Own Key&rdquo; (BYOK)</H>
          <P>
            If you use your own provider API key (BYOK), your AI requests are still <B>routed through
            G-Ink&rsquo;s servers</B> &mdash; that is how we assemble prompts, manage story context, apply
            safety measures, and record usage. As a result:
          </P>
          <UL>
            <li>We process and may log the same request <B>metadata</B> (and transiently the content) as we do for our built-in models.</li>
            <li>Your API key is <B>encrypted at rest</B> and used only to make calls on your behalf.</li>
            <li>You remain responsible for your provider&rsquo;s costs and are bound by your provider&rsquo;s terms.</li>
          </UL>

          <H>4. How we use information</H>
          <P>
            To provide and operate the service, generate AI assistance, enforce plan limits, prevent
            abuse and fraud, process subscriptions, communicate with you about your account, and comply
            with legal obligations.
          </P>

          <H>5. Third parties we share data with</H>
          <UL>
            <li><B>Polar</B> &mdash; subscription payments, as Merchant of Record.</li>
            <li><B>AI / LLM providers</B> (e.g. DeepSeek and OpenAI-compatible providers) &mdash; to generate AI responses, as described in section 2.</li>
            <li><B>Cloudflare</B> &mdash; content delivery and security.</li>
          </UL>
          <P>We do not sell your personal information.</P>

          <H>6. Cookies &amp; sessions</H>
          <P>We keep you signed in with a session token stored in your browser. We do not use advertising cookies.</P>

          <H>7. Data retention &amp; deletion</H>
          <P>
            We keep your account and content while your account is active. You can edit or delete your
            stories at any time and export your work. To delete your account and associated data, contact
            us; some records may be retained where required for legal, security, or billing reasons.
          </P>

          <H>8. Your rights</H>
          <P>
            Depending on where you live, you may have rights to access, correct, export, or delete your
            personal data. You can exercise many of these in-app, or by contacting us.
          </P>

          <H>9. Security</H>
          <P>
            We protect data in transit with TLS and encrypt sensitive secrets (such as BYOK keys) at
            rest. No method of transmission or storage is completely secure, and we cannot guarantee
            absolute security.
          </P>

          <H>10. International processing</H>
          <P>
            We and our providers may process your data in countries other than your own, including where
            our AI providers and infrastructure operate.
          </P>

          <H>11. Children</H>
          <P>
            G-Ink is not directed to children under 13 (or the minimum age required in your country), and
            we do not knowingly collect their data.
          </P>

          <H>12. Changes to this policy</H>
          <P>
            We may update this policy from time to time. We will revise the &ldquo;last updated&rdquo;
            date above and, for material changes, notify you in-app.
          </P>

          <H>13. Contact</H>
          <P>
            Questions about this policy? Email us at{" "}
            <a className="text-ink-gold hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </P>
        </>
      )}
    </main>
  );
}
