/* ==========================================================
   lfld-deduplicate.js — МОДУЛЬ ТОТАЛЬНОЙ ДЕДУПЛИКАЦИИ ЛФЛД
   Версия: 5.2
   
   ПРАВКИ v5.2:
   - Галеев в «Комета» = ДАЛИЛ (а не Руслан/Айдар)
   - Нагорнов «ПТИМАШ» = МАКСИМ ≠ Нагорнов «Химмаш»/«МИФИ» = ИЛЬЯ
     (это разные люди, объединение ЗАПРЕЩЕНО)
   - Клубный барьер для однофамильцев жёсткий:
     * Галеев/Алексеев Спринт ≠ Галеев/Алексеев Комета
     * Нагорнов ПТИМАШ ≠ Нагорнов Химмаш/МИФИ
   ========================================================== */

/* ============================================================
   1. КАНОНИЧЕСКИЙ РЕЕСТР
   Ключ: matchSur (фамилия или фамилия+инициал) + team → полное ФИО + амплуа
   ============================================================ */
const CANONICAL_PLAYERS_MAP = [
  /* ---------- ПТИМАШ ---------- */
  { matchSur: "антонов", team: "ПТИМАШ", full: "Антонов Дмитрий", pos: "НАП" },
  { matchSur: "антонов д", team: "ПТИМАШ", full: "Антонов Дмитрий", pos: "НАП" },
  { matchSur: "туктаров", team: "ПТИМАШ", full: "Туктаров Салават", pos: "НАП" },
  { matchSur: "панкратов", team: "ПТИМАШ", full: "Панкратов Николай", pos: "ЗАЩ" },
  { matchSur: "юдин", team: "ПТИМАШ", full: "Юдин Дмитрий", pos: "ЗАЩ" },
  { matchSur: "иванов п", team: "ПТИМАШ", full: "Иванов Павел", pos: "УНИ" },
  { matchSur: "валуйских", team: "ПТИМАШ", full: "Валуйских Егор", pos: "УНИ" },
  { matchSur: "елисеев", team: "ПТИМАШ", full: "Елисеев Никита", pos: "ВРТ" },
  { matchSur: "шагеев", team: "ПТИМАШ", full: "Шагеев Артур", pos: "УНИ" },
  { matchSur: "абдулганеев", team: "ПТИМАШ", full: "Абдулганеев Руслан", pos: "УНИ" },
  // ⚡ ВАЖНО: Нагорнов ПТИМАШ = МАКСИМ (другой человек, не Илья!)
  { matchSur: "нагорнов", team: "ПТИМАШ", full: "Нагорнов Максим", pos: "НАП" },
  { matchSur: "нагорнов м", team: "ПТИМАШ", full: "Нагорнов Максим", pos: "НАП" },
  { matchSur: "нагорнов максим", team: "ПТИМАШ", full: "Нагорнов Максим", pos: "НАП" },
  { matchSur: "вафин", team: "ПТИМАШ", full: "Вафин Динар", pos: "УНИ" },
  { matchSur: "сидоров", team: "ПТИМАШ", full: "Сидоров Дмитрий", pos: "УНИ" },
  { matchSur: "шевченко", team: "ПТИМАШ", full: "Шевченко Илья", pos: "УНИ" },

  /* ---------- МЕТАЛЛИСТ / МЕТАЛЛИСТ-М ---------- */
  { matchSur: "манонов с", team: "Металлист", full: "Манонов Самандар Носирджонович", pos: "ПЗ" },
  { matchSur: "манонов самандар", team: "Металлист", full: "Манонов Самандар Носирджонович", pos: "ПЗ" },
  { matchSur: "манонов р", team: "Металлист", full: "Манонов Рустам Носирджонович", pos: "ПЗ" },
  { matchSur: "манонов рустам", team: "Металлист", full: "Манонов Рустам Носирджонович", pos: "ПЗ" },
  { matchSur: "гладышев", team: "Металлист", full: "Гладышев Максим Евгеньевич", pos: "УНИ" },
  { matchSur: "гладышев", team: "Металлист-М", full: "Гладышев Максим Евгеньевич", pos: "УНИ" },
  { matchSur: "сайфуллин", team: "Металлист", full: "Сайфуллин Данис Денисович", pos: "УНИ" },
  { matchSur: "сайфуллин д", team: "Металлист", full: "Сайфуллин Данис Денисович", pos: "УНИ" },
  { matchSur: "степанов", team: "Металлист", full: "Степанов Савелий Сергеевич", pos: "ЗАЩ" },
  { matchSur: "степанов с", team: "Металлист", full: "Степанов Савелий Сергеевич", pos: "ЗАЩ" },
  { matchSur: "юсупов м", team: "Металлист", full: "Юсупов Марат Растямович", pos: "УНИ" },
  { matchSur: "юсупов марат", team: "Металлист", full: "Юсупов Марат Растямович", pos: "УНИ" },
  { matchSur: "юсупов р", team: "Металлист", full: "Юсупов Руслан Ильшатович", pos: "НАП" },
  { matchSur: "юсупов руслан", team: "Металлист", full: "Юсупов Руслан Ильшатович", pos: "НАП" },
  { matchSur: "бутяев", team: "Металлист", full: "Бутяев Сергей", pos: "НАП" },
  { matchSur: "аряпов", team: "Металлист", full: "Аряпов Даниил", pos: "АТК" },
  { matchSur: "зимарев", team: "Металлист", full: "Зимарев Сергей", pos: "НАП" },
  { matchSur: "буткеев", team: "Металлист", full: "Буткеев Сергей", pos: "ЗАЩ" },
  { matchSur: "драгин", team: "Металлист", full: "Драгин Михаил", pos: "УНИ" },
  { matchSur: "дрягин", team: "Металлист", full: "Дрягин Михаил", pos: "УНИ" },
  { matchSur: "косолапов", team: "Металлист", full: "Косолапов Алексей", pos: "УНИ" },
  { matchSur: "абдулманов", team: "Металлист", full: "Абдулманов Эдуард", pos: "УНИ" },
  { matchSur: "абдулманов", team: "Металлист-М", full: "Абдулманов Эдуард", pos: "УНИ" },
  { matchSur: "иванов а", team: "Металлист", full: "Иванов Андрей Петрович", pos: "ЗАЩ" },
  { matchSur: "маланьин", team: "Металлист", full: "Маланьин Денис", pos: "ЗАЩ" },
  { matchSur: "королев", team: "Металлист", full: "Королёв Никита", pos: "НАП" },
  { matchSur: "королёв", team: "Металлист", full: "Королёв Никита", pos: "НАП" },
  { matchSur: "исаев", team: "Металлист", full: "Исаев Михаил Будагович", pos: "ПЗ" },
  { matchSur: "летюшев", team: "Металлист", full: "Летюшев Дмитрий", pos: "ПЗ" },
  { matchSur: "гарбуз", team: "Металлист", full: "Гарбуз Яков", pos: "УНИ" },
  { matchSur: "сутырин", team: "Металлист", full: "Сутырин Илья", pos: "ЗАЩ" },
  { matchSur: "пономарев", team: "Металлист", full: "Пономарёв Максим", pos: "ЗАЩ" },
  { matchSur: "пономарёв", team: "Металлист", full: "Пономарёв Максим", pos: "ЗАЩ" },

  /* ---------- ХИММАШ / АК БАРС ---------- */
  { matchSur: "аксенов", team: "Химмаш", full: "Аксенов Амир", pos: "УНИ" },
  { matchSur: "аксёнов", team: "Химмаш", full: "Аксенов Амир", pos: "УНИ" },
  { matchSur: "аксенов", team: "Ак Барс", full: "Аксенов Амир", pos: "УНИ" },
  { matchSur: "аксёнов", team: "Ак Барс", full: "Аксенов Амир", pos: "УНИ" },
  { matchSur: "аксенов а", team: "Химмаш", full: "Аксенов Амир", pos: "УНИ" },
  { matchSur: "раджабов", team: "Химмаш", full: "Раджабов Анис", pos: "НАП" },
  { matchSur: "сыч", team: "Химмаш", full: "Сыч Руслан", pos: "УНИ" },
  { matchSur: "абдулхаков", team: "Химмаш", full: "Абдулхаков Ринат", pos: "НАП" },
  { matchSur: "мазилкин", team: "Ак Барс", full: "Мазилкин Дмитрий", pos: "НАП" },
  { matchSur: "шагеев", team: "Химмаш", full: "Шагеев Артур", pos: "УНИ" },
  // ⚡ ВАЖНО: Нагорнов Химмаш = ИЛЬЯ (другой человек, не Максим!)
  { matchSur: "нагорнов", team: "Химмаш", full: "Нагорнов Илья", pos: "ЗАЩ" },
  { matchSur: "нагорнов и", team: "Химмаш", full: "Нагорнов Илья", pos: "ЗАЩ" },
  { matchSur: "нагорнов илья", team: "Химмаш", full: "Нагорнов Илья", pos: "ЗАЩ" },
  { matchSur: "галиев", team: "Химмаш", full: "Галиев Амир", pos: "ЗАЩ" },
  { matchSur: "хализов", team: "Химмаш", full: "Хализов Артем", pos: "ПЗ" },
  { matchSur: "афанасьев", team: "Химмаш", full: "Афанасьев Ян", pos: "УНИ" },
  { matchSur: "фасахов", team: "Химмаш", full: "Фасахов Артур", pos: "УНИ" },

  /* ---------- ДИТИ НИЯУ МИФИ ---------- */
  { matchSur: "поляков", team: "МИФИ", full: "Поляков Александр Викторович", pos: "ЗАЩ" },
  { matchSur: "поляков а", team: "МИФИ", full: "Поляков Александр Викторович", pos: "ЗАЩ" },
  { matchSur: "поляков", team: "ДИТИ НИЯУ МИФИ", full: "Поляков Александр Викторович", pos: "ЗАЩ" },
  { matchSur: "поляков а", team: "ДИТИ НИЯУ МИФИ", full: "Поляков Александр Викторович", pos: "ЗАЩ" },
  { matchSur: "васин", team: "ДИТИ НИЯУ МИФИ", full: "Васин Егор Евгеньевич", pos: "НАП" },
  { matchSur: "гетманов", team: "ДИТИ НИЯУ МИФИ", full: "Гетманов Артём Алексеевич", pos: "НАП" },
  { matchSur: "рушкин", team: "ДИТИ НИЯУ МИФИ", full: "Рушкин Евгений Александрович", pos: "ЗАЩ" },

  /* ---------- СПРИНТ (однофамильцы со своими именами) ---------- */
  { matchSur: "демьянов", team: "Спринт", full: "Демьянов Алексей", pos: "ПЗ" },
  { matchSur: "алексеев", team: "Спринт", full: "Алексеев Евгений", pos: "НАП" },
  { matchSur: "алексеев е", team: "Спринт", full: "Алексеев Евгений", pos: "НАП" },
  { matchSur: "галеев", team: "Спринт", full: "Галеев Айдар", pos: "АТК" },
  { matchSur: "галеев а", team: "Спринт", full: "Галеев Айдар", pos: "АТК" },
  { matchSur: "тимаков", team: "Спринт", full: "Тимаков Владислав", pos: "УНИ" },
  { matchSur: "сабиров", team: "Спринт", full: "Сабиров Руслан", pos: "ПЗ" },
  { matchSur: "камалтдинов", team: "Спринт", full: "Камалтдинов Ильяз", pos: "УНИ" },
  { matchSur: "жандаров", team: "Спринт", full: "Жандаров Илья", pos: "УНИ" },
  { matchSur: "жандармов", team: "Спринт", full: "Жандаров Илья", pos: "УНИ" },
  { matchSur: "гебейдуллов", team: "Спринт", full: "Гебейдуллов Рамиль", pos: "УНИ" },
  { matchSur: "желябин", team: "Спринт", full: "Желябин Игорь", pos: "ЗАЩ" },
  { matchSur: "сурков", team: "Спринт", full: "Сурков Артём", pos: "ЗАЩ" },
  { matchSur: "хрестинин", team: "Спринт", full: "Хрестинин Сергей", pos: "ЗАЩ" },

  /* ---------- КОМЕТА (свои однофамильцы: Алексеев, Галеев) ---------- */
  { matchSur: "самарцев", team: "Комета", full: "Самарцев Александр", pos: "НАП" },
  { matchSur: "васин", team: "Комета", full: "Васин Андрей", pos: "УНИ" },
  { matchSur: "светличный", team: "Комета", full: "Светличный Даниил", pos: "УНИ" },
  { matchSur: "алексеев", team: "Комета", full: "Алексеев Матвей", pos: "НАП" },
  { matchSur: "алексеев м", team: "Комета", full: "Алексеев Матвей", pos: "НАП" },
  { matchSur: "алексеев матвей", team: "Комета", full: "Алексеев Матвей", pos: "НАП" },
  // ⚡ ВАЖНО: Галеев в «Комета» = ДАЛИЛ (не Айдар, не Руслан!)
  { matchSur: "галеев", team: "Комета", full: "Галеев Далил", pos: "УНИ" },
  { matchSur: "галеев д", team: "Комета", full: "Галеев Далил", pos: "УНИ" },
  { matchSur: "галеев далил", team: "Комета", full: "Галеев Далил", pos: "УНИ" },
  { matchSur: "абдулхаков", team: "Комета", full: "Абдулхаков Ринат", pos: "НАП" },
  { matchSur: "аскаржонов", team: "Комета", full: "Аскаржонов Абубакир", pos: "УНИ" },
  { matchSur: "королев", team: "Комета", full: "Королёв Никита", pos: "НАП" },
  { matchSur: "королёв", team: "Комета", full: "Королёв Никита", pos: "НАП" },
  { matchSur: "шагеев", team: "Комета", full: "Шагеев Артур", pos: "УНИ" },

  /* ---------- КАБО-ВЕРДЕ ---------- */
  { matchSur: "трефилов", team: "Кабо-Верде", full: "Трефилов Дмитрий", pos: "НАП" },
  { matchSur: "шарипов", team: "Кабо-Верде", full: "Шарипов Альберт", pos: "НАП" },
  { matchSur: "смазин", team: "Кабо-Верде", full: "Смазин Сергей", pos: "ПЗ" },
  { matchSur: "числов", team: "Кабо-Верде", full: "Числов Владислав", pos: "УНИ" },
  { matchSur: "борисов", team: "Кабо-Верде", full: "Борисов Никита", pos: "НАП" },
  { matchSur: "мильчаков", team: "Кабо-Верде", full: "Мильчаков Алексей", pos: "НАП" },
  { matchSur: "сафин", team: "Кабо-Верде", full: "Сафин Ильнар", pos: "УНИ" },
  { matchSur: "абдулганеев", team: "Кабо-Верде", full: "Абдулганеев Руслан", pos: "УНИ" },
  { matchSur: "хайруллов", team: "Кабо-Верде", full: "Хайруллов Ильдар", pos: "УНИ" },

  /* ---------- НЕЙТРОН ---------- */
  { matchSur: "санатуллин", team: "Нейтрон", full: "Санатуллин Руслан", pos: "НАП" },
  { matchSur: "герасимов", team: "Нейтрон", full: "Герасимов Владислав", pos: "НАП" },
  { matchSur: "ломовский", team: "Нейтрон", full: "Ломовский Кирилл", pos: "УНИ" },
  { matchSur: "мустафин", team: "Нейтрон", full: "Мустафин Алмаз", pos: "УНИ" },
  { matchSur: "пайдулов", team: "Нейтрон", full: "Пайдулов Андрей", pos: "УНИ" },
  { matchSur: "доронин", team: "Нейтрон", full: "Доронин Кирилл", pos: "НАП" },
  { matchSur: "булычев", team: "Нейтрон", full: "Булычев Сергей", pos: "УНИ" },
  { matchSur: "сагдиев", team: "Нейтрон", full: "Сагдиев Линар", pos: "УНИ" },
  { matchSur: "смелов", team: "Нейтрон", full: "Смелов Денис", pos: "УНИ" },
  { matchSur: "палёнов", team: "Нейтрон", full: "Палёнов Александр", pos: "УНИ" },
  { matchSur: "паленов", team: "Нейтрон", full: "Палёнов Александр", pos: "УНИ" },

  /* ---------- НЕФТЧИ / АВТОСТАР / СШ ЛАДА ---------- */
  { matchSur: "федоров", team: "Нефтчи", full: "Федоров Максим", pos: "УНИ" },
  { matchSur: "фёдоров", team: "Нефтчи", full: "Федоров Максим", pos: "УНИ" },
  { matchSur: "шарипов", team: "Нефтчи", full: "Шарипов Альберт", pos: "НАП" },
  { matchSur: "кириченко", team: "Нефтчи", full: "Кириченко Валерий", pos: "УНИ" },
  { matchSur: "багиров", team: "Нефтчи", full: "Багиров Дмитрий", pos: "УНИ" },
  { matchSur: "трефилов", team: "Автостар", full: "Трефилов Дмитрий", pos: "НАП" },
  { matchSur: "лукьянов", team: "Автостар", full: "Лукьянов Вячеслав", pos: "УНИ" },
  { matchSur: "мустафин", team: "Автостар", full: "Мустафин Алмаз", pos: "УНИ" },
  { matchSur: "гредин", team: "СШ Лада", full: "Гредин Сергей", pos: "НАП" },
  { matchSur: "калимуллин", team: "СШ Лада", full: "Калимуллин Риналь", pos: "НАП" },

  /* ---------- АВАНГАРД ---------- */
  { matchSur: "забиров", team: "Авангард", full: "Забиров Рамис Рашидович", pos: "УНИ" },
  { matchSur: "раджабов", team: "Авангард", full: "Раджабов Анис Абдурахимович", pos: "УНИ" },
  { matchSur: "савин", team: "Авангард", full: "Савин Тимофей Евгеньевич", pos: "УНИ" },
  { matchSur: "тарвердиев", team: "Авангард", full: "Тарвердиев Нариман", pos: "УНИ" }
];

/* ============================================================
   2. НОРМАЛИЗАЦИЯ
   ============================================================ */
function normStr(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/gi, '')
    .trim();
}

function normWords(str) {
  if (!str) return [];
  return String(str)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/* ============================================================
   3. ПОИСК КАНОНИЧЕСКОГО ИГРОКА (фамилия + клуб)
   ============================================================ */
function findCanonicalPlayer(rawName, team) {
  if (!rawName) return null;
  const evNorm = normStr(rawName);
  const teamNorm = normStr(team);

  function teamMatches(cTeamNorm) {
    if (!cTeamNorm) return true;
    if (cTeamNorm === teamNorm) return true;
    if (teamNorm.indexOf(cTeamNorm) !== -1) return true;
    if (cTeamNorm.indexOf(teamNorm) !== -1) return true;
    // Особый случай: «МИФИ» ↔ «ДИТИ НИЯУ МИФИ»
    if ((cTeamNorm.indexOf('мифи') !== -1) && (teamNorm.indexOf('мифи') !== -1)) return true;
    return false;
  }

  // 1. Точное совпадение имени + команды
  let found = CANONICAL_PLAYERS_MAP.find(function (c) {
    return evNorm === normStr(c.matchSur) && teamMatches(normStr(c.team));
  });
  if (found) return found;

  // 2. Совпадение по началу + команда
  found = CANONICAL_PLAYERS_MAP.find(function (c) {
    const cSurNorm = normStr(c.matchSur);
    return evNorm.indexOf(cSurNorm) === 0 && teamMatches(normStr(c.team));
  });
  if (found) return found;

  // 3. Совпадение по фамилии без команды (для одиночных упоминаний)
  found = CANONICAL_PLAYERS_MAP.find(function (c) {
    return evNorm === normStr(c.matchSur);
  });
  return found || null;
}

function canonicalizePlayerName(rawName, team) {
  const found = findCanonicalPlayer(rawName, team);
  return found ? found.full : rawName;
}

/* ============================================================
   4. ПЕРЕЗАПИСЬ СТРОКИ scorers — короткие фамилии → канонические
   ============================================================ */
function rewriteScorersString(scorersStr, team1, team2) {
  if (!scorersStr || typeof scorersStr !== 'string') return scorersStr;

  const t1 = team1 || '';
  const t2 = team2 || '';

  return scorersStr.split(';').map(function (part) {
    part = part.trim();
    if (!part) return part;

    const ci = part.indexOf(':');
    if (ci === -1) return part;

    const rawClub = part.slice(0, ci).trim();
    const rest = part.slice(ci + 1).trim();

    const clubNorm = normStr(rawClub);
    let currentTeam = '';
    if (clubNorm === normStr(t1) || normStr(t1).indexOf(clubNorm) !== -1 || clubNorm.indexOf(normStr(t1)) !== -1) {
      currentTeam = t1;
    } else if (clubNorm === normStr(t2) || normStr(t2).indexOf(clubNorm) !== -1 || clubNorm.indexOf(normStr(t2)) !== -1) {
      currentTeam = t2;
    } else {
      return part;
    }

    /* Извлекаем КК и ЖК */
    let redPart = '';
    let yellowPart = '';
    let workRest = rest;

    const kkIdx = workRest.indexOf('КК:');
    if (kkIdx !== -1) {
      redPart = workRest.slice(kkIdx + 3).trim();
      workRest = workRest.slice(0, kkIdx).replace(/,\s*$/, '').trim();
    }

    const zhkIdx = workRest.indexOf('ЖК:');
    if (zhkIdx !== -1) {
      yellowPart = workRest.slice(zhkIdx + 3).trim();
      workRest = workRest.slice(0, zhkIdx).replace(/,\s*$/, '').trim();
    }

    /* Голы: разбиваем по запятой */
    const goals = workRest.split(',').map(function (token) {
      token = token.trim();
      if (!token) return '';
      if (/автогол|\(аг\)|техническ/i.test(token)) return token;

      let assist = '';
      let main = token;
      if (main.indexOf('/') !== -1) {
        const parts = main.split('/');
        main = parts[0].trim();
        assist = parts.slice(1).join('/').trim();
      }

      let countStr = '';
      const cMatch = main.match(/\((\d+)\)/);
      if (cMatch) {
        countStr = ' (' + cMatch[1] + ')';
        main = main.replace(/\(\d+\)/, '').trim();
      }

      const canonName = canonicalizePlayerName(main, currentTeam);
      let result = canonName + countStr;

      if (assist) {
        const canonAssist = canonicalizePlayerName(assist, currentTeam);
        result += '/' + canonAssist;
      }
      return result;
    }).filter(Boolean).join(', ');

    const yArr = yellowPart ? yellowPart.split(',').map(function (t) {
      const nm = t.trim();
      if (!nm) return '';
      return canonicalizePlayerName(nm, currentTeam);
    }).filter(Boolean) : [];

    const rArr = redPart ? redPart.split(',').map(function (t) {
      const nm = t.trim();
      if (!nm) return '';
      return canonicalizePlayerName(nm, currentTeam);
    }).filter(Boolean) : [];

    let result = rawClub + ': ' + (goals || '—');
    if (yArr.length) result += ', ЖК: ' + yArr.join(', ');
    if (rArr.length) result += ', КК: ' + rArr.join(', ');
    return result;
  }).join('; ');
}

/* ============================================================
   5. ГЛАВНАЯ ФУНКЦИЯ ЧИСТКИ
   ============================================================ */
window.executeFullDatabaseCleanup = function () {
  const db = window.LFLD_MASTER_DB;
  if (!db) {
    console.warn('[LFLD Cleanup] window.LFLD_MASTER_DB не найден');
    return { changed: 0 };
  }

  console.log('[LFLD Cleanup v5.2] Запуск дедупликации...');
  let totalRenamed = 0;

  /* ---------- А. cup_5x5 (плоский players) ---------- */
  if (db.cup_5x5 && Array.isArray(db.cup_5x5.players)) {
    db.cup_5x5.players.forEach(function (p) {
      if (!p || !p.name) return;
      const canonName = canonicalizePlayerName(p.name, p.team || '');
      if (canonName && canonName !== p.name) {
        p.name = canonName;
        totalRenamed++;
      }
      const found = findCanonicalPlayer(p.name, p.team || '');
      if (found && found.pos && found.pos !== 'УНИ') p.pos = found.pos;
    });

    const seenCup = new Set();
    db.cup_5x5.players = db.cup_5x5.players.filter(function (p) {
      if (!p || !p.name) return false;
      const key = normStr(p.name) + '|' + normStr(p.team || '');
      if (seenCup.has(key)) return false;
      seenCup.add(key);
      return true;
    });
  }

  /* ---------- Б. Турниры с teams ---------- */
  const TOURNEYS_WITH_TEAMS = ['tournament_5x5', 'tournament_7x7', 'tournament_night'];

  TOURNEYS_WITH_TEAMS.forEach(function (tKey) {
    const tourney = db[tKey];
    if (!tourney || !tourney.teams) return;

    Object.keys(tourney.teams).forEach(function (teamName) {
      const teamArr = tourney.teams[teamName];
      if (!Array.isArray(teamArr)) return;

      teamArr.forEach(function (p) {
        if (!p || !p.name) return;
        const canonName = canonicalizePlayerName(p.name, teamName);
        if (canonName && canonName !== p.name) {
          p.name = canonName;
          totalRenamed++;
        }
        const found = findCanonicalPlayer(p.name, teamName);
        if (found && found.pos && found.pos !== 'УНИ') {
          if (!p.pos || p.pos === 'УНИ') p.pos = found.pos;
        }
      });

      const seenTeam = new Set();
      tourney.teams[teamName] = teamArr.filter(function (p) {
        if (!p || !p.name) return false;
        const key = normStr(p.name);
        if (seenTeam.has(key)) return false;
        seenTeam.add(key);
        return true;
      });
    });

    /* ---------- В. Протоколы матчей ---------- */
    if (Array.isArray(tourney.matches)) {
      tourney.matches.forEach(function (m) {
        ['eventsHome', 'eventsAway'].forEach(function (side) {
          if (!Array.isArray(m[side])) return;
          const currentTeam = side === 'eventsHome'
            ? (m.teamHome || m.t1 || '')
            : (m.teamAway || m.t2 || '');
          m[side].forEach(function (ev) {
            if (!ev || !ev.player) return;
            const canonName = canonicalizePlayerName(ev.player, currentTeam);
            if (canonName && canonName !== ev.player) {
              ev.player = canonName;
              totalRenamed++;
            }
            if (ev.assist) {
              const canonAssist = canonicalizePlayerName(ev.assist, currentTeam);
              if (canonAssist && canonAssist !== ev.assist) {
                ev.assist = canonAssist;
                totalRenamed++;
              }
            }
          });
        });

        if (m.scorers && typeof m.scorers === 'string') {
          m.scorers = rewriteScorersString(m.scorers, m.t1 || m.teamHome, m.t2 || m.teamAway);
        }
      });
    }
  });

  /* ---------- Г. Обёртка db.tournaments (если есть) ---------- */
  if (db.tournaments && typeof db.tournaments === 'object') {
    Object.values(db.tournaments).forEach(function (tourney) {
      if (!tourney) return;

      if (Array.isArray(tourney.players)) {
        tourney.players.forEach(function (p) {
          if (!p || !p.name) return;
          const canonName = canonicalizePlayerName(p.name, p.team || '');
          if (canonName && canonName !== p.name) {
            p.name = canonName;
            totalRenamed++;
          }
          const found = findCanonicalPlayer(p.name, p.team || '');
          if (found && found.pos && found.pos !== 'УНИ') {
            if (!p.pos || p.pos === 'УНИ') p.pos = found.pos;
          }
        });

        const seen = new Set();
        tourney.players = tourney.players.filter(function (p) {
          if (!p || !p.name) return false;
          const key = normStr(p.name) + '|' + normStr(p.team || '');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      if (Array.isArray(tourney.matches)) {
        tourney.matches.forEach(function (m) {
          ['eventsHome', 'eventsAway'].forEach(function (side) {
            if (!Array.isArray(m[side])) return;
            const currentTeam = side === 'eventsHome'
              ? (m.teamHome || m.t1 || '')
              : (m.teamAway || m.t2 || '');
            m[side].forEach(function (ev) {
              if (!ev || !ev.player) return;
              const canonName = canonicalizePlayerName(ev.player, currentTeam);
              if (canonName && canonName !== ev.player) {
                ev.player = canonName;
                totalRenamed++;
              }
            });
          });

          if (m.scorers && typeof m.scorers === 'string') {
            m.scorers = rewriteScorersString(m.scorers, m.t1 || m.teamHome, m.t2 || m.teamAway);
          }
        });
      }
    });
  }

  /* ---------- Д. Синхронизация публичного window.tournamentsData ---------- */
  if (window.tournamentsData && typeof window.tournamentsData === 'object') {
    Object.keys(window.tournamentsData).forEach(function (tk) {
      const t = window.tournamentsData[tk];
      if (!t) return;

      if (Array.isArray(t.matches)) {
        t.matches.forEach(function (m) {
          if (m.scorers && typeof m.scorers === 'string') {
            m.scorers = rewriteScorersString(m.scorers, m.t1, m.t2);
          }
        });
      }

      if (t.playoff && Array.isArray(t.playoff.matches)) {
        t.playoff.matches.forEach(function (m) {
          if (m.scorers && typeof m.scorers === 'string') {
            m.scorers = rewriteScorersString(m.scorers, m.t1, m.t2);
          }
        });
      }
    });

    if (window.saveTournamentsToStorage) {
      try { window.saveTournamentsToStorage(); } catch (e) {}
    }
  }

  /* ---------- Е. Чистка клонов в window.database.players() ---------- */
  if (window.database && window.database.players) {
    try {
      var dbPlayers = window.database.players();
      var groups = {};
      Object.keys(dbPlayers).forEach(function (id) {
        var p = dbPlayers[id];
        if (!p) return;
        var ln = (p.lastName || '').toLowerCase().replace(/ё/g, 'е').trim();
        if (!ln) return;
        if (!groups[ln]) groups[ln] = [];
        groups[ln].push({ id: id, player: p });
      });

      Object.keys(groups).forEach(function (ln) {
        var list = groups[ln];
        if (list.length < 2) return;
        list.sort(function (a, b) {
          var la = [a.player.lastName, a.player.firstName, a.player.middleName].filter(Boolean).join(' ').length;
          var lb = [b.player.lastName, b.player.firstName, b.player.middleName].filter(Boolean).join(' ').length;
          return lb - la;
        });
        var canonical = list[0].player;
        for (var i = 1; i < list.length; i++) {
          var dup = list[i];
          var aClubs = (canonical.clubs || []).map(normStr);
          var bClubs = (dup.player.clubs || []).map(normStr);
          var overlap = aClubs.some(function (c) { return bClubs.indexOf(c) !== -1; });
          if (overlap || bClubs.length === 0 || aClubs.length === 0) {
            canonical.aliases = canonical.aliases || [];
            (dup.player.aliases || []).forEach(function (al) {
              if (canonical.aliases.indexOf(al) === -1) canonical.aliases.push(al);
            });
            if (dup.player.photo && !canonical.photo) canonical.photo = dup.player.photo;
            if (dup.player.birthDate && !canonical.birthDate) canonical.birthDate = dup.player.birthDate;
            if (dup.player.position && dup.player.position !== 'УНИ' && (!canonical.position || canonical.position === 'УНИ')) {
              canonical.position = dup.player.position;
            }
            delete dbPlayers[dup.id];
            totalRenamed++;
          }
        }
      });
      if (window.database.save) window.database.save();
    } catch (e) { console.warn('[LFLD Cleanup] db players merge:', e); }
  }

  console.log('[LFLD Cleanup v5.2] Готово. Изменено записей:', totalRenamed);
  return { changed: totalRenamed };
};

/* ============================================================
   6. ОЧИСТКА SLUG-ТЕГОВ В БЛОКЕ «ТУРНИРЫ» ДОСЬЕ
   ============================================================ */
window.cleanupPlayerTournamentLabels = function (labels) {
  if (!Array.isArray(labels)) return labels;
  const map = {
    '5x5': 'Первенство 5х5 (Лето 2026)',
    '7x7': 'Первенство 7х7 (Весна 2026)',
    'night_league_8x8': 'Ночная лига 8х8 (2026)',
    'cup_5x5': 'Кубок ЛФЛД 5х5 (2026)',
    'cup_metallist_2026': 'Кубок Металлиста (2026)',
    'veterans_40': 'Ветераны 40+ (5х5)'
  };
  const seen = {};
  const out = [];
  labels.forEach(function (lbl) {
    if (!lbl) return;
    const fixed = map[lbl] || lbl;
    const k = fixed.toLowerCase();
    if (seen[k]) return;
    seen[k] = 1;
    out.push(fixed);
  });
  return out;
};

/* ============================================================
   7. АВТОЗАПУСК
   ============================================================ */
(function autoCleanup() {
  function run() {
    try {
      if (window.LFLD_MASTER_DB) {
        window.executeFullDatabaseCleanup();
      }
    } catch (e) {
      console.warn('[LFLD Cleanup] Ошибка автозапуска:', e);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(run, 800);
      setTimeout(run, 2000);
    });
  } else {
    setTimeout(run, 800);
    setTimeout(run, 2000);
  }
})();

console.log('[LFLD Cleanup v5.2] загружен · Галеев(Комета)=Далил · Нагорнов: ПТИМАШ=Максим ≠ Химмаш=Илья');