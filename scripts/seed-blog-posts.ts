import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface BlogPostSeedData {
  slug: string;
  title: { en: string; ar: string };
  excerpt: { en: string; ar: string };
  content: { en: string; ar: string };
  coverImage: string;
  metaTitle: { en: string; ar: string };
  metaDescription: { en: string; ar: string };
  tags: string[];
  status: 'published' | 'draft';
  authorName: string;
  publishedAt: Date;
  viewsCount: number;
}

const demoBlogPosts: BlogPostSeedData[] = [
  {
    slug: 'guide-to-choosing-builtin-kitchen-appliances',
    title: {
      ar: 'دليلك الشامل لاختيار أجهزة المطبخ البلت إن (Built-in) المناسبة لمنزلك',
      en: 'The Ultimate Guide to Choosing Built-In Kitchen Appliances for Your Home',
    },
    excerpt: {
      ar: 'تعرف على أهم النصائح والمعايير لاختيار أفران ومسطحات وشفاطات البلت إن، وكيفية استغلال مساحات المطبخ بأناقة وكفاءة عالية.',
      en: 'Discover key tips and standards for choosing built-in ovens, hobs, and hoods, and how to maximize your kitchen space with elegance and efficiency.',
    },
    content: {
      ar: `
<div class="blog-content">
  <p class="lead">أصبحت أجهزة المطبخ المدمجة (البلت إن) الخيار المفضل في تصميم المطابخ الحديثة، ليس فقط لمظهرها الأنيق المتناسق، بل أيضاً لقدرتها على توفير المساحات واستغلال كل سنتيمتر في مطبخك بأفضل صورة ممكنة.</p>

  <h2>لماذا تختار أجهزة المطبخ البلت إن؟</h2>
  <p>توفر الأجهزة المدمجة العديد من المزايا العملية والجمالية التي تجعلها استثماراً ذكياً لمنزلك:</p>
  <ul>
    <li><strong>المظهر العصري المتكامل:</strong> تختفي الأجهزة داخل الخزائن لتمنح المطبخ طابعاً انسيابياً ومتناغماً.</li>
    <li><strong>سهولة التنظيف:</strong> انعدام الفراغات والشقوق بين الأجهزة والخزائن يمنع تراكم الدهون وبقايا الطعام.</li>
    <li><strong>استغلال المساحات:</strong> إمكانية تثبيت الفرن أو الميكروويف في مستوى العين لسهولة المراقبة دون الحاجة للانحناء.</li>
  </ul>

  <h2>كيف تختار المسطح المدمج (Hob)؟</h2>
  <p>المسطح هو قلب المطبخ ومركز إعداد الوجبات اليومية، وتتعدد خياراته بحسب مصدر الطاقة:</p>
  <ul>
    <li><strong>مسطحات الغاز (Gas Hobs):</strong> الخيار الأكثر شعبية للطهاة ومحبي الطهي السريع، تتيح تحكماً فورياً في درجة الحرارة. احرص دائماً على اختيار مسطح مزود بـ <em>صمام أمان كامل</em> يقطع الغاز تلقائياً في حال انطفاء الشعلة.</li>
    <li><strong>مسطحات السيراميك والكهرباء (Ceramic & Induction):</strong> تتميز بسطح أملس سهل التنظيف تماماً ومظهر جذاب، وتعتبر مسطحات الحث الكهرومغناطيسي (Induction) الأسرع والأكثر أماناً حيث تسخن أواني الطهي مباشرة دون تسخين السطح نفسه.</li>
  </ul>

  <h2>اختيار الفرن المدمج (Built-in Oven)</h2>
  <p>قبل الشراء، حدد أبعاد كابينة المطبخ بدقة (الأبعاد القياسية عادة 60 سم أو 90 سم). قارن بين أفران الكهرباء وأفران الغاز:</p>
  <ul>
    <li><strong>الفرن الكهربائي المزود بمروحة توزيع حراري (Convection Fan):</strong> يمنحك أفضل نتائج لخبز المعجنات والتحمير المتساوي بفضل توزيع الحرارة المنتظم.</li>
    <li><strong>البرامج الذكية ووظيفة التنظيف الذاتي (Catalytic / Pyrolytic):</strong> توفر عليك عناء الفرك اليدوي وتذيب الدهون الملتصقة بالحرارة العالية.</li>
  </ul>

  <h2>شفاط المطبخ: الرئة الصامتة لمطبخك</h2>
  <p>اختيار الشفاط بقدرة سحب مناسبة (m³/h) ضروري للتخلص من الروائح والأبخرة. كقاعدة عامة، يجب أن يكون الشفاط قادراً على تجديد هواء المطبخ بمعدل 10 إلى 12 مرة في الساعة. كما يمكنك الاختيار بين الشفاط الهرمي الكلاسيكي، أو التلسكوبي المخفي، أو المسطح الزجاجي المائل المودرن.</p>

  <blockquote>
    <strong>نصيحة ذهبية:</strong> استشر فني التركيبات قبل تفصيل وتصنيع خزائن المطبخ للحصول على كراسة المقاسات الهندسية (Cut-out Dimensions) المعتمدة لكل جهاز، وتأكد من تجهيز التوصيلات الكهربائية وأنابيب الغاز وفق المواصفات القياسية.
  </blockquote>
</div>`,
      en: `
<div class="blog-content">
  <p class="lead">Built-in appliances have become the premier choice for modern kitchen architecture, offering not only a sleek, unified appearance but also optimal space utilization and seamless functionality.</p>

  <h2>Why Choose Built-In Kitchen Appliances?</h2>
  <p>Integrated appliances provide both functional and aesthetic benefits that elevate your daily culinary experience:</p>
  <ul>
    <li><strong>Streamlined Modern Aesthetics:</strong> Appliances blend into cabinetry to create a clean, cohesive look.</li>
    <li><strong>Effortless Cleaning:</strong> No tight crevices between units means grease and crumbs have nowhere to hide.</li>
    <li><strong>Ergonomic Layouts:</strong> Wall-mounted ovens place baking trays right at eye level, sparing your back.</li>
  </ul>

  <h2>Selecting the Right Built-in Hob</h2>
  <p>Your cooktop is the core of your cooking space. Choose according to your culinary lifestyle:</p>
  <ul>
    <li><strong>Gas Hobs:</strong> Prized for instant responsive heat control. Always look for full flame-failure safety valves that instantly shut off the gas if the flame blows out.</li>
    <li><strong>Induction & Ceramic Hobs:</strong> Ultra-sleek glass surfaces that wipe clean in seconds. Induction hobs offer unmatched speed and energy efficiency by heating magnetic cookware directly.</li>
  </ul>

  <h2>Built-in Ovens: Gas vs. Electric</h2>
  <p>Standard oven cut-outs generally come in 60cm and 90cm widths. Convection fan-assisted electric ovens provide superior even baking, precise digital temperatures, and advanced self-cleaning cycles (catalytic or pyrolytic).</p>

  <h2>Cooker Hoods: Keeping Your Kitchen Air Fresh</h2>
  <p>A hood's extraction capacity (m³/h) should refresh your kitchen air 10 to 12 times per hour. Choose from chimney, telescopic slide-out, or angled tempered-glass designs based on your layout and ventilation ducting.</p>

  <blockquote>
    <strong>Pro Tip:</strong> Always consult the manufacturer's cut-out specification sheets before finalizing cabinet carpentry, ensuring adequate ventilation gaps and dedicated electrical lines.
  </blockquote>
</div>`,
    },
    coverImage: 'https://api.hagatnaa.com/images/blog/demo/builtin-kitchen.jpg',
    metaTitle: {
      ar: 'دليلك الشامل لاختيار أجهزة المطبخ البلت إن | مدونة حاجاتنا',
      en: 'The Ultimate Guide to Built-in Kitchen Appliances | Hagatna Blog',
    },
    metaDescription: {
      ar: 'كل ما تحتاج معرفته قبل شراء أجهزة البلت إن لمطبخك: الأفران والمسطحات والشفاطات مع نصائح توفير المساحة وأمان الغاز والكهرباء.',
      en: 'Discover how to choose the best built-in kitchen appliances: ovens, hobs, and hoods with smart layout and energy tips.',
    },
    tags: ['أجهزة المطبخ', 'بلت إن', 'نصائح منزلية', 'أفران ومسطحات', 'ديكور'],
    status: 'published',
    authorName: 'م. أحمد فؤاد — خبير التجهيزات المنزلية',
    publishedAt: new Date('2026-09-20T10:00:00.000Z'),
    viewsCount: 428,
  },
  {
    slug: 'how-to-choose-the-right-ac-and-save-energy',
    title: {
      ar: 'كيف تختار سعة التكييف المناسبة لغرفتك مع توفير استهلاك الكهرباء؟',
      en: 'How to Choose the Right Air Conditioner Capacity and Save on Electricity Bills',
    },
    excerpt: {
      ar: 'معادلة حساب القدرة الحصانية المناسبة لمساحة الغرفة، والفرق بين تكييفات الإنفرتر والتقليدية، وحيل ذكية لخفض فاتورة الكهرباء في الصيف.',
      en: 'Calculate the right horsepower for your room size, understand inverter vs standard ACs, and smart tricks to lower your power bill in summer.',
    },
    content: {
      ar: `
<div class="blog-content">
  <p class="lead">مع ارتفاع درجات الحرارة في فصل الصيف، يصبح جهاز التكييف شريان الراحة داخل المنزل. لكن شراء جهاز بسعة غير مناسبة إما سيهدر الكهرباء بلا طائل أو سيعجز عن تبريد المكان كما ينبغي.</p>

  <h2>معادلة حساب القدرة الحصانية المناسبة لغرفتك</h2>
  <p>لتحديد سعة التكييف بالحصان بشكل دقيق، يتم استخدام المعادلة الهندسية التالية:</p>
  <code>(طول الغرفة × عرض الغرفة × الارتفاع) × 250 / 8000 = عدد الأحصنة التقريبي</code>
  <p>إذا كانت الغرفة في طابق أخير ومعرضة للشمس المباشرة طوال اليوم، يتم استبدال الرقم 250 بـ 300 لحساب الحمل الحراري الإضافي.</p>

  <h3>دليل سريع لاختيار السعة:</h3>
  <ul>
    <li><strong>1.5 حصان:</strong> يناسب المساحات حتى 12-14 متر مربع.</li>
    <li><strong>2.25 حصان:</strong> يناسب المساحات من 15 إلى 20 متر مربع.</li>
    <li><strong>3 حصان:</strong> يناسب المساحات من 21 إلى 28 متر مربع.</li>
    <li><strong>4 إلى 5 حصان:</strong> للمساحات المفتوحة وريسبشن الشقق الكبيرة.</li>
  </ul>

  <h2>تكييف إنفرتر (Inverter) أم عادي؟</h2>
  <p>تعتمد التكييفات العادية على تشغيل الموتور بأقصى طاقة ثم إيقافه كلياً عند الوصول للحرارة المطلوبة، وتكرار هذه الدورة يستهلك كميات هائلة من التيار الكهربائي. بينما يعمل تكييف <strong>الإنفرتر</strong> بضاغط متغير السرعات يقلل دورانه بسلاسة عند الوصول لدرجة التبريد المستهدفة، مما يحقق:</p>
  <ul>
    <li>توفيراً في فاتورة الكهرباء يتراوح بين 35% إلى 50%.</li>
    <li>تبريداً مستقراً دون تقلبات مفاجئة في درجة حرارة الغرفة.</li>
    <li>عمر افتراضي أطول للضاغط وهدوء شبه تام أثناء التشغيل.</li>
  </ul>

  <h2>5 حيل ذكية لتقليل استهلاك التكييف</h2>
  <ol>
    <li><strong>اضبط الحرارة على 24 أو 25 درجة مئوية:</strong> كل درجة واحدة أقل تزيد استهلاك الطاقة بنسبة تصل إلى 6%.</li>
    <li><strong>نظف الفلاتر كل أسبوعين:</strong> انسداد الفلتر بالأتربة يقلل تدفق الهواء ويجبر الموتور على العمل الشاق لتعويض النقص.</li>
    <li><strong>استخدم الستائر العازلة للشمس:</strong> عزل أشعة الشمس المباشرة نهاراً يخفف الحمل الحراري على الجهاز بنسبة 30%.</li>
    <li><strong>استعن بمروحة سقف خفيفة:</strong> تدوير الهواء يساعد على توزيع البرودة في كامل الغرفة بسرعة.</li>
    <li><strong>احرص على غلق الأبواب والنوافذ بإحكام:</strong> تسرب الهواء الساخن يمنع الجهاز من الوصول لدرجة الفصل.</li>
  </ol>
</div>`,
      en: `
<div class="blog-content">
  <p class="lead">When summer heat hits, an air conditioner is essential for home comfort. However, choosing the incorrect cooling capacity will either skyrocket your electric bill or leave you sweating in a lukewarm room.</p>

  <h2>How to Calculate Required AC Horsepower</h2>
  <p>Use this practical rule-of-thumb formula to estimate the cooling load:</p>
  <code>(Length × Width × Height in meters) × 250 / 8000 = Approximate HP</code>
  <p>For top-floor apartments or rooms exposed to heavy afternoon direct sunlight, substitute 250 with 300 to factor in extra heat transmission.</p>

  <h3>Quick Capacity Guide:</h3>
  <ul>
    <li><strong>1.5 HP:</strong> Suitable for rooms up to 12–14 m².</li>
    <li><strong>2.25 HP:</strong> Ideal for rooms between 15 and 20 m².</li>
    <li><strong>3 HP:</strong> Designed for spacious living areas of 21–28 m².</li>
    <li><strong>4 to 5 HP:</strong> For open-plan halls and large reception rooms.</li>
  </ul>

  <h2>Inverter vs. Standard Non-Inverter</h2>
  <p>Conventional AC compressors run at full speed and stop entirely when the target temperature is reached—this stop-and-start cycle consumes peak electrical surges. <strong>Inverter technology</strong> modulates compressor speed dynamically:</p>
  <ul>
    <li>Saves 35% to 50% on seasonal electricity consumption.</li>
    <li>Maintains constant, comfortable indoor temperature with zero fluctuations.</li>
    <li>Operates whisper-quietly and significantly extends compressor lifespan.</li>
  </ul>

  <h2>5 Pro Energy-Saving Tips</h2>
  <ol>
    <li><strong>Set thermostat to 24°C–25°C:</strong> Each degree cooler adds approximately 6% to operating costs.</li>
    <li><strong>Clean air filters bi-weekly:</strong> Clogged dust filters choke airflow and force the unit to work overtime.</li>
    <li><strong>Draw blackout curtains during peak sunlight:</strong> Blocks radiant solar heat by up to 30%.</li>
    <li><strong>Pair with a ceiling fan:</strong> Gentle air circulation disperses chilled air evenly.</li>
    <li><strong>Seal doors and window gaps:</strong> Drafts prevent the room from reaching the cutoff temperature.</li>
  </ol>
</div>`,
    },
    coverImage: 'https://api.hagatnaa.com/images/blog/demo/air-conditioner.jpg',
    metaTitle: {
      ar: 'دليل اختيار قدرة التكييف وتوفير الكهرباء | مدونة حاجاتنا',
      en: 'Air Conditioner Buying Guide & Energy Saving | Hagatna Blog',
    },
    metaDescription: {
      ar: 'احسب قوة التكييف المناسبة لمساحة غرفتك وتعرف على مميزات تقنية الإنفرتر ونصائح تقليل استهلاك الكهرباء في الصيف.',
      en: 'Calculate the ideal AC horsepower for your space and learn about inverter technology and power saving tips.',
    },
    tags: ['تكييفات', 'توفير الطاقة', 'أجهزة منزلية', 'صيانة', 'دليل الشراء'],
    status: 'published',
    authorName: 'فريق الخبراء التقنيين — هاجتنا',
    publishedAt: new Date('2026-09-22T14:30:00.000Z'),
    viewsCount: 612,
  },
  {
    slug: '7-tips-to-maintain-your-washing-machine',
    title: {
      ar: '7 نصائح ذهبية لإطالة عمر الغسالة الأوتوماتيك والحفاظ على كفاءتها',
      en: '7 Golden Tips to Extend the Life of Your Automatic Washing Machine',
    },
    excerpt: {
      ar: 'خطوات بسيطة ومجربة لحماية الغسالة من الروائح الكريهة وتراكم الترسبات الكلسية، وحماية الموتور والحلة لسنوات طويلة من الأداء المثالي.',
      en: 'Proven simple steps to protect your washer from unpleasant odors, limescale buildup, and keep the motor and drum running smoothly for years.',
    },
    content: {
      ar: `
<div class="blog-content">
  <p class="lead">تعد الغسالة الأوتوماتيك واحدة من أهم الأجهزة المنزلية وأكثرها استخداماً على مدار الأسبوع. باتباع بعض خطوات الصيانة الوقائية البسيطة، يمكنك تفادي الأعطال المكلفة وضمان ملابس ناصعة النظافة تدوم لسنوات.</p>

  <h2>1. لا تفرط في تحميل الغسالة (Avoid Overloading)</h2>
  <p>ملء الحلة بالملابس حتى حافتها يسبب ضغطاً كبيراً على رولمان البلي (Bearings) ومساعدين الحلة والموتور، مما يؤدي إلى اهتزازات عنيفة وأصوات صاخبة عند العصر. اترك دائماً مساحة فراغ تعادل قبضة اليد بين الملابس وأعلى الحلة.</p>

  <h2>2. دورة التنظيف الشهرية بالخل وبيكربونات الصوديوم</h2>
  <p>تتراكم بقايا الصابون والأملاح الكلسية بمرور الوقت مسببة روائح غير مستحبة. قم بتشغيل دورة غسيل فارغة على أعلى درجة حرارة (60 أو 90 مئوية) مع وضع كوبين من الخل الأبيض ونصف كوب من بيكربونات الصوديوم لتطهير الحلة والأنابيب الداخلية.</p>

  <h2>3. مسح الجوان المطاطي وترك الباب موارباً</h2>
  <p>يعتبر الإطار المطاطي (الجوان) بيئة خصبة لنمو العفن الأسود بسبب ركود قطرات الماء فيه. امسح الجوان بقطعة قماش جافة بعد كل غسلة، واترك باب الغسالة ودرج المسحوق مفتوحين قليلاً لمدة ساعة للتهوية وتبخير الرطوبة.</p>

  <h2>4. تنظيف فلتر تصريف المياه بانتظام</h2>
  <p>يقع فلتر الطلمبة أسفل الغسالة وغالباً ما تتجمع فيه العملات المعدنية، الأزرار، وبقايا خيوط الأقمشة. قم بفتحه وتنظيفه كل شهرين لتفادي انسداد طلمبة الطرد وحماية الغسالة من التوقف المفاجئ أثناء مرحلة الصرف.</p>

  <h2>5. استخدام كمية المسحوق الموصى بها فقط</h2>
  <p>الاعتقاد بأن زيادة المسحوق تعني نظافة أفضل اعتقاد خاطئ! فالرغوة الزائدة تلتصق بالأقمشة وتترك ترسبات صمغية على حساسات الغسالة، كما تجهد طلمبة التصريف. التزم بالمكيال الموصى به من الشركة المصنعة لنوع مسحوق الأوتوماتيك.</p>

  <h2>6. ضبط اتزان أقدام الغسالة</h2>
  <p>إذا كانت الغسالة "تتحرك" أو تصدر صوتاً مرتجاً أثناء دورة العصر، فهذا يعني أن الأرجل غير مستوية على الأرض. استخدم ميزان مياه واضبط أرجل التثبيت جيداً لحماية الهيكل والمساعدين الداخليين من التلف المبكر.</p>

  <h2>7. فحص خراطيم المياه والمحابس</h2>
  <p>تأكد من عدم وجود التواءات في خرطوم إمداد المياه وخرطوم الصرف، وافحص فلاتر الشوائب الشبكية المثبتة عند مدخل الخرطوم كل 6 أشهر لتنظيفها من الرمال والصدأ القادم من مواسير المياه العمومية.</p>
</div>`,
      en: `
<div class="blog-content">
  <p class="lead">Your washing machine is one of the hardest-working appliances in your home. With a few simple preventative habits, you can prevent costly breakdowns, maintain spotless laundry, and prolong machine life.</p>

  <h2>1. Never Overload the Drum</h2>
  <p>Packing laundry tightly puts immense stress on the drum bearings, shock absorbers, and drive motor. This results in heavy banging and premature wear during spin cycles. Always leave a hand's width of free space at the top of the drum.</p>

  <h2>2. Run a Monthly Service Wash with Vinegar</h2>
  <p>Detergent scum and limescale accumulate over time, breeding mildew and odors. Run an empty cycle at the highest temperature setting (60°C or 90°C) with two cups of white vinegar and half a cup of baking soda to sterilize the system.</p>

  <h2>3. Wipe the Rubber Door Seal and Leave the Door Ajar</h2>
  <p>The rubber gasket traps stagnant water droplets, creating an ideal haven for black mold. Wipe the folds dry with a microfiber cloth after washing, and leave both the door and detergent drawer cracked open to air dry.</p>

  <h2>4. Clear the Drain Pump Filter Regularly</h2>
  <p>Located behind a small panel at the bottom front, this filter catches coins, hairpins, and lint. Clean it every 2 months to prevent drainage blockages and protect the pump motor from burning out.</p>

  <h2>5. Measure Detergent Accurately</h2>
  <p>More detergent does not equal cleaner clothes! Excessive suds cushion clothes from rubbing together, leave chalky residues on fabric, and blind internal turbidity sensors. Stick to the measured cap size recommended for HE (High Efficiency) machines.</p>

  <h2>6. Level the Machine Legs</h2>
  <p>If your washer 'walks' across the floor or vibrates violently during high-speed spin, the feet are uneven. Use a bubble level to adjust the screw feet until the chassis sits perfectly firm on the floor.</p>

  <h2>7. Inspect Inlet and Drain Hoses</h2>
  <p>Check rubber hoses periodically for kinks, bulges, or tiny leaks. Also clean the small mesh inlet filters every 6 months to remove pipe sediment and maintain strong water pressure.</p>
</div>`,
    },
    coverImage: 'https://api.hagatnaa.com/images/blog/demo/washing-machine.jpg',
    metaTitle: {
      ar: '7 نصائح للحفاظ على الغسالة الأوتوماتيك | مدونة حاجاتنا',
      en: '7 Tips to Maintain Your Washing Machine | Hagatna Blog',
    },
    metaDescription: {
      ar: 'تعرف على طرق العناية بالغسالة الأوتوماتيك وتنظيف الفلتر ودورة الخل وحماية الموتور لتجنب الأعطال المكلفة.',
      en: 'Learn essential maintenance tips for your automatic washing machine to avoid costly breakdowns and extend durability.',
    },
    tags: ['غسالات', 'صيانة الأجهزة', 'نصائح منزلية', 'نظافة', 'أجهزة كهرومنزيلية'],
    status: 'published',
    authorName: 'قسم الدعم الفني والصيانة — هاجتنا',
    publishedAt: new Date('2026-09-24T09:15:00.000Z'),
    viewsCount: 385,
  },
  {
    slug: 'modern-refrigerator-technologies-and-freshness',
    title: {
      ar: 'تقنيات الثلاجات الحديثة (No Frost و Inverter): دليلك لحفظ الطعام طازجاً',
      en: 'Modern Refrigerator Technologies (No Frost & Inverter): Keep Food Fresh Longer',
    },
    excerpt: {
      ar: 'كيف تختار الثلاجة المثالية لأسرتك؟ استكشف أحدث أنظمة التبريد، توزيع الهواء الذكي، الحفاظ على رطوبة الخضار، وخفض استهلاك الطاقة.',
      en: 'How to choose the ideal refrigerator for your family? Explore modern cooling systems, smart airflow, humidity preservation, and low energy consumption.',
    },
    content: {
      ar: `
<div class="blog-content">
  <p class="lead">شهدت تكنولوجيا الثلاجات قفزات هائلة في السنوات الأخيرة، متجاوزة مجرد فكرة تبريد الأطعمة إلى توفير بيئة ذكية متكاملة تحافظ على القيمة الغذائية والنكهة الطازجة لأطول فترة ممكنة.</p>

  <h2>تقنية نوفروست (No Frost) المتطورة</h2>
  <p>وداعاً لإذابة الثلج اليدوية المتعبة! تعمل تقنية النوفروست على تدوير الهواء البارد الجاف باستمرار بواسطة مروحة داخلية، مع تسخين دوري لعناصر التبريد لإذابة أي بلورات ثلجية قبل تراكمها. هذا لا يحمي الأطعمة من الالتصاق ببعضها فقط، بل يضمن أيضاً ثبات درجة البرودة وسرعة تجميد الأغذية الطازجة في الفريزر.</p>

  <h2>الضاغط الذكي ديجيتال إنفرتر (Digital Inverter Compressor)</h2>
  <p>يعد محرك الإنفرتر الثورة الأهم في كفاءة الثلاجات الحديثة؛ فهو يعمل بتسع مستويات مختلفة من السرعة وفقاً لدرجة حرارة الجو الخارجي وكمية الطعام المضافة وعدد مرات فتح الباب. يمنحك ذلك:</p>
  <ul>
    <li>هدوءاً تاماً أثناء العمل وانعدام صوت الطنين المزعج.</li>
    <li>توفيراً في استهلاك الكهرباء يصل إلى 40%.</li>
    <li>ضماناً يصل إلى 10 أو 20 عاماً على الموتور من الشركات الكبرى.</li>
  </ul>

  <h2>توزيع الهواء المتعدد (Multi Air Flow)</h2>
  <p>تضمن فتحات التهوية المتعددة المنتشرة فوق كل رف تدفق الهواء البارد بشكل متساوٍ في جميع أرجاء الثلاجة من الأعلى إلى الأسفل، مما يقضي على "النقاط الدافئة" ويمنع تلف الأطعمة المحفوظة في زوايا الأرفف أو بأبواب الثلاجة.</p>

  <h2>مناطق الرطوبة المخصصة (Moisture Control Crispers)</h2>
  <p>الفواكه والخضراوات تتطلب مستويات رطوبة مختلفة للبقاء طازجة ومقرمشة. توفر الأدراج الحديثة إمكانية ضبط فتحة التهوية (Slider) للحفاظ على رطوبة عالية للخضروات الورقية، ورطوبة منخفضة للفواكه لمنع تعفنها.</p>

  <h2>نصائح عملية لترتيب الثلاجة باحترافية:</h2>
  <ul>
    <li><strong>الرف العلوي والأوسط:</strong> مخصص للأطعمة الجاهزة للأكل، المتبقيات من الوجبات، والألبان.</li>
    <li><strong>الرف السفلي:</strong> أبرد مكان في الثلاجة، وهو مثالي لحفظ اللحوم والدواجن النيئة داخل علب محكمة لمنع تسرب السوائل.</li>
    <li><strong>أرفف الباب:</strong> هي المنطقة الأقل برودة بسبب تكرار الفتح، وهي مناسبة للمشروبات، الصوصات، والمربيات، وليست للحليب أو البيض.</li>
  </ul>
</div>`,
      en: `
<div class="blog-content">
  <p class="lead">Refrigeration technology has evolved far beyond basic cold storage into intelligent food preservation systems engineered to lock in nutrients, texture, and taste.</p>

  <h2>Total No Frost Technology</h2>
  <p>Manual defrosting is a thing of the past. Total No Frost circulates dry chilled air continuously via internal fans, coupled with periodic defrost heating elements that evaporate ice crystals before they form. This prevents freezer burn and keeps food packages from sticking together.</p>

  <h2>Digital Inverter Compressors</h2>
  <p>Unlike single-speed motors that constantly cycle on and off, digital inverter compressors modulate smoothly across multiple operating speeds based on cooling demands, ambient climate, and door openings:</p>
  <ul>
    <li>Whisper-quiet operation and minimal vibration.</li>
    <li>Up to 40% reduction in everyday electricity use.</li>
    <li>Superior reliability backed by 10 to 20-year manufacturer warranties.</li>
  </ul>

  <h2>Multi Air Flow Cooling</h2>
  <p>Strategically positioned vents across every shelf tier distribute cool air uniformly, eliminating warm pockets and ensuring consistent temperatures whether items are in the center or tucked into corners.</p>

  <h2>Humidity-Controlled Crisper Drawers</h2>
  <p>Leafy greens require high humidity to prevent wilting, whereas ethylene-emitting fruits thrive in lower humidity to prevent premature spoiling. Modern crisper sliders give you precise microclimate control.</p>

  <h2>Smart Refrigerator Organization Tips:</h2>
  <ul>
    <li><strong>Top & Middle Shelves:</strong> Ready-to-eat foods, leftovers, and dairy products.</li>
    <li><strong>Bottom Shelf:</strong> The coldest zone—ideal for sealed raw meats and poultry to prevent accidental drips.</li>
    <li><strong>Door Bins:</strong> The warmest zone with frequent air exposure—best for condiments, juices, and sauces rather than fresh milk or eggs.</li>
  </ul>
</div>`,
    },
    coverImage: 'https://api.hagatnaa.com/images/blog/demo/refrigerator.jpg',
    metaTitle: {
      ar: 'تقنيات الثلاجات الحديثة ودليل الشراء | مدونة حاجاتنا',
      en: 'Modern Refrigerator Guide & Technologies | Hagatna Blog',
    },
    metaDescription: {
      ar: 'اكتشف أفضل تقنيات الثلاجات الحديثة لتوفير الكهرباء وحفظ الأطعمة طازجة لأطول فترة مع دليل السعات المناسبة لكل أسرة.',
      en: 'Explore the best refrigerator technologies for energy savings and lasting freshness with our family capacity guide.',
    },
    tags: ['ثلاجات', 'أجهزة منزلية', 'تكنولوجيا', 'حفظ الطعام', 'توفير الطاقة'],
    status: 'published',
    authorName: 'مستشار الأجهزة المنزلية — هاجتنا',
    publishedAt: new Date('2026-09-26T11:45:00.000Z'),
    viewsCount: 519,
  },
  {
    slug: 'kitchen-safety-tips-and-appliance-guidelines',
    title: {
      ar: 'إرشادات الأمان والسلامة في المطبخ الحديث عند التعامل مع أجهزة الكهرباء والغاز',
      en: 'Kitchen Safety Guidelines for Modern Homes: Electrical and Gas Appliance Safety',
    },
    excerpt: {
      ar: 'دليل سلامة الأسرة في المطبخ: قواعد التوصيلات الكهربائية الصحيحة، صمامات أمان الغاز، وإجراءات حماية الأطفال من الحوادث المنزلية.',
      en: 'Family kitchen safety guide: proper electrical connections, gas safety valves, and proactive measures to protect children from accidents.',
    },
    content: {
      ar: `
<div class="blog-content">
  <p class="lead">المطبخ هو نبض البيت ومركز التجمع العائلي، ولكنه في الوقت نفسه يضم أكبر تركيز لأجهزة الطاقة العالية والحرارة والغاز. اتباع إرشادات السلامة الوقائية يحمي عائلتك وممتلكاتك من أي مخاطر محتملة.</p>

  <h2>1. سلامة التوصيلات الكهربائية والأحمال العالية</h2>
  <p>تحتوي المطابخ على أجهزة ذات قدرة سحب كهربائي مرتفعة (مثل الفرن، الميكروويف، غسالة الصحون، والغلاية). احرص على القواعد التالية:</p>
  <ul>
    <li><strong>لا تستخدم المشتركات الكهربائية العادية:</strong> يجب توصيل كل جهاز كبير بمقبس جداري مستقل ومؤرض (Grounded Socket) يتحمل أمبير الجهاز.</li>
    <li><strong>تجنب ملامسة الأسلاك للأسطح الساخنة:</strong> تأكد من أن أسلاك التوصيل بعيدة تماماً عن شعلات البوتاجاز أو جوانب الفرن.</li>
    <li><strong>أبعد الكهرباء عن مصادر المياه:</strong> يجب ألا تقل المسافة بين أي مقبس كهربائي وحوض غسيل الأطباق عن 60 سم.</li>
  </ul>

  <h2>2. صمام الأمان الكامل في أجهزة الغاز (Full Safety)</h2>
  <p>عند شراء بوتاجاز أو مسطح غاز، تأكد من وجود تقنية الأمان الكامل المزودة بحساس حراري (Thermocouple). إذا انسكب سائل الطهي أو هبت رياح وأطفأت الشعلة، يقوم الحساس فوراً خلال أجزاء من الثانية بقطع تدفق الغاز تماماً لمنع أي تسريب خطير في المطبخ.</p>

  <h2>3. تفعيل خاصية قفل الأمان للأطفال (Child Lock)</h2>
  <p>تأتي أغلب الأجهزة الحديثة (كالمسطحات اللمسية، غسالات الملابس وغسالات الأطباق) بميزة قفل الأمان. تفعيل هذه الخاصية يمنع الأطفال الصغار من تشغيل الأجهزة بالخطأ أو تغيير إعدادات الحرارة أثناء انشغالك.</p>

  <h2>4. التعامل السليم مع أجهزة الميكروويف</h2>
  <ol>
    <li>لا تضع أبداً أواني معدنية أو رقائق الألومنيوم داخل الميكروويف لتجنب حدوث شرر كهربائي وحريق.</li>
    <li>احرص على تنظيف الباب والجوان الداخلي بانتظام لضمان إحكام الغلق ومنع تسرب الموجات.</li>
    <li>لا تقم بتشغيل الميكروويف وهو فارغ نهائياً، لأن ذلك قد يؤدي لاحتراق وحدة التوليد المغناطيسية (Magnetron).</li>
  </ol>

  <h2>5. التهوية وتأمين الشفاط</h2>
  <p>تراكم الزيوت والشحوم على فلاتر الشفاط المصنوعة من الألومنيوم يمثل خطراً حقيقياً في حال تصاعد ألسنة لهب من المقلاة. اغسل فلاتر الشفاط بالماء الساخن ومذيب الدهون شهرياً لضمان كفاءة السحب والسلامة التامة.</p>
</div>`,
      en: `
<div class="blog-content">
  <p class="lead">The kitchen is the heart of the home, but it also concentrates high-draw electricity, open flames, and high heat. Practicing disciplined safety measures ensures a secure culinary environment for your whole family.</p>

  <h2>1. Electrical Load and Dedicated Outlets</h2>
  <p>High-wattage appliances (ovens, dishwashers, microwaves, and kettles) demand strict electrical hygiene:</p>
  <ul>
    <li><strong>Avoid Extension Cords:</strong> Plug major heavy-load appliances directly into dedicated, grounded wall sockets capable of handling their rated amperage.</li>
    <li><strong>Keep Cords Clear of Heat:</strong> Ensure cords never touch hob edges, oven sides, or toaster exteriors.</li>
    <li><strong>Maintain Distance from Sinks:</strong> Keep sockets at least 60 cm away from sink basins and faucets.</li>
  </ul>

  <h2>2. Full Safety Flame-Failure Devices</h2>
  <p>Always choose gas cookers and hobs equipped with a thermocouple safety mechanism. If boiling soup overflows or a draft blows out the flame, the valve automatically cuts the gas supply within seconds to prevent dangerous gas accumulation.</p>

  <h2>3. Utilize Child Lock Features</h2>
  <p>Modern touch-control hobs, washing machines, and built-in ovens come with integrated digital lockouts. Engage Child Lock whenever you step away to prevent inquisitive fingers from activating heating elements.</p>

  <h2>4. Safe Microwave Practices</h2>
  <ol>
    <li>Never insert metal bowls, cutlery, or aluminum foil into the microwave to avoid electrical arcing.</li>
    <li>Keep door seals clean and free of food splatters to ensure radiation shielding integrity.</li>
    <li>Never run the microwave empty, which can overheat and ruin the magnetron tube.</li>
  </ol>

  <h2>5. Kitchen Ventilation and Grease Hood Maintenance</h2>
  <p>Grease-saturated aluminum filters in your range hood are a genuine fire hazard if intense pan flames flare up. Degrease filters monthly in hot soapy water to ensure smooth extraction and total safety.</p>
</div>`,
    },
    coverImage: 'https://api.hagatnaa.com/images/blog/demo/safety-kitchen.jpg',
    metaTitle: {
      ar: 'إرشادات الأمان والسلامة في المطبخ | مدونة حاجاتنا',
      en: 'Kitchen Safety & Appliance Guidelines | Hagatna Blog',
    },
    metaDescription: {
      ar: 'أهم النصائح الوقائية لتأمين المطبخ وحماية عائلتك أثناء استخدام البوتاجاز والأفران والأجهزة الكهربائية ذات القدرة العالية.',
      en: 'Essential safety tips to protect your family while using cookers, ovens, and high-power kitchen electrical appliances.',
    },
    tags: ['أمان المطبخ', 'إرشادات السلامة', 'بوتاجازات وأفران', 'توعية', 'نصائح منزلية'],
    status: 'published',
    authorName: 'فريق السلامة والجودة — هاجتنا',
    publishedAt: new Date('2026-09-27T16:20:00.000Z'),
    viewsCount: 294,
  },
  {
    slug: 'modern-home-decor-trends-and-appliances',
    title: {
      ar: 'أحدث صيحات ديكور المنزل العصري: كيف تنسق ألوان الأجهزة مع تصميم الغرف؟',
      en: 'Modern Home Decor Trends: Harmonizing Appliance Colors with Interior Spaces',
    },
    excerpt: {
      ar: 'أفكار ملهمة لتنسيق الأجهزة الستانلس ستيل والأسود المطفي (Black Inox) مع الخزائن العصرية والإضاءة الدافئة لخلق مطبخ أحلامك.',
      en: 'Inspiring ideas to blend stainless steel and matte black (Black Inox) appliances with contemporary cabinets and warm lighting for your dream kitchen.',
    },
    content: {
      ar: `
<div class="blog-content">
  <p class="lead">لم تعد الأجهزة الكهربائية مجرد أدوات لتأدية المهام المنزلية، بل غدت قطعاً فنية محورية تشارك في تشكيل هوية الديكور الداخلي وتضفي لمسة من الفخامة والتميز على كل زاوية في منزلك.</p>

  <h2>1. صيحة الأسود المطفي (Matte Black & Black Inox)</h2>
  <p>يتربع لون "البلاك إينوكس" على عرش صيحات الديكور الحديث. يمنح هذا الملمس المطفي لمسة دراماتيكية راقية، خاصة عند تنسيقه مع الخزائن الخشبية الطبيعية (Natural Oak) أو الرخام الأبيض ذي العروق الرمادية (Calacatta). بالإضافة إلى ذلك، فهو مقاوم لبصمات الأصابع مقارنة بالأسطح اللامعة.</p>

  <h2>2. كلاسيكية الستانلس ستيل الفضي (Timeless Stainless Steel)</h2>
  <p>يظل الستانلس ستيل الخيار الخالد الذي لا تبطل موضته أبداً. يتناغم بشكل رائع مع المطابخ ذات الطابع الصناعي (Industrial Style) والمطابخ البيضاء أو الزرقاء الداكنة (Navy Blue). كما أنه يعكس الإضاءة بشكل رائع مما يعطي شعوراً باتساع المساحة.</p>

  <h2>3. تكامل الأجهزة مع المطابخ المفتوحة (Open-Concept Kitchens)</h2>
  <p>في الشقق الحديثة التي تتداخل فيها غرفة المعيشة مع المطبخ، يصبح اختيار الأجهزة أكثر دقة:</p>
  <ul>
    <li>اختر أجهزة مدمجة (Built-in) بألواح تتطابق مع لون كبائن المطبخ لخلق امتداد بصري هادئ.</li>
    <li>احرص على اختيار أجهزة بمعدل ديسيبل منخفض (Ultra-Quiet) لغسالات الأطباق والثلاجات حتى لا تشوش على جلسة العائلة في المعيشة.</li>
    <li>صمم ركن قهوة (Coffee Station) أنيقاً على كاونتر المطبخ يجمع ماكينة الإسبريسو ومطحنة القهوة مع إضاءة سبوت لايت موجهة.</li>
  </ul>

  <h2>4. الإضاءة المخفية تبرز جمال الأجهزة</h2>
  <p>استخدام أشرطة الليد الدافئة (Warm LED Strips) تحت خزائن المطبخ وفوق أسطح الرخام يسلط الضوء على تفاصيل الأجهزة وشاشات العرض الرقمية اللمسية، مما يمنح المطبخ في المساء أجواء فندقية دافئة وساحرة.</p>
</div>`,
      en: `
<div class="blog-content">
  <p class="lead">Electrical home appliances are no longer merely utilitarian tools—they are statement design pieces that define interior character and infuse luxury into contemporary living spaces.</p>

  <h2>1. The Rise of Black Inox & Matte Black</h2>
  <p>Matte black and dark stainless steel dominate luxury interior styling. They introduce bold, architectural contrast when paired with natural oak cabinetry, industrial stone, or bold veined white Calacatta marble. Best of all, brushed matte coatings offer high resistance to visible fingerprints.</p>

  <h2>2. Timeless Brushed Stainless Steel</h2>
  <p>Stainless steel remains an enduring classic. It effortlessly bridges modern and industrial themes, complementing navy blue, forest green, and classic monochrome cabinetry while gently bouncing ambient light to make compact kitchens feel airier.</p>

  <h2>3. Open-Plan Living & Appliance Integration</h2>
  <p>When the kitchen is visible from your main living room, smart coordination is paramount:</p>
  <ul>
    <li>Choose integrated built-in appliances that blend seamlessly into surrounding millwork.</li>
    <li>Prioritize ultra-low decibel ratings on dishwashers and refrigerators so your open-concept living space stays peaceful.</li>
    <li>Create a curated morning coffee station featuring an espresso machine, grinder, and warm display lighting.</li>
  </ul>

  <h2>4. Under-Cabinet Accent Lighting</h2>
  <p>Warm LED strip lighting placed beneath wall cabinets accentuates appliance finishes, tactile controls, and digital interfaces, transforming your culinary workspace into a cozy, hotel-grade evening retreat.</p>
</div>`,
    },
    coverImage: 'https://api.hagatnaa.com/images/blog/demo/home-decor.jpg',
    metaTitle: {
      ar: 'تنسيق أجهزة المنزل مع الديكور العصري | مدونة حاجاتنا',
      en: 'Modern Home Decor & Appliance Harmony | Hagatna Blog',
    },
    metaDescription: {
      ar: 'كيف تختار ألوان الأجهزة الكهربائية لتتوافق مع ديكور منزلك الحديث؟ نصائح مهندسي الديكور لتنسيق المطابخ والصالات.',
      en: 'How to choose appliance finishes that complement your modern home decor. Interior design tips for kitchens and living spaces.',
    },
    tags: ['ديكور وتصميم', 'مطابخ عصرية', 'أناقة المنزل', 'ألوان وتنسيق', 'أفكار منزلية'],
    status: 'published',
    authorName: 'قسم التصميم الداخلي — هاجتنا',
    publishedAt: new Date('2026-09-28T13:10:00.000Z'),
    viewsCount: 342,
  },
];

async function seedBlogPosts() {
  console.log('🚀 Starting demo blog posts seeding...');

  let createdCount = 0;
  let updatedCount = 0;

  for (const post of demoBlogPosts) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug: post.slug },
    });

    if (existing) {
      await prisma.blogPost.update({
        where: { slug: post.slug },
        data: {
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          coverImage: post.coverImage,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          tags: post.tags,
          status: post.status,
          authorName: post.authorName,
          publishedAt: post.publishedAt,
          viewsCount: post.viewsCount,
        },
      });
      console.log(`🔄 Updated post: ${post.slug} ("${post.title.ar}")`);
      updatedCount++;
    } else {
      await prisma.blogPost.create({
        data: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          coverImage: post.coverImage,
          metaTitle: post.metaTitle,
          metaDescription: post.metaDescription,
          tags: post.tags,
          status: post.status,
          authorName: post.authorName,
          publishedAt: post.publishedAt,
          viewsCount: post.viewsCount,
        },
      });
      console.log(`✅ Created post: ${post.slug} ("${post.title.ar}")`);
      createdCount++;
    }
  }

  const total = await prisma.blogPost.count();
  console.log('\n🎉 Finished seeding demo blog posts:');
  console.log(`   - Created: ${createdCount}`);
  console.log(`   - Updated: ${updatedCount}`);
  console.log(`   - Total Blog Posts in DB: ${total}`);
}

seedBlogPosts()
  .catch((err) => {
    console.error('❌ Error seeding blog posts:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
