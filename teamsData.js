// teamsData.js — Единая база заявок и профилей команд ЛФЛД

const teamsDatabase = {
  "Авангард": {
    city: "г. Димитровград",
    badge: "🛡️",
    photo: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    stats: { p: 0, w: 0, d: 0, l: 0, diff: "0 - 0", pts: 0 },
    leadership: [
      { role: "Руководитель / Капитан", name: "Филатов А. С." }
    ],
    roster: [
      { num: 1, name: "Зитерев Александр Александрович", pos: "ВРТ", birth: "11.05.1992", pastTeams: [] },
      { num: 2, name: "Ахмадеев Марс Маратович", pos: "ВРТ", birth: "10.10.1993", pastTeams: [] },
      { num: 3, name: "Красильников Михаил Сергеевич", pos: "УНИ", birth: "17.11.1992", pastTeams: [] },
      { num: 4, name: "Филатов Александр Сергеевич", pos: "УНИ", birth: "03.11.1995", pastTeams: [] },
      { num: 5, name: "Чернышов Дмитрий Евгеньевич", pos: "УНИ", birth: "03.07.1994", pastTeams: [] },
      { num: 6, name: "Свешников Анатолий Александрович", pos: "УНИ", birth: "25.07.1994", pastTeams: [] },
      { num: 7, name: "Савин Тимофей Евгеньевич", pos: "УНИ", birth: "07.11.2004", pastTeams: [] },
      { num: 8, name: "Хайруллов Рамиль Рафисович", pos: "УНИ", birth: "10.04.1994", pastTeams: [] },
      { num: 9, name: "Бахшиев Заур Айаз Оглы", pos: "УНИ", birth: "14.09.1991", pastTeams: [] },
      { num: 10, name: "Сиразов Рустем Рифхатович", pos: "УНИ", birth: "18.02.1989", pastTeams: [] },
      { num: 11, name: "Раджабов Анис Абдурахимович", pos: "УНИ", birth: "01.09.2003", pastTeams: [] },
      { num: 12, name: "Сангинов Джамшед Турсунбоевич", pos: "УНИ", birth: "11.04.1980", pastTeams: [] },
      { num: 13, name: "Чебаков Роман Васильевич", pos: "УНИ", birth: "08.08.1987", pastTeams: [] },
      { num: 14, name: "Пронин Михаил", pos: "УНИ", birth: "23.02.1999", pastTeams: [] },
      { num: 15, name: "Анисимов Руслан Наильевич", pos: "УНИ", birth: "21.08.1993", pastTeams: [] },
      { num: 16, name: "Ильин Владимир Алексеевич", pos: "УНИ", birth: "15.07.2004", pastTeams: [] },
      { num: 17, name: "Ворогушин Анатолий Сергеевич", pos: "УНИ", birth: "28.04.1989", pastTeams: [] },
      { num: 18, name: "Камалов Марат Ринатович", pos: "УНИ", birth: "26.06.2001", pastTeams: [] },
      { num: 19, name: "Забиров Рамис Рашидович", pos: "УНИ", birth: "30.06.1996", pastTeams: [] }
    ]
  },

  "ДИТИ НИЯУ МИФИ": {
    city: "г. Димитровград",
    badge: "🎓",
    photo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80",
    stats: { p: 0, w: 0, d: 0, l: 0, diff: "0 - 0", pts: 0 },
    leadership: [],
    roster: [
      { num: 1, name: "Мурзайкин Юрий Андреевич", pos: "ВРТ", birth: "13.02.2006", pastTeams: [] },
      { num: 2, name: "Савельев Алексей Андреевич", pos: "ВРТ", birth: "13.04.2001", pastTeams: [] },
      { num: 3, name: "Галиев Амир Радикович", pos: "ЗАЩ", birth: "28.03.2007", pastTeams: [] },
      { num: 4, name: "Нагорнов Илья Александрович", pos: "ЗАЩ", birth: "02.05.2007", pastTeams: [] },
      { num: 5, name: "Поляков Александр Викторович", pos: "ЗАЩ", birth: "01.09.2002", pastTeams: [] },
      { num: 6, name: "Рушкин Евгений Александрович", pos: "ЗАЩ", birth: "01.02.2006", pastTeams: [] },
      { num: 7, name: "Сальников Николай Сергеевич", pos: "ЗАЩ", birth: "07.09.2008", pastTeams: [] },
      { num: 8, name: "Шаталин Даниил Александрович", pos: "ЗАЩ", birth: "20.06.2007", pastTeams: [] },
      { num: 9, name: "Сыч Руслан Эдуардович", pos: "ЗАЩ", birth: "07.08.2003", pastTeams: ["Химмаш (Кубок 5х5)"] },
      { num: 10, name: "Васин Егор Евгеньевич", pos: "НАП", birth: "09.08.2007", pastTeams: [] },
      { num: 11, name: "Вафин Динар Равилевич", pos: "НАП", birth: "26.01.2007", pastTeams: [] },
      { num: 12, name: "Гетманов Артём Алексеевич", pos: "НАП", birth: "12.01.2008", pastTeams: [] },
      { num: 13, name: "Зайцев Савелий Валерьевич", pos: "НАП", birth: "10.02.2007", pastTeams: [] },
      { num: 14, name: "Имамов Эмиль Русланович", pos: "НАП", birth: "18.02.2007", pastTeams: [] },
      { num: 15, name: "Скорняков Илья Андреевич", pos: "НАП", birth: "06.09.2006", pastTeams: [] }
    ]
  },

  "Металлист": {
    city: "г. Димитровград",
    badge: "⚙️",
    photo: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80",
    stats: { p: 7, w: 2, d: 0, l: 5, diff: "31 - 67", pts: 6 },
    leadership: [
      { role: "Капитан / Руководитель", name: "Бутяев Сергей Геннадьевич" },
      { role: "Руководитель", name: "Пономарёв Максим Вячеславович" },
      { role: "Руководитель", name: "Буткеев Сергей Петрович" }
    ],
    roster: [
      { num: 1, name: "Шинкаренко Данил Сергеевич", pos: "ВРТ", birth: "23.03.2008", pastTeams: [] },
      { num: 2, name: "Буткеев Сергей Петрович", pos: "ЗАЩ", birth: "22.12.1988", pastTeams: ["Металлист (Кубок)"] },
      { num: 3, name: "Бутяев Сергей Геннадьевич", pos: "ЗАЩ", birth: "09.09.1998", pastTeams: ["Металлист (Кубок)"] },
      { num: 4, name: "Иванов Андрей Петрович", pos: "ЗАЩ", birth: "09.11.2003", pastTeams: [] },
      { num: 5, name: "Юсупов Марат Растямович", pos: "ПЗ", birth: "20.02.1994", pastTeams: ["Металлист (Финал Кубка)"] },
      { num: 6, name: "Косолапов Алексей Сергеевич", pos: "ПЗ", birth: "28.06.1996", pastTeams: ["Металлист (Кубок)"] },
      { num: 7, name: "Юсупов Руслан Ильшатович", pos: "НАП", birth: "23.12.1997", pastTeams: [] },
      { num: 8, name: "Пономарёв Максим Вячеславович", pos: "ЗАЩ", birth: "25.08.1998", pastTeams: [] },
      { num: 9, name: "Сутырин Илья Дмитриевич", pos: "ЗАЩ", birth: "26.04.2000", pastTeams: [] },
      { num: 10, name: "Исаев Михаил Будагович", pos: "ПЗ", birth: "09.05.1997", pastTeams: [] },
      { num: 11, name: "Нестеров Никита Алексеевич", pos: "НАП", birth: "04.04.1999", pastTeams: [] },
      { num: 12, name: "Коралёв Никита Сергеевич", pos: "НАП", birth: "26.03.2009", pastTeams: [] },
      { num: 13, name: "Атавин Кирилл Станиславович", pos: "ПЗ", birth: "18.07.2003", pastTeams: [] },
      { num: 14, name: "Аряпов Даниил Ренатович", pos: "ПЗ", birth: "10.06.2005", pastTeams: ["Металлист (Кубок)"] },
      { num: 15, name: "Кудашов Дмитрий Александрович", pos: "ВРТ", birth: "05.07.2006", pastTeams: [] },
      { num: 16, name: "Манонов Рустам Носирджонович", pos: "ПЗ", birth: "25.05.2011", pastTeams: ["Металлист (Кубок)"] },
      { num: 17, name: "Манонов Самандар Носирджонович", pos: "ПЗ", birth: "25.04.2005", pastTeams: ["Металлист (Кубок)"] },
      { num: 18, name: "Абакаров Умар Сайдахмедович", pos: "ЗАЩ", birth: "20.12.2001", pastTeams: [] },
      { num: 19, name: "Зимарев Сергей Константинович", pos: "ПЗ", birth: "23.03.2010", pastTeams: ["Металлист", "Металлист-М"] },
      { num: 20, name: "Абдулманов Эдуард Русланович", pos: "ПЗ", birth: "10.01.2010", pastTeams: ["Металлист (Кубок)"] },
      { num: 21, name: "Дидов Даниил Александрович", pos: "ЗАЩ", birth: "18.04.2008", pastTeams: [] },
      { num: 22, name: "Маланьин Денис Олегович", pos: "ЗАЩ", birth: "10.07.2006", pastTeams: ["Металлист-М (4 тур)"] },
      { num: 23, name: "Гладышев Максим Евгеньевич", pos: "ПЗ", birth: "05.06.2008", pastTeams: [] },
      { num: 24, name: "Степанов Савелий Сергеевич", pos: "ПЗ", birth: "20.12.2010", pastTeams: [] },
      { num: 25, name: "Сайфуллин Данис Денисович", pos: "ПЗ", birth: "06.10.2010", pastTeams: [] },
      { num: 26, name: "Еремеев Матвей Алексеевич", pos: "НАП", birth: "01.04.2011", pastTeams: [] },
      { num: 27, name: "Егоров Игнат Денисович", pos: "ПЗ", birth: "06.05.2010", pastTeams: [] },
      { num: 28, name: "Ломовский Кирилл Владиславович", pos: "НАП", birth: "08.02.1999", pastTeams: ["Нейтрон (Кубок 5х5)"] },
      { num: 29, name: "Плотников Андрей Николаевич", pos: "ПЗ", birth: "19.09.2006", pastTeams: [] },
      { num: 30, name: "Драгин Михаил Александрович", pos: "ЗАЩ", birth: "01.12.2008", pastTeams: ["Металлист (Кубок)"] }
    ]
  },

  "ЛАДА": {
    city: "г. Димитровград",
    badge: "🚘",
    photo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
    stats: { p: 0, w: 0, d: 0, l: 0, diff: "0 - 0", pts: 0 },
    leadership: [
      { role: "Руководитель", name: "Герасимова Людмила Константиновна (тел: 8(937)876-01-98)" }
    ],
    roster: [
      { num: 1, name: "Аванесян Аршавир Варужанович", pos: "ВРТ", birth: "19.11.2010", pastTeams: [] },
      { num: 2, name: "Елифанкин Владимир Николаевич", pos: "ВРТ", birth: "12.07.2011", pastTeams: [] },
      { num: 3, name: "Барахтин Денис Алексеевич", pos: "НАП", birth: "28.07.2011", pastTeams: [] },
      { num: 4, name: "Гредин Сергей Сергеевич", pos: "НАП", birth: "03.12.2011", pastTeams: [] },
      { num: 5, name: "Гоголев Кирилл Евгеньевич", pos: "ЗАЩ", birth: "21.08.2010", pastTeams: [] },
      { num: 6, name: "Долгов Кирилл Павлович", pos: "ЗАЩ", birth: "08.02.2011", pastTeams: [] },
      { num: 7, name: "Ендураев Денис Игоревич", pos: "НАП", birth: "23.11.2010", pastTeams: [] },
      { num: 8, name: "Ендураев Тимофей Анатольевич", pos: "ЗАЩ", birth: "26.11.2011", pastTeams: [] },
      { num: 9, name: "Емелин Тимур Александрович", pos: "ЗАЩ", birth: "11.03.2012", pastTeams: [] },
      { num: 10, name: "Ершов Николай Андреевич", pos: "НАП", birth: "16.04.2010", pastTeams: [] },
      { num: 11, name: "Иващенко Илья Андреевич", pos: "ЗАЩ", birth: "24.07.2010", pastTeams: [] },
      { num: 12, name: "Калединский Илья Евгеньевич", pos: "НАП", birth: "18.04.2012", pastTeams: [] },
      { num: 13, name: "Калимуллин Риналь Радиевич", pos: "НАП", birth: "29.07.2010", pastTeams: [] },
      { num: 14, name: "Климов Артем Витальевич", pos: "ЗАЩ", birth: "31.10.2011", pastTeams: [] },
      { num: 15, name: "Клипиков Глеб Дмитриевич", pos: "НАП", birth: "30.12.2010", pastTeams: [] },
      { num: 16, name: "Маряшин Павел Владимирович", pos: "НАП", birth: "12.01.2011", pastTeams: [] },
      { num: 17, name: "Негодин Глеб Григорьевич", pos: "ЗАЩ", birth: "11.05.2011", pastTeams: [] },
      { num: 18, name: "Сергеев Данил Сергеевич", pos: "НАП", birth: "20.01.2010", pastTeams: [] },
      { num: 19, name: "Чванов Михаил Антонович", pos: "ЗАЩ", birth: "02.06.2011", pastTeams: [] },
      { num: 20, name: "Файзуллин Аскар Русланович", pos: "НАП", birth: "01.11.2010", pastTeams: [] },
      { num: 21, name: "Ершов Артем Андреевич", pos: "ЗАЩ", birth: "05.03.2012", pastTeams: [] },
      { num: 22, name: "Парой Михаил Алексеевич", pos: "НАП", birth: "24.12.2010", pastTeams: [] },
      { num: 23, name: "Мирзоматов Эхсон Лутфиддинович", pos: "НАП", birth: "03.07.2010", pastTeams: [] },
      { num: 24, name: "Алексеев Данил Владиславович", pos: "ЗАЩ", birth: "02.04.2011", pastTeams: [] }
    ]
  },

  // ЛАЗЕЙКА ДЛЯ ОСТАЛЬНЫХ КОМАНД (заполняются автоматически или вручную)
  "ПТИМАШ": {
    city: "г. Димитровград",
    badge: "🛡️",
    photo: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
    stats: { p: 7, w: 6, d: 0, l: 1, diff: "83 - 32", pts: 18 },
    leadership: [{ role: "Капитан", name: "Антонов М." }],
    roster: [
      { num: 10, name: "Антонов", pos: "НАП", birth: "—", pastTeams: ["ПТИМАШ (Кубок)"] },
      { num: 7, name: "Иванов", pos: "НАП", birth: "—", pastTeams: ["ПТИМАШ (Кубок)"] },
      { num: 9, name: "Туктаров", pos: "НАП", birth: "—", pastTeams: ["ПТИМАШ (Кубок)"] },
      { num: 8, name: "Валуйских", pos: "УНИ", birth: "—", pastTeams: ["ПТИМАШ"] },
      { num: 11, name: "Елисеев", pos: "УНИ", birth: "—", pastTeams: ["ПТИМАШ"] },
      { num: 5, name: "Панкратов", pos: "ЗАЩ", birth: "—", pastTeams: ["ПТИМАШ"] },
      { num: 13, name: "Юдин", pos: "УНИ", birth: "—", pastTeams: ["ПТИМАШ"] }
    ]
  },

  "Нейтрон": {
    city: "г. Димитровград",
    badge: "⚛️",
    photo: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
    stats: { p: 7, w: 7, d: 0, l: 0, diff: "43 - 18", pts: 21 },
    leadership: [],
    roster: [
      { num: "—", name: "Санатуллин", pos: "НАП", birth: "—", pastTeams: ["Нейтрон"] },
      { num: "—", name: "Герасимов", pos: "УНИ", birth: "—", pastTeams: ["Нейтрон"] },
      { num: "—", name: "Ломовский", pos: "НАП", birth: "—", pastTeams: ["Нейтрон", "Металлист"] },
      { num: "—", name: "Мустафин", pos: "УНИ", birth: "—", pastTeams: ["Нейтрон"] },
      { num: "—", name: "Доронин", pos: "НАП", birth: "—", pastTeams: ["Нейтрон"] },
      { num: "—", name: "Пайдулов", pos: "УНИ", birth: "—", pastTeams: ["Нейтрон"] }
    ]
  },

  "Спринт": {
    city: "г. Димитровград",
    badge: "⚡",
    photo: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?auto=format&fit=crop&w=800&q=80",
    stats: { p: 7, w: 5, d: 0, l: 2, diff: "34 - 25", pts: 15 },
    leadership: [],
    roster: [
      { num: "—", name: "Алексеев", pos: "УНИ", birth: "—", pastTeams: ["Спринт"] },
      { num: "—", name: "Галеев", pos: "УНИ", birth: "—", pastTeams: ["Спринт"] },
      { num: "—", name: "Камалтдинов", pos: "УНИ", birth: "—", pastTeams: ["Спринт"] },
      { num: "—", name: "Сабиров", pos: "УНИ", birth: "—", pastTeams: ["Спринт"] },
      { num: "—", name: "Демьянов", pos: "УНИ", birth: "—", pastTeams: ["Спринт"] }
    ]
  },

  "Кабо-Верде": {
    city: "г. Димитровград",
    badge: "🌊",
    photo: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=800&q=80",
    stats: { p: 7, w: 3, d: 0, l: 4, diff: "52 - 43", pts: 9 },
    leadership: [],
    roster: [
      { num: "—", name: "Мельчаков", pos: "НАП", birth: "—", pastTeams: ["Кабо-Верде"] },
      { num: "—", name: "Шарипов", pos: "НАП", birth: "—", pastTeams: ["Кабо-Верде"] },
      { num: "—", name: "Борисов", pos: "НАП", birth: "—", pastTeams: ["Кабо-Верде"] },
      { num: "—", name: "Смазин", pos: "УНИ", birth: "—", pastTeams: ["Кабо-Верде"] },
      { num: "—", name: "Сафин", pos: "НАП", birth: "—", pastTeams: ["Кабо-Верде"] },
      { num: "—", name: "Числов", pos: "УНИ", birth: "—", pastTeams: ["Кабо-Верде"] },
      { num: "—", name: "Трефилов", pos: "УНИ", birth: "—", pastTeams: ["Кабо-Верде"] },
      { num: "—", name: "Абдулганеев", pos: "УНИ", birth: "—", pastTeams: ["Кабо-Верде"] }
    ]
  },

  "Химмаш": {
    city: "г. Димитровград",
    badge: "🔴",
    photo: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80",
    stats: { p: 7, w: 3, d: 0, l: 4, diff: "44 - 57", pts: 9 },
    leadership: [],
    roster: [
      { num: "—", name: "Раджабов", pos: "НАП", birth: "—", pastTeams: ["Химмаш"] },
      { num: "—", name: "Абдулхаков", pos: "УНИ", birth: "—", pastTeams: ["Химмаш"] },
      { num: "—", name: "Сыч", pos: "ЗАЩ", birth: "—", pastTeams: ["Химмаш", "ДИТИ НИЯУ МИФИ"] },
      { num: "—", name: "Аксёнов", pos: "УНИ", birth: "—", pastTeams: ["Химмаш"] }
    ]
  }
};
