import {
  AboutInfo,
  CarouselImage,
  Partner,
  TestimonialOpinion,
} from "@/types/Statics";
import { ParticipantRole, ParticipationStatus } from "@prisma/client";
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import arLocale from "i18n-iso-countries/langs/ar.json";

countries.registerLocale(enLocale);
countries.registerLocale(arLocale);

export const countryList = Object.entries(countries.getNames("ar")).map(
  ([code, name]) => ({
    value: code, // "DZ", "US"..
    label: name,
    labelEn: countries.getName(code, "en")!,
  }),
);

export const SEOKeywords = [
  "بادر",
  "منصة بادر",
  "منصة تطوعية",
  "تطوع",
  "فرص تطوعية",
  "تنظيم العمل التطوعي",
  "مساعدة المحتاجين",
  "التطوع الإلكتروني",
];

const heroCarouselItems: CarouselImage[] = [
  {
    id: 1,
    src: "/images/carousel/carousel-1.jpg",
    alt: "مساعدة المحتاجين",
  },
  {
    id: 2,
    src: "/images/carousel/carousel-2.jpg",
    alt: "مساعدة المتعلمين",
  },
  {
    id: 3,
    src: "/images/carousel/carousel-3.jpg",
    alt: "مساعدة الطبيعة",
  },
];

const aboutInfo: AboutInfo[] = [
  {
    title: "من نحن؟",
    description: (
      <ul className="list-inside list-none space-y-2 text-center">
        <li>
          أول منصة رقمية تطوعية جزائرية متكاملة، تجمع بين المتطوّع، والمحتاج،
          والجهات الخيرية في منظومة واحدة منسّقة تُسهِّل العطاء وتُفعّل الأثر.
        </li>
        <li>
          يُشرف عليها مشروع بُنيان التطوعي، الذي يضمّ نخبة من الشباب من مختلف
          البلدان، يجمعهم هدفٌ واحد: أن يكونوا لبنة في بناء الأمة.
        </li>
      </ul>
    ),
  },
  {
    title: "رؤيتنـا",
    description:
      "نسعى لأن نكون همزة وصل بين الرغبة الصّادقة في العطاء، والحاجة الملحّة في الميدان.",
  },
  {
    title: "غايتنا",
    description:
      "إحياء روح البذل في قلوب الشّباب، وتيسّير سُبل العطاء المنظّم، بما يُثمر ويفيد المحتاجين.",
  },
  {
    title: "رسالتنا",
    description:
      "أن نُنظّم العمل التطوعي ونُفعّله عبر مبادرات نوعية تُطلق طاقات الشباب ليكونوا رُسلَ تأثيرٍ وبُناةَ نهضة.",
  },
  {
    title: "الفئة المستهدفة",
    description: (
      <ul className="list-inside list-disc space-y-2">
        <li>الشباب المسلم المؤمن برسالته.</li>
        <li>الجهات والمبادرات المجتمعية التي تحمل همّ الإصلاح والبذل.</li>
        <li>كلّ فئةٍ محتاجة تنتظر يدًا تمتدّ بالعون.</li>
      </ul>
    ),
  },
  {
    title: "دليل المنصة",
    description:
      "دليلك لتنظيم العمل التطوعي، من التسجيل واختيار المبادرات، إلى المشاركة وصناعة الأثر بطرق سهلة ومنظّمة.",
  },
];

// Sample Ratings
const sampleRatings: TestimonialOpinion[] = [
  {
    id: 1,
    userName: "أحمد",
    initiative: "مخيم أبجديات البيانات",
    comment:
      "شكرا لكم  اذا كانت هناك مخيمات قادمة في تحليل البيانات كون مناصب العمل حسب بحثي الى حد ما قليلة و تتطلب خبرة مسبقة أن يكون هناك لقاء مع شخص لديه خبرة فريلانس في هذا المجال و كيف نحصل على عملاء من داخل و خارج الجزائر",
  },
  {
    id: 2,
    userName: "بوكوش عبد الحكيم",
    initiative: "مبادرة فالتمسوا علما",
    comment: `كانت أفضل دورة شاملة ومرافقة للطالب، غنية بكل ما يهم الطالب في دراسته ومليئة بالأفكار وغيرها من الإضافات، وكانت مبادرة في القمة سباقة للخير وكسب الحسنات ودعوات الخير لا المال. فلكم ألف تحية مني ودعوة خير من القلب إليكم فجزاكم الله عني وعنّا كل خير، وسدد خطاكم وأعانكم الله في خيركم دمتم ذخرا للأمة.`,
  },
  {
    id: 3,
    userName: "مالاك",
    initiative: "مبادرة أينع",
    comment: `ابنتي سعيدة جدا بالمشاركة في مبادرة أينع وتنتظر اللقاء التفاعلي بشوق.
الأطفال المشاركين في اللقاء ما شاء الله فصاحة وعلم وقرآن وأدب يعطينا أملا في الجيل القادم.`,
  },
];

const partners: Partner[] = [
  {
    imageSrc: "/images/bunian-logo-nbg.png",
    name: "بنيان",
  },
];

const targetAudienceOptions = [
  { value: "helpers", label: "متطوعون" },
  { value: "participants", label: "مستفيدون" },
  { value: "both", label: "كلاهما" },
];

const participationRoleOptions = [
  { value: ParticipantRole.manager, label: "مُنظِّم" },
  { value: ParticipantRole.helper, label: "مساعد" },
  { value: ParticipantRole.participant, label: "مشارك" },
];

const participationStatusOptions = [
  { value: "all", label: "جميع الحالات" },
  { value: ParticipationStatus.approved, label: "تمت الموافقة" },
  { value: ParticipationStatus.registered, label: "قيد المراجعة" },
  { value: ParticipationStatus.rejected, label: "مرفوض" },
  { value: ParticipationStatus.kicked, label: "مطرود" },
];

const statusOptions = [
  { value: "all", label: "جميع الحالات" },
  { value: "published", label: "منشورة" },
  { value: "ongoing", label: "جارية" },
  { value: "completed", label: "مكتملة" },
];

const organizerTypeOptions = [
  { value: "all", label: "جميع المنظمين" },
  { value: "user", label: "أفراد" },
  { value: "organization", label: "منظمات" },
];

export {
  heroCarouselItems,
  sampleRatings,
  partners,
  aboutInfo,
  targetAudienceOptions,
  statusOptions,
  organizerTypeOptions,
  participationRoleOptions,
  participationStatusOptions,
};
