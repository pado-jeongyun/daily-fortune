export const meta = {
  description:
    "이름과 날짜로 오늘의 운세를 뽑는다. name(이름)과 date(YYYY-MM-DD)는 둘 다 선택이다. date 를 생략하면 오늘로 본다. 같은 이름과 같은 날짜에는 언제 불러도 항상 같은 운세가 나오고, 날짜가 바뀌면 운세도 바뀐다(무작위가 아니라 이름과 날짜를 해시해 미리 준비된 문구 풀에서 결정적으로 고른다). 총운·행운의 숫자·행운의 색·행운의 아이템·오늘의 조언·운세 등급을 돌려준다.",
  input: {
    type: "object",
    properties: {
      name: { type: "string", description: "운세를 볼 사람의 이름 (선택). 비우면 그날 날짜만으로 본다." },
      date: { type: "string", description: "YYYY-MM-DD (선택). 생략하면 오늘." },
    },
  },
  output: {
    type: "object",
    properties: {
      name: { type: ["string", "null"] },
      date: { type: "string" },
      weekday: { type: "string" },
      grade: { type: "object" },
      overall: { type: "string" },
      lucky_number: { type: "number" },
      lucky_color: { type: "string" },
      lucky_item: { type: "string" },
      advice: { type: "string" },
    },
  },
};

// 결정적 해시 (cyrb53). 같은 문자열과 같은 seed 는 언제나 같은 값을 준다.
// seed 를 항목마다 달리해 총운·색·아이템 등이 서로 독립적으로 뽑히게 한다.
function cyrb53(str: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isValidYMD(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function weekdayKo(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
}

function idx(key: string, seed: number, len: number): number {
  return cyrb53(key, seed) % len;
}

// 오늘의 총운 (재미있고 긍정적인 톤). 나쁜 운세도 우울하지 않게.
const OVERALL = [
  "오늘은 하는 일마다 은근히 술술 풀리는 날이에요. 커피도 딱 좋은 온도로 나올 거예요.",
  "아침부터 기분 좋은 신호가 켜지는 하루예요. 신호등도 오늘은 당신 편이 되어 줄 거예요.",
  "오늘의 당신은 걸어다니는 행운 자석이에요. 좋은 소식이 알아서 따라붙습니다.",
  "작게 시작한 일이 생각보다 크게 잘 되는 날이에요. 일단 한번 저질러 보세요.",
  "오늘은 웃을 일이 자주 생겨요. 별것 아닌 일에도 새어 나오는 웃음을 마음껏 즐기세요.",
  "미뤄 뒀던 일을 오늘 손대면 의외로 30분 만에 끝나요. 지금이 바로 그 타이밍이에요.",
  "오늘은 주변 사람들이 당신에게 유난히 친절한 날이에요. 그 친절, 사양 말고 누리세요.",
  "잊고 있던 좋은 소식이 슬며시 도착하는 하루예요. 알림을 한 번씩 확인해 보세요.",
  "오늘은 무엇을 골라도 그게 정답이 되는 날이에요. 고민은 짧게, 선택은 시원하게 하세요.",
  "예상 못 한 곳에서 작은 행운이 툭 떨어져요. 길에서 만 원 줍는 상상이 오늘은 현실일지도요.",
  "오늘은 당신의 한마디가 누군가의 하루를 살리는 날이에요. 말에 좋은 기운이 담겨 있어요.",
  "살짝 꼬이는 듯하다가도 결국 다 잘 풀리는 반전의 하루예요. 끝까지 느긋하게 가세요.",
  "오늘은 몸도 마음도 가벼운 날이에요. 발걸음이 평소보다 통통 튈 거예요.",
  "오래 기다린 일에 파란불이 켜지는 하루예요. 이제 슬슬 움직여도 좋습니다.",
  "오늘은 당신의 센스가 빛나는 날이에요. 무심코 한 선택이 두고두고 칭찬받아요.",
  "작은 용기 하나가 큰 문을 여는 하루예요. 망설였던 그 한 걸음, 오늘 내디뎌 보세요.",
  "오늘은 먹는 것마다 맛있는 날이에요. 점심 메뉴는 실패할 수가 없겠어요.",
  "우연히 만난 사람이나 우연히 본 글에서 힌트를 얻는 하루예요. 안테나를 살짝 세워 두세요.",
  "오늘은 정리 정돈이 유난히 잘 되는 날이에요. 책상 한 칸만 치워도 운이 확 트입니다.",
  "조금 느리게 가도 괜찮은 하루예요. 서두르지 않아도 갈 곳에 딱 맞춰 도착해요.",
  "오늘은 당신을 응원하는 기운이 사방에 깔려 있어요. 뭘 해도 등 떠밀어 주는 느낌일 거예요.",
  "잔잔하지만 확실하게 좋은 하루예요. 큰 사건은 없어도 마음이 내내 따뜻할 거예요.",
  "오늘은 아이디어가 퐁퐁 솟는 날이에요. 떠오른 생각은 바로 적어 두세요, 보석일 수 있어요.",
  "그동안의 노력이 슬쩍 티가 나기 시작하는 하루예요. 누군가 당신을 눈여겨보고 있습니다.",
];

// 행운의 색
const COLORS = [
  "민트색", "코랄 핑크", "라벤더", "레몬 옐로우", "하늘색", "청록색",
  "살구색", "진한 남색", "올리브 그린", "자몽색", "버건디", "크림 아이보리",
  "로즈 골드", "터콰이즈", "머스터드 옐로우", "연보라", "체리 레드", "카키 그린",
  "스카이 블루", "복숭아색", "에메랄드 그린", "파스텔 블루", "딸기우유색", "짙은 초록",
];

// 행운의 아이템
const ITEMS = [
  "텀블러", "손수건", "무선 이어폰", "작은 수첩", "향기 좋은 핸드크림", "알록달록한 볼펜",
  "미니 선인장", "좋아하는 노래 플레이리스트", "반짝이는 열쇠고리", "새 양말 한 켤레", "접이식 우산", "파란 마스킹테이프",
  "동전 지갑", "편한 운동화", "작은 손거울", "립밤", "포스트잇 한 묶음", "좋아하는 머그컵",
  "캔버스 에코백", "손목시계", "향초", "귀여운 스티커", "따뜻한 목도리", "물병",
];

// 오늘의 조언 한마디
const ADVICE = [
  "오늘은 망설이지 말고 먼저 인사를 건네 보세요.",
  "점심은 평소 안 먹던 메뉴에 한번 도전해 보세요.",
  "고맙다는 말을 아끼지 마세요, 두 배로 돌아옵니다.",
  "미뤄 둔 연락 하나, 오늘 해치우면 마음이 개운해져요.",
  "물을 자주 마시고, 창밖도 한 번씩 봐 주세요.",
  "오늘은 결정을 너무 오래 고민하지 마세요, 첫 느낌이 대체로 맞아요.",
  "작은 성공도 소리 내어 스스로 축하해 주세요.",
  "계획대로 안 돼도 웃어넘기면 그게 오늘의 승리예요.",
  "좋아하는 노래 한 곡, 오늘 이동하는 길에 꼭 들어 보세요.",
  "지갑 속 안 쓰는 카드나 영수증을 한 번 정리해 보세요.",
  "오늘은 남의 말을 끝까지 들어 주는 사람이 되어 보세요.",
  "칭찬 한마디를 준비해 뒀다가 누군가에게 슬쩍 건네 보세요.",
  "무리하지 말고, 10분 일찍 쉬는 여유를 챙기세요.",
  "오늘 떠오른 아이디어는 그냥 흘리지 말고 적어 두세요.",
  "엘리베이터 대신 계단, 딱 한 층만 걸어 보세요.",
  "오늘은 그럴 수도 있지 하고 가볍게 넘겨 보세요, 마음이 한결 편해져요.",
  "아침에 이불부터 정리하면 하루가 정돈된 기분으로 시작돼요.",
  "오늘은 스스로에게 작은 선물을 하나 사 주세요.",
  "급할수록 심호흡 한 번, 그다음에 움직이세요.",
  "오래 미룬 그 한 걸음, 오늘은 반 걸음만이라도 떼어 보세요.",
  "오늘은 휴대폰을 잠깐 내려놓고 하늘을 한 번 올려다보세요.",
  "만나는 사람의 이름을 한 번씩 불러 주세요, 분위기가 달라집니다.",
  "오늘의 실수는 내일의 이야깃거리라고 생각하세요.",
  "자기 전에 오늘 좋았던 일 세 가지를 떠올려 보세요.",
];

// 운세 등급 (오미쿠지 같은 재미 요소). 전부 긍정적이고 유쾌하게.
const GRADES = [
  { label: "대길", note: "오늘 하루, 우주가 살짝 당신 편이에요." },
  { label: "중길", note: "기분 좋게 순항하는 하루예요." },
  { label: "소길", note: "소소하지만 확실한 행운이 함께해요." },
  { label: "은근길", note: "티 안 나게 스며드는 행운이에요." },
  { label: "반전길", note: "시작은 평범해도 끝이 짜릿할 거예요." },
  { label: "무난길", note: "큰 파도 없이 편안하게 흘러가요." },
];

export default async function (
  input: { name?: string; date?: string },
  _ctx: unknown,
) {
  const rawName = input?.name ? String(input.name) : "";
  const name = rawName.trim().replace(/\s+/g, " ");

  const date = input?.date ? String(input.date).trim() : todayYMD();
  if (!isValidYMD(date)) throw new Error("date 는 YYYY-MM-DD 형식이어야 한다");

  const weekday = weekdayKo(date);
  const key = `${name}|${date}`;

  const grade = GRADES[idx(key, 101, GRADES.length)];
  const overall = OVERALL[idx(key, 202, OVERALL.length)];
  const lucky_color = COLORS[idx(key, 303, COLORS.length)];
  const lucky_item = ITEMS[idx(key, 404, ITEMS.length)];
  const advice = ADVICE[idx(key, 505, ADVICE.length)];
  const lucky_number = (cyrb53(key, 606) % 45) + 1;

  const header = name
    ? `${name}님의 ${date}(${weekday}) 운세`
    : `${date}(${weekday}) 오늘의 운세`;

  const 안내 = [
    header,
    `운세 등급: ${grade.label} (${grade.note})`,
    `오늘의 총운: ${overall}`,
    `행운의 숫자: ${lucky_number}`,
    `행운의 색: ${lucky_color}`,
    `행운의 아이템: ${lucky_item}`,
    `오늘의 조언: ${advice}`,
  ].join("\n");

  return {
    name: name || null,
    date,
    weekday,
    grade,
    overall,
    lucky_number,
    lucky_color,
    lucky_item,
    advice,
    안내,
  };
}
