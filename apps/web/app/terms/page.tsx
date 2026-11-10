import type { Metadata } from "next";
import { cookies } from "next/headers";
import { SITE_NAME, SITE_DOMAIN, SUPPORT_EMAIL } from "@/lib/site";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  return { title: `${locale === "ar" ? "شروط الخدمة" : "Terms of Service"} — ${SITE_NAME}` };
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

export default async function TermsPage() {
  const locale = normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  const ar = locale === "ar";

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20">
      <h1 className="text-2xl sm:text-3xl font-display text-ink-text">
        {ar ? "شروط الخدمة" : "Terms of Service"}
      </h1>
      <p className="text-sm text-ink-text3 mt-1 mb-6 border-b border-ink-border pb-4">
        {ar ? "آخر تحديث 3 يونيو 2026" : "Last updated June 3, 2026"}
      </p>

      {ar ? (
        <>
          <P>
            تحكم هذه الشروط استخدامك لمنصة الكتابة {SITE_NAME} على {SITE_DOMAIN} («نحن»). وبإنشاء
            حساب أو باستخدام الخدمة، فإنك توافق على هذه الشروط وعلى{" "}
            <a className="text-ink-gold hover:underline" href="/privacy">سياسة الخصوصية</a> الخاصة بنا.
          </P>

          <H>1. الأهلية وحسابك</H>
          <P>
            يجب أن يكون عمرك 13 عامًا على الأقل (أو الحد الأدنى للسن في بلدك) لاستخدام G-Ink. وأنت
            مسؤول عن حسابك، وعن الحفاظ على أمان تسجيل دخولك، وعن النشاط الذي يجري من خلاله.
          </P>

          <H>2. محتواك وملكيته</H>
          <P>
            <B>أنت تملك المحتوى الذي تنشئه.</B> تحتفظ بجميع الحقوق في القصص والشخصيات والمواد
            الأخرى التي تكتبها أو ترفعها. وتمنح G-Ink ترخيصًا محدودًا وغير حصري لتخزين ذلك المحتوى
            ومعالجته وعرضه ونسخه احتياطيًا لغرض تشغيل الخدمة لك فقط (بما في ذلك إرساله إلى مزوّدي
            الذكاء الاصطناعي عند استخدامك لمزايا الذكاء الاصطناعي، وإظهاره للقرّاء عند اختيارك النشر).
          </P>

          <H>3. مخرجات الذكاء الاصطناعي</H>
          <UL>
            <li>تُولَّد مساعدات الذكاء الاصطناعي بواسطة نماذج خارجية و<B>قد تكون غير دقيقة أو متحيزة أو غير مناسبة</B>. وأنت مسؤول عن مراجعة أي مخرجات للذكاء الاصطناعي وتقرير كيفية استخدامها.</li>
            <li>يجب أن تمتلك الحقوق في أي نص تقدّمه إلى مزايا الذكاء الاصطناعي.</li>
            <li>تُقدَّم مخرجات الذكاء الاصطناعي إليك لاستخدامها في عملك؛ ولا ندّعي أي ملكية عليها، ولا يمكننا ضمان أنها فريدة أو خالية من حقوق الأطراف الثالثة.</li>
          </UL>

          <H>4. الاستخدام المقبول</H>
          <P>توافق على عدم استخدام G-Ink من أجل:</P>
          <UL>
            <li>إنشاء أو نشر محتوى غير قانوني أو منتهك للحقوق أو ضار، أو محتوى يخالف حقوق الآخرين؛</li>
            <li>إساءة استخدام الخدمة أو إثقالها أو كشطها، أو محاولة التحايل عليها أو على حدودها أو أمنها؛</li>
            <li>إعادة بيع الخدمة أو تحريفها، أو استخدامها لبناء نموذج منافس من مخرجاتنا.</li>
          </UL>

          <H>5. الخطط والفوترة والإلغاء</H>
          <UL>
            <li><B>الخطة المجانية</B> تتضمن رصيدًا محدودًا لمرة واحدة من إجراءات الذكاء الاصطناعي؛ والكتابة اليدوية مجانية دائمًا.</li>
            <li><B>بلس</B>: اشتراك شهري مدفوع يستخدم نماذج G-Ink المدمجة ضمن رصيد شهري.</li>
            <li><B>استخدم مفتاحك الخاص (BYOK)</B>: اشتراك شهري مدفوع يعمل فيه الذكاء الاصطناعي على مفاتيح مزوّدك الخاص.</li>
            <li>تُفوتر الاشتراكات وتُحصَّل بواسطة <B>Polar</B>، تاجر التسجيل لدينا، و<B>تُجدَّد تلقائيًا</B> كل فترة حتى الإلغاء.</li>
            <li>يمكنك الإلغاء في أي وقت؛ ويستمر الوصول حتى نهاية الفترة المدفوعة الحالية. وباستثناء ما يقتضيه القانون، لا تُردّ المدفوعات.</li>
            <li>قد تتغير الأسعار وحدود الخطط؛ وسنُخطرك بالتغييرات الجوهرية.</li>
          </UL>

          <H>6. استخدم مفتاحك الخاص</H>
          <P>
            مع BYOK، أنت مسؤول عن حساب مزوّدك وتكاليفه وشروطه. وتُمرَّر طلباتك عبر G-Ink وتُسجَّل
            لديها على النحو الموضح في{" "}
            <a className="text-ink-gold hover:underline" href="/privacy">سياسة الخصوصية</a>. ولا نتحمل
            مسؤولية انقطاعات مزوّدي الأطراف الثالثة أو رسومهم أو سياسات محتواهم.
          </P>

          <H>7. النشر</H>
          <P>
            إذا نشرت عملًا، فسيصبح مرئيًا لمستخدمين وقرّاء آخرين على المنصة. وأنت مسؤول عما تنشره
            وتؤكد أنك تملك حقوق مشاركته. ويمكنك إلغاء النشر في أي وقت.
          </P>

          <H>8. الإنهاء</H>
          <P>
            يمكنك التوقف عن استخدام G-Ink وحذف حسابك في أي وقت. وقد نعلّق الوصول أو ننهيه في حال
            مخالفة هذه الشروط أو لحماية الخدمة أو المستخدمين الآخرين.
          </P>

          <H>9. إخلاء المسؤولية</H>
          <P>
            تُقدَّم الخدمة <B>«كما هي»</B> دون ضمانات من أي نوع. ولا نضمن أن تكون الخدمة أو مزايا
            الذكاء الاصطناعي متواصلة أو خالية من الأخطاء أو مناسبة لغرض معين.
          </P>

          <H>10. حدود المسؤولية</H>
          <P>
            إلى أقصى حد يسمح به القانون، لن تكون G-Ink مسؤولة عن الأضرار غير المباشرة أو العرضية أو
            التبعية، أو عن فقدان البيانات أو الأرباح. وتقتصر مسؤوليتنا الإجمالية عن أي مطالبة على
            المبلغ الذي دفعته لنا خلال الأشهر الاثني عشر السابقة للمطالبة.
          </P>

          <H>11. التغييرات على هذه الشروط</H>
          <P>
            قد نحدّث هذه الشروط؛ وسنحدّث تاريخ «آخر تحديث» وسنُخطرك داخل التطبيق في حال التغييرات
            الجوهرية. ويُعدّ استمرارك في الاستخدام بعد التغييرات قبولًا لها.
          </P>

          <H>12. التواصل</H>
          <P>
            هل لديك أسئلة حول هذه الشروط؟ راسلنا على{" "}
            <a className="text-ink-gold hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </P>
        </>
      ) : (
        <>
          <P>
            These Terms govern your use of the {SITE_NAME} writing platform at {SITE_DOMAIN}
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the
            service, you agree to these Terms and to our{" "}
            <a className="text-ink-gold hover:underline" href="/privacy">Privacy Policy</a>.
          </P>

          <H>1. Eligibility &amp; your account</H>
          <P>
            You must be at least 13 (or the minimum age in your country) to use G-Ink. You are responsible
            for your account, for keeping your sign-in secure, and for activity that happens under it.
          </P>

          <H>2. Your content &amp; ownership</H>
          <P>
            <B>You own the content you create.</B> You keep all rights to the stories, characters, and
            other material you write or upload. You grant G-Ink a limited, non-exclusive license to store,
            process, display, and back up that content solely to operate the service for you (including
            sending it to AI providers when you use AI features, and showing it to readers when you choose
            to publish).
          </P>

          <H>3. AI output</H>
          <UL>
            <li>AI assistance is generated by third-party models and <B>may be inaccurate, biased, or unsuitable</B>. You are responsible for reviewing and deciding how to use any AI output.</li>
            <li>You must have the rights to any text you submit to the AI features.</li>
            <li>AI output is provided to you to use in your work; we make no ownership claim over it, and we cannot guarantee it is unique or free of third-party rights.</li>
          </UL>

          <H>4. Acceptable use</H>
          <P>You agree not to use G-Ink to:</P>
          <UL>
            <li>create or publish unlawful, infringing, or harmful content, or content that violates others&rsquo; rights;</li>
            <li>abuse, overload, scrape, or attempt to circumvent the service, its limits, or its security;</li>
            <li>resell or misrepresent the service, or use it to build a competing model from our outputs.</li>
          </UL>

          <H>5. Plans, billing &amp; cancellation</H>
          <UL>
            <li><B>Free</B> includes a limited, one-time allowance of AI actions; manual writing is always free.</li>
            <li><B>Plus</B> is a paid monthly subscription that uses G-Ink&rsquo;s built-in models within a monthly allowance.</li>
            <li><B>Bring Your Own Key (BYOK)</B> is a paid monthly subscription where AI runs on your own provider keys.</li>
            <li>Subscriptions are billed and collected by <B>Polar</B>, our Merchant of Record, and <B>renew automatically</B> each period until cancelled.</li>
            <li>You can cancel anytime; access continues until the end of the current paid period. Except where required by law, payments are non-refundable.</li>
            <li>Prices and plan limits may change; we&rsquo;ll give notice of material changes.</li>
          </UL>

          <H>6. Bring Your Own Key</H>
          <P>
            With BYOK you are responsible for your own provider account, its costs, and its terms. Your
            requests are routed through and logged by G-Ink as described in the{" "}
            <a className="text-ink-gold hover:underline" href="/privacy">Privacy Policy</a>. We are not
            responsible for third-party provider outages, charges, or content policies.
          </P>

          <H>7. Publishing</H>
          <P>
            If you publish a work, it becomes visible to other users and readers on the platform. You are
            responsible for what you publish and confirm you have the rights to share it. You can
            unpublish at any time.
          </P>

          <H>8. Termination</H>
          <P>
            You may stop using G-Ink and delete your account at any time. We may suspend or terminate
            access for violations of these Terms or to protect the service or other users.
          </P>

          <H>9. Disclaimers</H>
          <P>
            The service is provided <B>&ldquo;as is&rdquo;</B> without warranties of any kind. We do not
            guarantee that the service or AI features will be uninterrupted, error-free, or fit for a
            particular purpose.
          </P>

          <H>10. Limitation of liability</H>
          <P>
            To the maximum extent permitted by law, G-Ink will not be liable for indirect, incidental, or
            consequential damages, or for loss of data or profits. Our total liability for any claim is
            limited to the amount you paid us in the 12 months before the claim.
          </P>

          <H>11. Changes to these Terms</H>
          <P>
            We may update these Terms; we will revise the &ldquo;last updated&rdquo; date and, for
            material changes, notify you in-app. Continued use after changes means you accept them.
          </P>

          <H>12. Contact</H>
          <P>
            Questions about these Terms? Email{" "}
            <a className="text-ink-gold hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </P>
        </>
      )}
    </main>
  );
}
