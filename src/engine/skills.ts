/** Skill graph. Chapter names follow the current NCERT books used by CBSE:
 *  Class 1 Joyful Mathematics and Mridang (English), Class 2 Joyful Mathematics, Class 3 Maths Mela.
 *  A chapter marked † has a story title whose topic was inferred; a teacher should confirm it. */

export type GameId = "sabzi" | "laddoo" | "cat" | "rangoli" | "sounds" | "caps" | "listen"
  | "beads" | "stall" | "share" | "hundreds";
export type Lang = "en" | "hi";
export type Subject = "maths" | "english";
export type Cls = 1 | 2 | 3;

export interface Skill {
  id: string;
  game: GameId;
  level: number;          // order inside its game, 1 = first
  cls: Cls;
  chapter: string;
  prereq: string[];
  name: Record<Lang, string>;      // parent-facing
  canDo: Record<Lang, string>;     // child-facing "I can..." card
  place: Record<Lang, string>;     // what grows in the town when mastered
}

export const SKILLS: Skill[] = [
  // ===== Class 1 · Maths (Joyful Mathematics 1) =====
  // Sabzi Cart
  { id: "count10", game: "sabzi", level: 1, cls: 1, chapter: "Joyful Mathematics 1 · Mango Treat†", prereq: [],
    name: { en: "Counting to 10", hi: "10 तक गिनना" },
    canDo: { en: "I can give 7 tomatoes when asked", hi: "मैं माँगने पर 7 टमाटर दे सकता/सकती हूँ" },
    place: { en: "A vegetable cart arrives", hi: "सब्ज़ी का ठेला आ गया" } },
  { id: "count20", game: "sabzi", level: 2, cls: 1, chapter: "Joyful Mathematics 1 · Vegetable Farm†, Fun with Numbers†", prereq: ["count10"],
    name: { en: "Counting to 20 with a bundle of 10", hi: "10 के बंडल से 20 तक गिनना" },
    canDo: { en: "I can make 14 with a bundle of 10 and 4 more", hi: "मैं 10 का बंडल और 4 और लेकर 14 बना सकता/सकती हूँ" },
    place: { en: "A fruit stall opens", hi: "फलों की दुकान खुल गई" } },
  { id: "more_less", game: "sabzi", level: 3, cls: 1, chapter: "Joyful Mathematics 1 · How Many?†", prereq: ["count10"],
    name: { en: "More and less", hi: "ज़्यादा और कम" },
    canDo: { en: "I can tell which basket has more", hi: "मैं बता सकता/सकती हूँ कि किस टोकरी में ज़्यादा है" },
    place: { en: "A weighing scale appears", hi: "तराज़ू आ गया" } },
  // Laddoo Box
  { id: "bond10", game: "laddoo", level: 1, cls: 1, chapter: "Joyful Mathematics 1 · Making 10", prereq: [],
    name: { en: "Making 10 (number bonds)", hi: "10 बनाना (संख्या जोड़े)" },
    canDo: { en: "I know 6 and 4 make 10", hi: "मुझे पता है कि 6 और 4 से 10 बनता है" },
    place: { en: "The sweet shop opens", hi: "मिठाई की दुकान खुल गई" } },
  { id: "add10", game: "laddoo", level: 2, cls: 1, chapter: "Joyful Mathematics 1 · How Many?†", prereq: ["bond10"],
    name: { en: "Adding within 10", hi: "10 तक जोड़ना" },
    canDo: { en: "I can add 3 laddoos and 4 laddoos", hi: "मैं 3 लड्डू और 4 लड्डू जोड़ सकता/सकती हूँ" },
    place: { en: "A tea stall opens", hi: "चाय की दुकान खुल गई" } },
  { id: "sub10", game: "laddoo", level: 3, cls: 1, chapter: "Joyful Mathematics 1 · Lina's Family†", prereq: ["add10"],
    name: { en: "Taking away within 10", hi: "10 तक घटाना" },
    canDo: { en: "I can say how many are left when 3 are eaten from 8", hi: "8 में से 3 खाने पर कितने बचे, मैं बता सकता/सकती हूँ" },
    place: { en: "A bench under the tree", hi: "पेड़ के नीचे बेंच" } },
  { id: "addsub20", game: "laddoo", level: 4, cls: 1, chapter: "Joyful Mathematics 1 · Fun with Numbers†", prereq: ["sub10"],
    name: { en: "Adding and taking away within 20", hi: "20 तक जोड़ना और घटाना" },
    canDo: { en: "I can work out 9 + 5 and 15 − 6", hi: "मैं 9 + 5 और 15 − 6 निकाल सकता/सकती हूँ" },
    place: { en: "A big festival kitchen", hi: "त्योहार की बड़ी रसोई" } },
  // Find the Furry Cat
  { id: "position", game: "cat", level: 1, cls: 1, chapter: "Joyful Mathematics 1 · Finding the Furry Cat!", prereq: [],
    name: { en: "Position words (on, under, inside, near, behind)", hi: "स्थिति के शब्द (ऊपर, नीचे, अंदर, पास, पीछे)" },
    canDo: { en: "I can find the cat under the table", hi: "मैं मेज़ के नीचे बिल्ली ढूँढ सकता/सकती हूँ" },
    place: { en: "A cat house in the garden", hi: "बगीचे में बिल्ली का घर" } },
  { id: "shape_name", game: "cat", level: 2, cls: 1, chapter: "Joyful Mathematics 1 · Utsav†", prereq: [],
    name: { en: "Naming shapes", hi: "आकृतियों के नाम" },
    canDo: { en: "I can find a circle, a triangle, a square and a rectangle", hi: "मैं गोला, तिकोना, चौकोर और आयत पहचान सकता/सकती हूँ" },
    place: { en: "Kites over the town", hi: "नगर के ऊपर पतंगें" } },
  { id: "shape_obj", game: "cat", level: 3, cls: 1, chapter: "Joyful Mathematics 1 · Utsav†", prereq: ["shape_name"],
    name: { en: "Shapes around us", hi: "हमारे आसपास की आकृतियाँ" },
    canDo: { en: "I can tell that a roti is shaped like a circle", hi: "मैं बता सकता/सकती हूँ कि रोटी गोले जैसी है" },
    place: { en: "A shape garden", hi: "आकृतियों का बगीचा" } },
  // Rangoli Patterns
  { id: "pat_next", game: "rangoli", level: 1, cls: 1, chapter: "Joyful Mathematics 1 · Utsav†", prereq: [],
    name: { en: "What comes next (simple patterns)", hi: "आगे क्या आएगा (आसान पैटर्न)" },
    canDo: { en: "I can continue red, blue, red, blue", hi: "मैं लाल, नीला, लाल, नीला आगे बढ़ा सकता/सकती हूँ" },
    place: { en: "A rangoli at the gate", hi: "दरवाज़े पर रंगोली" } },
  { id: "pat_next2", game: "rangoli", level: 2, cls: 1, chapter: "Joyful Mathematics 1 · Utsav†", prereq: ["pat_next"],
    name: { en: "Longer patterns", hi: "लंबे पैटर्न" },
    canDo: { en: "I can continue a pattern like ★ ★ ● ★ ★ ●", hi: "मैं ★ ★ ● ★ ★ ● जैसा पैटर्न आगे बढ़ा सकता/सकती हूँ" },
    place: { en: "Diyas along the road", hi: "सड़क पर दीये" } },
  { id: "pat_fix", game: "rangoli", level: 3, cls: 1, chapter: "Joyful Mathematics 1 · Utsav†", prereq: ["pat_next2"],
    name: { en: "Finding the mistake in a pattern", hi: "पैटर्न में गलती ढूँढना" },
    canDo: { en: "I can spot the one that breaks the pattern", hi: "मैं पैटर्न तोड़ने वाला ढूँढ सकता/सकती हूँ" },
    place: { en: "Toran on every door", hi: "हर दरवाज़े पर तोरण" } },

  // ===== Class 1 · English (Mridang) =====
  // Sound Garden
  { id: "first_sound", game: "sounds", level: 1, cls: 1, chapter: "Mridang · all units (word sounds)", prereq: [],
    name: { en: "Hearing the first sound in a word", hi: "शब्द की पहली आवाज़ सुनना" },
    canDo: { en: "I can hear that sun and sock start the same", hi: "मैं सुन सकता/सकती हूँ कि sun और sock एक जैसे शुरू होते हैं" },
    place: { en: "Sunflowers in the garden", hi: "बगीचे में सूरजमुखी" } },
  { id: "letter_sound", game: "sounds", level: 2, cls: 1, chapter: "Mridang · all units (letters and sounds)", prereq: ["first_sound"],
    name: { en: "Matching letters to sounds", hi: "अक्षर को आवाज़ से मिलाना" },
    canDo: { en: "I know the letter m starts mango", hi: "मुझे पता है कि m से mango शुरू होता है" },
    place: { en: "A letter swing", hi: "अक्षरों वाला झूला" } },
  { id: "letter_pick", game: "sounds", level: 3, cls: 1, chapter: "Mridang · all units (letters and sounds)", prereq: ["letter_sound"],
    name: { en: "Finding the first letter of a word", hi: "शब्द का पहला अक्षर ढूँढना" },
    canDo: { en: "I can hear 'pen' and find the letter p", hi: "मैं 'pen' सुनकर p ढूँढ सकता/सकती हूँ" },
    place: { en: "A butterfly garden", hi: "तितलियों का बगीचा" } },
  // Cap Seller's Caps
  { id: "read_cvc", game: "caps", level: 1, cls: 1, chapter: "Mridang · The Cap Seller and the Monkeys", prereq: ["letter_sound"],
    name: { en: "Reading 3-letter words by blending", hi: "आवाज़ें मिलाकर 3 अक्षर के शब्द पढ़ना" },
    canDo: { en: "I can read c-a-p as cap", hi: "मैं c-a-p को cap पढ़ सकता/सकती हूँ" },
    place: { en: "The cap seller's tree", hi: "टोपी वाले का पेड़" } },
  { id: "build_cvc", game: "caps", level: 2, cls: 1, chapter: "Mridang · The Cap Seller and the Monkeys", prereq: ["read_cvc"],
    name: { en: "Building 3-letter words", hi: "3 अक्षर के शब्द बनाना" },
    canDo: { en: "I can hear 'hen' and make h-e-n", hi: "मैं 'hen' सुनकर h-e-n बना सकता/सकती हूँ" },
    place: { en: "Monkeys bring the caps back", hi: "बंदर टोपियाँ लौटा गए" } },
  { id: "build_cvc2", game: "caps", level: 3, cls: 1, chapter: "Mridang · A Farm", prereq: ["build_cvc"],
    name: { en: "Building words with more letters to choose from", hi: "ज़्यादा अक्षरों में से शब्द बनाना" },
    canDo: { en: "I can build pig, fox and bus", hi: "मैं pig, fox और bus बना सकता/सकती हूँ" },
    place: { en: "A farm with a red barn", hi: "लाल खलिहान वाला खेत" } },
  // Listen and Tap
  { id: "vocab", game: "listen", level: 1, cls: 1, chapter: "Mridang · Two Little Hands, A Farm, The Food We Eat, The Four Seasons", prereq: [],
    name: { en: "Words from the book (listening)", hi: "किताब के शब्द (सुनना)" },
    canDo: { en: "I can hear 'cow' and find the cow", hi: "मैं 'cow' सुनकर गाय ढूँढ सकता/सकती हूँ" },
    place: { en: "A cow shed", hi: "गौशाला" } },
  { id: "sentence", game: "listen", level: 2, cls: 1, chapter: "Mridang · Greetings, The Cap Seller and the Monkeys, The Four Seasons", prereq: ["vocab"],
    name: { en: "Understanding a short sentence", hi: "छोटा वाक्य समझना" },
    canDo: { en: "I can hear 'It is raining' and find the rain", hi: "मैं 'It is raining' सुनकर बारिश वाली तस्वीर ढूँढ सकता/सकती हूँ" },
    place: { en: "A rainbow over the town", hi: "नगर पर इंद्रधनुष" } },
  { id: "sight", game: "listen", level: 3, cls: 1, chapter: "Mridang · all units (common words)", prereq: ["vocab"],
    name: { en: "Common sight words", hi: "आम दिखने वाले शब्द" },
    canDo: { en: "I can find the words I, the, is and my", hi: "मैं I, the, is और my शब्द ढूँढ सकता/सकती हूँ" },
    place: { en: "A little library", hi: "छोटा पुस्तकालय" } },

  // ===== Class 2 · Maths =====
  // G3 Bead Mala: place value to 100 (Class 2, Fun with Numbers)
  { id: "pv_build", game: "beads", level: 1, cls: 2, chapter: "Joyful Mathematics 2 · Fun with Numbers", prereq: [],
    name: { en: "Tens and ones to 100", hi: "100 तक दहाई और इकाई" },
    canDo: { en: "I can make 47 with 4 tens and 7 ones", hi: "मैं 4 दहाई और 7 इकाई से 47 बना सकता/सकती हूँ" },
    place: { en: "The bead shop opens", hi: "मोतियों की दुकान खुल गई" } },
  { id: "pv_read", game: "beads", level: 2, cls: 2, chapter: "Joyful Mathematics 2 · Fun with Numbers", prereq: ["pv_build"],
    name: { en: "Reading 2-digit numbers", hi: "दो अंकों की संख्या पढ़ना" },
    canDo: { en: "I can see 6 tens and 3 ones and say 63", hi: "मैं 6 दहाई और 3 इकाई देखकर 63 बता सकता/सकती हूँ" },
    place: { en: "A necklace stall appears", hi: "हार का ठेला आ गया" } },
  { id: "pv_compare", game: "beads", level: 3, cls: 2, chapter: "Joyful Mathematics 2 · Fun with Numbers", prereq: ["pv_read"],
    name: { en: "Comparing 2-digit numbers", hi: "दो अंकों की संख्याओं की तुलना" },
    canDo: { en: "I can tell that 52 is more than 25", hi: "मैं बता सकता/सकती हूँ कि 52, 25 से ज़्यादा है" },
    place: { en: "A festival arch goes up", hi: "मेले का द्वार बन गया" } },

  // G4 Fair Stall: adding and subtracting within 100 with money (Class 2, Fun at the Fair)
  { id: "money_add", game: "stall", level: 1, cls: 2, chapter: "Joyful Mathematics 2 · Fun at the Fair", prereq: ["pv_build"],
    name: { en: "Adding prices without carrying", hi: "बिना हासिल के दाम जोड़ना" },
    canDo: { en: "I can add ₹23 and ₹14", hi: "मैं ₹23 और ₹14 जोड़ सकता/सकती हूँ" },
    place: { en: "The toy stall opens", hi: "खिलौनों का स्टॉल खुल गया" } },
  { id: "money_add_carry", game: "stall", level: 2, cls: 2, chapter: "Joyful Mathematics 2 · Fun at the Fair", prereq: ["money_add"],
    name: { en: "Adding prices with carrying", hi: "हासिल के साथ दाम जोड़ना" },
    canDo: { en: "I can add ₹38 and ₹25", hi: "मैं ₹38 और ₹25 जोड़ सकता/सकती हूँ" },
    place: { en: "A balloon seller arrives", hi: "गुब्बारे वाला आ गया" } },
  { id: "money_change", game: "stall", level: 3, cls: 2, chapter: "Joyful Mathematics 2 · Fun at the Fair", prereq: ["money_add_carry"],
    name: { en: "Giving change (subtracting with regrouping)", hi: "बाकी पैसे लौटाना (उधार लेकर घटाना)" },
    canDo: { en: "I can give change from ₹50 for ₹27", hi: "मैं ₹50 में से ₹27 का सामान देकर बाकी पैसे लौटा सकता/सकती हूँ" },
    place: { en: "The Ferris wheel starts turning", hi: "झूला चलने लगा" } },

  // G5 Fair Share: equal sharing, remainders, halves and quarters (Class 3, Fair Share)
  { id: "share_equal", game: "share", level: 1, cls: 3, chapter: "Maths Mela 3 · Fair Share", prereq: [],
    name: { en: "Sharing equally", hi: "बराबर बाँटना" },
    canDo: { en: "I can share 12 laddoos among 3 plates", hi: "मैं 12 लड्डू 3 थालियों में बराबर बाँट सकता/सकती हूँ" },
    place: { en: "A picnic spot opens", hi: "पिकनिक की जगह तैयार हो गई" } },
  { id: "share_left", game: "share", level: 2, cls: 3, chapter: "Maths Mela 3 · Fair Share", prereq: ["share_equal"],
    name: { en: "Sharing with some left over", hi: "बाँटने के बाद बचे हुए" },
    canDo: { en: "I can share 14 among 4 and say 2 are left", hi: "मैं 14 को 4 में बाँटकर बता सकता/सकती हूँ कि 2 बचे" },
    place: { en: "A sweet shop opens", hi: "मिठाई की दुकान खुल गई" } },
  { id: "share_fraction", game: "share", level: 3, cls: 3, chapter: "Maths Mela 3 · Fair Share", prereq: ["share_equal"],
    name: { en: "Halves and quarters", hi: "आधा और चौथाई" },
    canDo: { en: "I can spot 4 equal parts (quarters)", hi: "मैं 4 बराबर हिस्से (चौथाई) पहचान सकता/सकती हूँ" },
    place: { en: "A dhaba opens", hi: "ढाबा खुल गया" } },

  // G6 House of Hundreds: 3-digit place value and adding/subtracting with trading (Class 3)
  { id: "h_build", game: "hundreds", level: 1, cls: 3, chapter: "Maths Mela 3 · House of Hundreds I", prereq: ["pv_read"],
    name: { en: "Hundreds, tens and ones", hi: "सैकड़ा, दहाई और इकाई" },
    canDo: { en: "I can make 352 with blocks", hi: "मैं ब्लॉकों से 352 बना सकता/सकती हूँ" },
    place: { en: "The brick yard opens", hi: "ईंटों का भट्टा खुल गया" } },
  { id: "h_add", game: "hundreds", level: 2, cls: 3, chapter: "Maths Mela 3 · House of Hundreds II", prereq: ["h_build"],
    name: { en: "Adding 3-digit numbers with trading", hi: "तीन अंकों की संख्याएँ जोड़ना (बदलकर)" },
    canDo: { en: "I can add 248 and 135", hi: "मैं 248 और 135 जोड़ सकता/सकती हूँ" },
    place: { en: "A new house is built", hi: "नया घर बन गया" } },
  { id: "h_sub", game: "hundreds", level: 3, cls: 3, chapter: "Maths Mela 3 · House of Hundreds II", prereq: ["h_add"],
    name: { en: "Subtracting 3-digit numbers with trading", hi: "तीन अंकों की संख्याएँ घटाना (बदलकर)" },
    canDo: { en: "I can take 167 from 432", hi: "मैं 432 में से 167 घटा सकता/सकती हूँ" },
    place: { en: "The school gets a new floor", hi: "स्कूल में नई मंज़िल बन गई" } },
];

export const skill = (id: string): Skill => {
  const s = SKILLS.find(k => k.id === id);
  if (!s) throw new Error(`Unknown skill ${id}`);
  return s;
};

export const skillsFor = (game: GameId) => SKILLS.filter(s => s.game === game).sort((a, b) => a.level - b.level);

export const GAMES: { id: GameId; cls: Cls; subject: Subject; name: Record<Lang, string>; blurb: Record<Lang, string> }[] = [
  { id: "sabzi", cls: 1, subject: "maths", name: { en: "Sabzi Cart", hi: "सब्ज़ी का ठेला" },
    blurb: { en: "Count vegetables for customers", hi: "ग्राहकों के लिए सब्ज़ियाँ गिनो" } },
  { id: "laddoo", cls: 1, subject: "maths", name: { en: "Laddoo Box", hi: "लड्डू का डिब्बा" },
    blurb: { en: "Fill boxes of 10, add and take away", hi: "10 का डिब्बा भरो, जोड़ो और घटाओ" } },
  { id: "cat", cls: 1, subject: "maths", name: { en: "Find the Furry Cat", hi: "बिल्ली को ढूँढो" },
    blurb: { en: "Where is the cat? Which shape?", hi: "बिल्ली कहाँ है? कौन-सी आकृति?" } },
  { id: "rangoli", cls: 1, subject: "maths", name: { en: "Rangoli Patterns", hi: "रंगोली पैटर्न" },
    blurb: { en: "What comes next?", hi: "आगे क्या आएगा?" } },
  { id: "sounds", cls: 1, subject: "english", name: { en: "Sound Garden", hi: "आवाज़ों का बगीचा" },
    blurb: { en: "Hear sounds, find letters", hi: "आवाज़ें सुनो, अक्षर ढूँढो" } },
  { id: "caps", cls: 1, subject: "english", name: { en: "Cap Seller's Caps", hi: "टोपी वाले की टोपियाँ" },
    blurb: { en: "Read and build little words", hi: "छोटे शब्द पढ़ो और बनाओ" } },
  { id: "listen", cls: 1, subject: "english", name: { en: "Listen and Tap", hi: "सुनो और छुओ" },
    blurb: { en: "Hear English words and sentences", hi: "अंग्रेज़ी शब्द और वाक्य सुनो" } },
  { id: "beads", cls: 2, subject: "maths", name: { en: "Bead Mala", hi: "मोती माला" },
    blurb: { en: "Make necklaces with strings of 10", hi: "10 मोतियों की लड़ियों से हार बनाओ" } },
  { id: "stall", cls: 2, subject: "maths", name: { en: "Fair Stall", hi: "मेले का स्टॉल" },
    blurb: { en: "Sell toys and give change", hi: "खिलौने बेचो और बाकी पैसे लौटाओ" } },
  { id: "share", cls: 3, subject: "maths", name: { en: "Fair Share", hi: "बराबर बँटवारा" },
    blurb: { en: "Share sweets so everyone gets the same", hi: "मिठाई ऐसे बाँटो कि सबको बराबर मिले" } },
  { id: "hundreds", cls: 3, subject: "maths", name: { en: "House of Hundreds", hi: "सैकड़ों का घर" },
    blurb: { en: "Build houses with hundreds, tens and ones", hi: "सैकड़ा, दहाई, इकाई से घर बनाओ" } },
];
