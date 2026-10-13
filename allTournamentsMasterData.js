  ,

  /* ==========================================================
     5. КУБОК МЕТАЛЛИСТА 2026 (2 дня)
     31.10.2026 — групповой этап
     01.11.2026 — золотой и серебряный плей-офф
     ========================================================== */
  cup_metallist_2026: {
    title: "Кубок Металлиста (2026)",
    format: "8х8",
    status: "announce",
    dates: {
      group: "31.10.2026",
      playoff: "01.11.2026"
    },
    groups: {
      "A": ["Химмаш", "Detali63SMR", "ПТИМАШ", "Ак Барс"],
      "B": ["Металлист", "Тонус", "Авангард", "Спринт"]
    },
    teams: ["Химмаш", "Detali63SMR", "ПТИМАШ", "Ак Барс", "Металлист", "Тонус", "Авангард", "Спринт"],
    matches: [
      /* ===== Групповой этап 31.10.2026 ===== */
      { tour: "ГРУППА", date: "31.10.2026 14:00", t1: "Химмаш",   s1: 0, s2: 0, t2: "Detali63SMR", scorers: "", played: false, status: "upcoming", group: "A" },
      { tour: "ГРУППА", date: "31.10.2026 14:30", t1: "Авангард", s1: 0, s2: 0, t2: "Спринт",      scorers: "", played: false, status: "upcoming", group: "B" },
      { tour: "ГРУППА", date: "31.10.2026 15:00", t1: "ПТИМАШ",   s1: 0, s2: 0, t2: "Ак Барс",     scorers: "", played: false, status: "upcoming", group: "A" },
      { tour: "ГРУППА", date: "31.10.2026 15:30", t1: "Металлист",s1: 0, s2: 0, t2: "Тонус",       scorers: "", played: false, status: "upcoming", group: "B" },
      { tour: "ГРУППА", date: "31.10.2026 16:00", t1: "Химмаш",   s1: 0, s2: 0, t2: "ПТИМАШ",      scorers: "", played: false, status: "upcoming", group: "A" },
      { tour: "ГРУППА", date: "31.10.2026 16:30", t1: "Металлист",s1: 0, s2: 0, t2: "Авангард",    scorers: "", played: false, status: "upcoming", group: "B" },
      { tour: "ГРУППА", date: "31.10.2026 17:00", t1: "Detali63SMR", s1: 0, s2: 0, t2: "Ак Барс",  scorers: "", played: false, status: "upcoming", group: "A" },
      { tour: "ГРУППА", date: "31.10.2026 17:30", t1: "Спринт",   s1: 0, s2: 0, t2: "Тонус",       scorers: "", played: false, status: "upcoming", group: "B" },
      { tour: "ГРУППА", date: "31.10.2026 18:00", t1: "Химмаш",   s1: 0, s2: 0, t2: "Ак Барс",     scorers: "", played: false, status: "upcoming", group: "A" },
      { tour: "ГРУППА", date: "31.10.2026 18:30", t1: "Авангард", s1: 0, s2: 0, t2: "Тонус",       scorers: "", played: false, status: "upcoming", group: "B" },
      { tour: "ГРУППА", date: "31.10.2026 19:00", t1: "ПТИМАШ",   s1: 0, s2: 0, t2: "Detali63SMR", scorers: "", played: false, status: "upcoming", group: "A" },
      { tour: "ГРУППА", date: "31.10.2026 19:30", t1: "Металлист",s1: 0, s2: 0, t2: "Спринт",      scorers: "", played: false, status: "upcoming", group: "B" },

      /* ===== Серебряный плей-офф 01.11.2026 ===== */
      { tour: "СЕРЕБРО 1/2", date: "01.11.2026 12:00", t1: "А3",       s1: 0, s2: 0, t2: "Б4",          scorers: "", played: false, status: "upcoming", bracket: "silver" },
      { tour: "СЕРЕБРО 1/2", date: "01.11.2026 13:00", t1: "А4",       s1: 0, s2: 0, t2: "Б3",          scorers: "", played: false, status: "upcoming", bracket: "silver" },
      { tour: "СЕРЕБРО 3-е", date: "01.11.2026 14:00", t1: "Проигр.1", s1: 0, s2: 0, t2: "Проигр.2",     scorers: "", played: false, status: "upcoming", bracket: "silver" },
      { tour: "СЕРЕБРО ФИНАЛ", date: "01.11.2026 15:00", t1: "Побед.1", s1: 0, s2: 0, t2: "Побед.2",     scorers: "", played: false, status: "upcoming", bracket: "silver" },

      /* ===== Золотой плей-офф 01.11.2026 ===== */
      { tour: "ЗОЛОТО 1/2", date: "01.11.2026 12:30", t1: "А1",        s1: 0, s2: 0, t2: "Б2",         scorers: "", played: false, status: "upcoming", bracket: "gold" },
      { tour: "ЗОЛОТО 1/2", date: "01.11.2026 13:30", t1: "А2",        s1: 0, s2: 0, t2: "Б1",         scorers: "", played: false, status: "upcoming", bracket: "gold" },
      { tour: "ЗОЛОТО 3-е", date: "01.11.2026 14:30", t1: "Проигр.1",  s1: 0, s2: 0, t2: "Проигр.2",    scorers: "", played: false, status: "upcoming", bracket: "gold" },
      { tour: "ЗОЛОТО ФИНАЛ", date: "01.11.2026 15:40", t1: "Побед.1", s1: 0, s2: 0, t2: "Побед.2",     scorers: "", played: false, status: "upcoming", bracket: "gold" }
    ],
    awards: [],
    isCup: true,
    isMetallistCup: true,
    regulation: {
      groupDuration: "2 тайма по 12 минут",
      playoffDuration: "2 тайма по 15 минут",
      goldFirst: "А1 — Б2",
      goldSecond: "А2 — Б1",
      silverFirst: "А3 — Б4",
      silverSecond: "А4 — Б3",
      ceremony: "16:30 — ТОРЖЕСТВЕННОЕ НАГРАЖДЕНИЕ КОМАНД (обязательное присутствие всех участников турнира!)"
    }
  }