/* ============================================================
   playerPersonalData.js v1.0

   РЕЕСТР ПЕРСОНАЛЬНЫХ ДАННЫХ ИГРОКОВ ЛФЛД

   Хранит:
   - fullName: полное ФИО (с отчеством, если известно)
   - middleName: отчество отдельно
   - birthDate: дата рождения в формате ДД.ММ.ГГГГ

   Ключи — строго Player ID (p_vasin_egor и т.д.)
   Источники данных:
   1) SEED — базовый сид для ключевых игроков
   2) Автогибридизация из window.LFLD_MASTER_DB (все турниры)
   3) Ручное редактирование через админку
   4) Публикация через GitHub API
   ============================================================ */

window.LFLD_PLAYER_PERSONAL = window.LFLD_PLAYER_PERSONAL || {};

/* ============================================================
   1. СИД — ключевые игроки с известными отчествами и датами
   ============================================================ */
(function seedData() {
  var SEED = {
    /* ============ КОМЕТА ============ */
    'p_vasin_egor': {
      fullName: 'Васин Егор Евгеньевич',
      middleName: 'Евгеньевич',
      birthDate: '09.08.2007'
    },
    'p_atavin_kirill': {
      fullName: 'Атавин Кирилл Станиславович',
      middleName: 'Станиславович',
      birthDate: '18.07.2003'
    },
    'p_samartsev_mark': {
      fullName: 'Самарцев Марк',
      middleName: '',
      birthDate: '—'
    },
    'p_svetlichnyy_nikita': {
      fullName: 'Светличный Никита',
      middleName: '',
      birthDate: '—'
    },
    'p_korolev_nikita': {
      fullName: 'Королёв Никита Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '26.03.2009'
    },
    'p_dragin_mihail': {
      fullName: 'Драгин Михаил Александрович',
      middleName: 'Александрович',
      birthDate: '01.12.2008'
    },
    'p_shinkarenko_danil': {
      fullName: 'Шинкаренко Данил Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '23.03.2008'
    },

    /* ============ МЕТАЛЛИСТ / МЕТАЛЛИСТ-М ============ */
    'p_manonov_samandar': {
      fullName: 'Манонов Самандар Носирджонович',
      middleName: 'Носирджонович',
      birthDate: '25.04.2005'
    },
    'p_manonov_rustam': {
      fullName: 'Манонов Рустам Носирджонович',
      middleName: 'Носирджонович',
      birthDate: '25.05.2011'
    },
    'p_gladyshev_maksim': {
      fullName: 'Гладышев Максим Евгеньевич',
      middleName: 'Евгеньевич',
      birthDate: '05.06.2008'
    },
    'p_sayfullin_danis': {
      fullName: 'Сайфуллин Данис Денисович',
      middleName: 'Денисович',
      birthDate: '06.10.2010'
    },
    'p_stepanov_saveliy': {
      fullName: 'Степанов Савелий Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '20.12.2010'
    },
    'p_yusupov_marat': {
      fullName: 'Юсупов Марат Растямович',
      middleName: 'Растямович',
      birthDate: '20.02.1994'
    },
    'p_yusupov_ruslan': {
      fullName: 'Юсупов Руслан Ильшатович',
      middleName: 'Ильшатович',
      birthDate: '23.12.1997'
    },
    'p_butyaev_sergey': {
      fullName: 'Бутяев Сергей Геннадьевич',
      middleName: 'Геннадьевич',
      birthDate: '09.09.1998'
    },
    'p_aryapov_daniil': {
      fullName: 'Аряпов Даниил Ренатович',
      middleName: 'Ренатович',
      birthDate: '10.06.2005'
    },
    'p_zimarev_sergey': {
      fullName: 'Зимарев Сергей Константинович',
      middleName: 'Константинович',
      birthDate: '23.03.2010'
    },
    'p_butkeev_sergey': {
      fullName: 'Буткеев Сергей Петрович',
      middleName: 'Петрович',
      birthDate: '22.12.1988'
    },
    'p_kosolapov_aleksey': {
      fullName: 'Косолапов Алексей Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '28.06.1996'
    },
    'p_abdulmanov_eduard': {
      fullName: 'Абдулманов Эдуард Русланович',
      middleName: 'Русланович',
      birthDate: '10.01.2010'
    },
    'p_ivanov_andrey': {
      fullName: 'Иванов Андрей Петрович',
      middleName: 'Петрович',
      birthDate: '09.11.2003'
    },
    'p_malanyin_denis': {
      fullName: 'Маланьин Денис Олегович',
      middleName: 'Олегович',
      birthDate: '10.07.2006'
    },
    'p_isaev_mihail': {
      fullName: 'Исаев Михаил Будагович',
      middleName: 'Будагович',
      birthDate: '09.05.1997'
    },
    'p_sutyrin_ilya': {
      fullName: 'Сутырин Илья Дмитриевич',
      middleName: 'Дмитриевич',
      birthDate: '26.04.2000'
    },
    'p_ponomarev_maksim': {
      fullName: 'Пономарёв Максим Вячеславович',
      middleName: 'Вячеславович',
      birthDate: '25.08.1998'
    },
    'p_abakarov_umar': {
      fullName: 'Абакаров Умар Сайдахмедович',
      middleName: 'Сайдахмедович',
      birthDate: '20.12.2001'
    },
    'p_didov_daniil': {
      fullName: 'Дидов Даниил Александрович',
      middleName: 'Александрович',
      birthDate: '18.04.2008'
    },
    'p_egorov_ignat': {
      fullName: 'Егоров Игнат Денисович',
      middleName: 'Денисович',
      birthDate: '06.05.2010'
    },
    'p_eremeev_matvey': {
      fullName: 'Еремеев Матвей Алексеевич',
      middleName: 'Алексеевич',
      birthDate: '01.04.2011'
    },
    'p_plotnikov_andrey': {
      fullName: 'Плотников Андрей Николаевич',
      middleName: 'Николаевич',
      birthDate: '19.09.2006'
    },
    'p_kudashov_dmitriy': {
      fullName: 'Кудашов Дмитрий Александрович',
      middleName: 'Александрович',
      birthDate: '05.07.2006'
    },
    'p_nesterov_nikita': {
      fullName: 'Нестеров Никита Алексеевич',
      middleName: 'Алексеевич',
      birthDate: '04.04.1999'
    },

    /* ============ ХИММАШ ============ */
    'p_nagornov_ilya': {
      fullName: 'Нагорнов Илья Александрович',
      middleName: 'Александрович',
      birthDate: '02.05.2007'
    },
    'p_radjabov_anis': {
      fullName: 'Раджабов Анис Абдурахимович',
      middleName: 'Абдурахимович',
      birthDate: '01.09.2003'
    },
    'p_sych_ruslan': {
      fullName: 'Сыч Руслан Эдуардович',
      middleName: 'Эдуардович',
      birthDate: '07.08.2003'
    },
    'p_galiev_amir': {
      fullName: 'Галиев Амир Радикович',
      middleName: 'Радикович',
      birthDate: '28.03.2007'
    },

    /* ============ СПРИНТ ============ */
    'p_zhelyabin_igor': {
      fullName: 'Желябин Игорь Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '25.08.1990'
    },
    'p_cherepov_maksim': {
      fullName: 'Черепов Максим Николаевич',
      middleName: 'Николаевич',
      birthDate: '14.08.1989'
    },
    'p_kamaltdinov_ilyaz': {
      fullName: 'Камалтдинов Ильяс Нурсалимович',
      middleName: 'Нурсалимович',
      birthDate: '27.10.1983'
    },
    'p_surkov_artem': {
      fullName: 'Сурков Артём Олегович',
      middleName: 'Олегович',
      birthDate: '03.04.1998'
    },
    'p_safin_ilnar': {
      fullName: 'Сафин Ильнар',
      middleName: '',
      birthDate: '04.06.1991'
    },
    'p_kondrashov_maksim': {
      fullName: 'Кондрашов Максим Викторович',
      middleName: 'Викторович',
      birthDate: '19.09.1991'
    },
    'p_gebeidullov_linar': {
      fullName: 'Гебейдуллов Линар Ижятович',
      middleName: 'Ижятович',
      birthDate: '11.02.1997'
    },
    'p_galeev_aydar': {
      fullName: 'Галеев Айдар Рамисович',
      middleName: 'Рамисович',
      birthDate: '06.12.1990'
    },
    'p_alekseev_evgeniy': {
      fullName: 'Алексеев Евгений Владимирович',
      middleName: 'Владимирович',
      birthDate: '12.12.1990'
    },
    'p_hrestinin_sergey': {
      fullName: 'Хрестинин Сергей Алексеевич',
      middleName: 'Алексеевич',
      birthDate: '29.02.1988'
    },
    'p_timakov_vladimir': {
      fullName: 'Тимаков Владимир Александрович',
      middleName: 'Александрович',
      birthDate: '24.06.1989'
    },
    'p_alekseev_matvey': {
      fullName: 'Алексеев Матвей',
      middleName: '',
      birthDate: '28.11.2006'
    },

    /* ============ ДИТИ НИЯУ МИФИ ============ */
    'p_polyakov_aleksandr': {
      fullName: 'Поляков Александр Викторович',
      middleName: 'Викторович',
      birthDate: '01.09.2002'
    },
    'p_getmanov_artem': {
      fullName: 'Гетманов Артём Алексеевич',
      middleName: 'Алексеевич',
      birthDate: '12.01.2008'
    },
    'p_rushkin_evgeniy': {
      fullName: 'Рушкин Евгений Александрович',
      middleName: 'Александрович',
      birthDate: '01.02.2006'
    },
    'p_murzaikin_yuriy': {
      fullName: 'Мурзайкин Юрий Андреевич',
      middleName: 'Андреевич',
      birthDate: '13.02.2006'
    },
    'p_savelev_aleksey': {
      fullName: 'Савельев Алексей Андреевич',
      middleName: 'Андреевич',
      birthDate: '13.04.2001'
    },
    'p_salnikov_nikolay': {
      fullName: 'Сальников Николай Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '07.09.2008'
    },
    'p_skornyakov_ilya': {
      fullName: 'Скорняков Илья Андреевич',
      middleName: 'Андреевич',
      birthDate: '06.09.2006'
    },
    'p_shatalin_daniil': {
      fullName: 'Шаталин Даниил Александрович',
      middleName: 'Александрович',
      birthDate: '20.06.2007'
    },
    'p_zaytsev_saveliy': {
      fullName: 'Зайцев Савелий Валерьевич',
      middleName: 'Валерьевич',
      birthDate: '10.02.2007'
    },
    'p_imamov_emil': {
      fullName: 'Имамов Эмиль Русланович',
      middleName: 'Русланович',
      birthDate: '18.02.2007'
    },
    'p_vafin_dinar': {
      fullName: 'Вафин Динар Равилевич',
      middleName: 'Равилевич',
      birthDate: '26.01.2007'
    },

    /* ============ АВАНГАРД ============ */
    'p_anisimov_ruslan': {
      fullName: 'Анисимов Руслан Наильевич',
      middleName: 'Наильевич',
      birthDate: '21.08.1993'
    },
    'p_ahmadeev_mars': {
      fullName: 'Ахмадеев Марс Маратович',
      middleName: 'Маратович',
      birthDate: '10.10.1993'
    },
    'p_bahshiev_zaur': {
      fullName: 'Бахшиев Заур Айаз Оглы',
      middleName: 'Айаз Оглы',
      birthDate: '14.09.1991'
    },
    'p_vorogushin_anatoliy': {
      fullName: 'Ворогушин Анатолий Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '28.04.1989'
    },
    'p_zabirov_ramis': {
      fullName: 'Забиров Рамис Рашидович',
      middleName: 'Рашидович',
      birthDate: '30.06.1996'
    },
    'p_ziterev_aleksandr': {
      fullName: 'Зитерев Александр Александрович',
      middleName: 'Александрович',
      birthDate: '11.05.1992'
    },
    'p_ilin_vladimir': {
      fullName: 'Ильин Владимир Алексеевич',
      middleName: 'Алексеевич',
      birthDate: '15.07.2004'
    },
    'p_kamalov_marat': {
      fullName: 'Камалов Марат Ринатович',
      middleName: 'Ринатович',
      birthDate: '26.06.2001'
    },
    'p_krasilnikov_mihail': {
      fullName: 'Красильников Михаил Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '17.11.1992'
    },
    'p_savin_timofey': {
      fullName: 'Савин Тимофей Евгеньевич',
      middleName: 'Евгеньевич',
      birthDate: '07.11.2004'
    },
    'p_sanginov_dzhamshed': {
      fullName: 'Сангинов Джамшед Турсунбоевич',
      middleName: 'Турсунбоевич',
      birthDate: '11.04.1980'
    },
    'p_sveshnikov_anatoliy': {
      fullName: 'Свешников Анатолий Александрович',
      middleName: 'Александрович',
      birthDate: '25.07.1994'
    },
    'p_sirazov_rustem': {
      fullName: 'Сиразов Рустем Рифхатович',
      middleName: 'Рифхатович',
      birthDate: '18.02.1989'
    },
    'p_filatov_aleksandr': {
      fullName: 'Филатов Александр Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '03.11.1995'
    },
    'p_hairullov_ramil': {
      fullName: 'Хайруллов Рамиль Рафисович',
      middleName: 'Рафисович',
      birthDate: '10.04.1994'
    },
    'p_chebakov_roman': {
      fullName: 'Чебаков Роман Васильевич',
      middleName: 'Васильевич',
      birthDate: '08.08.1987'
    },
    'p_chernyshov_dmitriy': {
      fullName: 'Чернышов Дмитрий Евгеньевич',
      middleName: 'Евгеньевич',
      birthDate: '03.07.1994'
    },
    'p_tarverdiev_nariman': {
      fullName: 'Тарвердиев Нариман',
      middleName: '',
      birthDate: '07.11.1999'
    },

    /* ============ НЕФТЧИ ============ */
    'p_pronin_mihail': {
      fullName: 'Пронин Михаил',
      middleName: '',
      birthDate: '23.02.1999'
    },

    /* ============ СШ ЛАДА ============ */
    'p_kalimullin_rinal': {
      fullName: 'Калимуллин Риналь Радиевич',
      middleName: 'Радиевич',
      birthDate: '29.07.2010'
    },
    'p_gredin_sergey': {
      fullName: 'Гредин Сергей Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '03.12.2011'
    },
    'p_avanesyan_arshavir': {
      fullName: 'Аванесян Аршавир Варужанович',
      middleName: 'Варужанович',
      birthDate: '19.11.2010'
    },
    'p_alekseev_danil_lada': {
      fullName: 'Алексеев Данил Владиславович',
      middleName: 'Владиславович',
      birthDate: '02.04.2011'
    },
    'p_barahtin_denis': {
      fullName: 'Барахтин Денис Алексеевич',
      middleName: 'Алексеевич',
      birthDate: '28.07.2011'
    },
    'p_gogolev_kirill': {
      fullName: 'Гоголев Кирилл Евгеньевич',
      middleName: 'Евгеньевич',
      birthDate: '21.08.2010'
    },
    'p_dolgov_kirill': {
      fullName: 'Долгов Кирилл Павлович',
      middleName: 'Павлович',
      birthDate: '08.02.2011'
    },
    'p_elifankin_vladimir': {
      fullName: 'Елифанкин Владимир Николаевич',
      middleName: 'Николаевич',
      birthDate: '12.07.2011'
    },
    'p_emelin_timur': {
      fullName: 'Емелин Тимур Александрович',
      middleName: 'Александрович',
      birthDate: '11.03.2012'
    },
    'p_enduraev_denis': {
      fullName: 'Ендураев Денис Игоревич',
      middleName: 'Игоревич',
      birthDate: '23.11.2010'
    },
    'p_enduraev_timofey': {
      fullName: 'Ендураев Тимофей Анатольевич',
      middleName: 'Анатольевич',
      birthDate: '26.11.2011'
    },
    'p_ershov_artem': {
      fullName: 'Ершов Артём Андреевич',
      middleName: 'Андреевич',
      birthDate: '05.03.2012'
    },
    'p_ershov_nikolay': {
      fullName: 'Ершов Николай Андреевич',
      middleName: 'Андреевич',
      birthDate: '16.04.2010'
    },
    'p_ivashchenko_ilya': {
      fullName: 'Иващенко Илья Андреевич',
      middleName: 'Андреевич',
      birthDate: '24.07.2010'
    },
    'p_kaledinskiy_ilya': {
      fullName: 'Калединский Илья Евгеньевич',
      middleName: 'Евгеньевич',
      birthDate: '18.04.2012'
    },
    'p_klimov_artem': {
      fullName: 'Климов Артём Витальевич',
      middleName: 'Витальевич',
      birthDate: '31.10.2011'
    },
    'p_klipikov_gleb': {
      fullName: 'Клипиков Глеб Дмитриевич',
      middleName: 'Дмитриевич',
      birthDate: '30.12.2010'
    },
    'p_maryashin_pavel': {
      fullName: 'Маряшин Павел Владимирович',
      middleName: 'Владимирович',
      birthDate: '12.01.2011'
    },
    'p_mirzomatov_ehson': {
      fullName: 'Мирзоматов Эхсон Лутфиддинович',
      middleName: 'Лутфиддинович',
      birthDate: '03.07.2010'
    },
    'p_negodin_gleb': {
      fullName: 'Негодин Глеб Григорьевич',
      middleName: 'Григорьевич',
      birthDate: '11.05.2011'
    },
    'p_paroy_mihail': {
      fullName: 'Парой Михаил Алексеевич',
      middleName: 'Алексеевич',
      birthDate: '24.12.2010'
    },
    'p_sergeev_danil': {
      fullName: 'Сергеев Данил Сергеевич',
      middleName: 'Сергеевич',
      birthDate: '20.01.2010'
    },
    'p_fayzullin_askar': {
      fullName: 'Файзуллин Аскар Русланович',
      middleName: 'Русланович',
      birthDate: '01.11.2010'
    },
    'p_chvanov_mihaylo': {
      fullName: 'Чванов Михаил Антонович',
      middleName: 'Антонович',
      birthDate: '02.06.2011'
    }
  };

  /* Слияние SEED в основной реестр (не перезаписываем существующие) */
  Object.keys(SEED).forEach(function (id) {
    if (!window.LFLD_PLAYER_PERSONAL[id]) {
      window.LFLD_PLAYER_PERSONAL[id] = SEED[id];
    }
  });
})();

/* ============================================================
   2. УТИЛИТЫ
   ============================================================ */
function normKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join('_');
}

function splitName(fullName) {
  var parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    lastName: parts[0] || '',
    firstName: parts[1] || '',
    middleName: parts.slice(2).join(' ') || ''
  };
}

function findIdFromRegistry(name) {
  var reg = window.LFLD_PLAYER_IDS;
  if (!reg || !name) return null;
  var key = normKey(name);
  if (!key) return null;
  if (reg[key]) return reg[key];

  /* Попробуем через PlayerResolver */
  if (window.PlayerResolver && window.PlayerResolver.resolve) {
    try {
      var r = window.PlayerResolver.resolve(name);
      if (r && r.id) return r.id;
    } catch (e) {}
  }
  return null;
}

/* ============================================================
   3. СИНХРОНИЗАЦИЯ С MASTER DB
   ============================================================ */
function harvestFromMaster() {
  var M = window.LFLD_MASTER_DB;
  if (!M) return 0;

  var harvested = 0;

  function handlePlayer(p, forceId) {
    if (!p || !p.name) return;

    var id = forceId || p.id || findIdFromRegistry(p.name);
    if (!id) return;

    var parts = splitName(p.name);
    var middleName = parts.middleName;
    var birth = p.birth || p.birthDate || '';
    if (birth === '—') birth = '';

    if (!window.LFLD_PLAYER_PERSONAL[id]) {
      window.LFLD_PLAYER_PERSONAL[id] = {
        fullName: p.name,
        middleName: middleName,
        birthDate: birth || '—'
      };
      harvested++;
      return;
    }

    var entry = window.LFLD_PLAYER_PERSONAL[id];

    /* Обогащаем fullName, если найдено более полное имя */
    if (p.name && entry.fullName) {
      var existingWords = entry.fullName.split(/\s+/).length;
      var foundWords = p.name.split(/\s+/).length;
      if (foundWords > existingWords) {
        entry.fullName = p.name;
        harvested++;
      }
    }

    /* Обогащаем middleName */
    if (!entry.middleName && middleName) {
      entry.middleName = middleName;
      if (entry.fullName && entry.fullName.indexOf(middleName) === -1) {
        entry.fullName = entry.fullName + ' ' + middleName;
      }
      harvested++;
    }

    /* Обогащаем birthDate */
    if ((!entry.birthDate || entry.birthDate === '—' || entry.birthDate === '') && birth) {
      entry.birthDate = birth;
      harvested++;
    }
  }

  /* teams */
  ['tournament_5x5', 'tournament_7x7', 'tournament_night'].forEach(function (tk) {
    var t = M[tk];
    if (!t || !t.teams) return;
    Object.keys(t.teams).forEach(function (club) {
      (t.teams[club] || []).forEach(function (p) { handlePlayer(p); });
    });
  });

  /* cup_5x5.players */
  if (M.cup_5x5 && Array.isArray(M.cup_5x5.players)) {
    M.cup_5x5.players.forEach(function (p) { handlePlayer(p); });
  }

  if (harvested) {
    console.log('[playerPersonalData] Обогащено записей из master:', harvested);
  }
  return harvested;
}

/* ============================================================
   4. ХРАНЕНИЕ
   ============================================================ */
var STORAGE_KEY = 'lfld_player_personal_v1';

function saveToLocalStorage() {
  try {
    var json = JSON.stringify(window.LFLD_PLAYER_PERSONAL);
    localStorage.setItem(STORAGE_KEY, json);
    return true;
  } catch (e) {
    console.warn('[playerPersonalData] save error:', e);
    return false;
  }
}

function loadFromLocalStorage() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    var parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return 0;

    var count = 0;
    Object.keys(parsed).forEach(function (id) {
      if (!parsed[id]) return;
      if (!window.LFLD_PLAYER_PERSONAL[id]) {
        window.LFLD_PLAYER_PERSONAL[id] = parsed[id];
        count++;
        return;
      }
      /* Мерж: существующий приоритетнее, но пустые поля заполняем */
      var entry = window.LFLD_PLAYER_PERSONAL[id];
      var loaded = parsed[id];
      if (!entry.fullName && loaded.fullName) entry.fullName = loaded.fullName;
      if (!entry.middleName && loaded.middleName) entry.middleName = loaded.middleName;
      if ((!entry.birthDate || entry.birthDate === '—') && loaded.birthDate && loaded.birthDate !== '—') {
        entry.birthDate = loaded.birthDate;
      }
    });
    return count;
  } catch (e) {
    console.warn('[playerPersonalData] load error:', e);
    return 0;
  }
}

/* ============================================================
   5. ПУБЛИЧНОЕ API
   ============================================================ */
window.playerPersonal = {

  /**
   * Получить запись по ID.
   */
  get: function (id) {
    return window.LFLD_PLAYER_PERSONAL[id] || null;
  },

  /**
   * Обновить запись по ID. Автоматически пересобирает fullName.
   */
  set: function (id, patch) {
    if (!id) return false;
    if (!window.LFLD_PLAYER_PERSONAL[id]) {
      window.LFLD_PLAYER_PERSONAL[id] = {
        fullName: '',
        middleName: '',
        birthDate: '—'
      };
    }
    var entry = window.LFLD_PLAYER_PERSONAL[id];

    if (patch.fullName !== undefined) entry.fullName = patch.fullName;
    if (patch.middleName !== undefined) entry.middleName = patch.middleName;
    if (patch.birthDate !== undefined) {
      entry.birthDate = patch.birthDate || '—';
    }

    /* Авто-сборка fullName из составляющих */
    if (patch.firstName !== undefined || patch.lastName !== undefined) {
      entry.fullName = [patch.lastName || '', patch.firstName || '', entry.middleName || '']
        .filter(Boolean).join(' ').trim();
    }

    saveToLocalStorage();
    return true;
  },

  /**
   * Полное ФИО (для досье).
   */
  getFullName: function (id) {
    var e = this.get(id);
    if (!e) return '';
    return e.fullName || '';
  },

  /**
   * Компактное имя «Фамилия Имя» (для списков/протоколов).
   */
  getCompactName: function (id) {
    var e = this.get(id);
    if (!e || !e.fullName) return '';
    var parts = e.fullName.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).join(' ');
  },

  /**
   * Отчество.
   */
  getMiddleName: function (id) {
    var e = this.get(id);
    if (!e) return '';
    return e.middleName || '';
  },

  /**
   * Дата рождения.
   */
  getBirthDate: function (id) {
    var e = this.get(id);
    if (!e) return '';
    return (e.birthDate && e.birthDate !== '—') ? e.birthDate : '';
  },

  /**
   * Все записи.
   */
  getAll: function () {
    return Object.assign({}, window.LFLD_PLAYER_PERSONAL);
  },

  /**
   * Экспорт для публикации в GitHub.
   */
  exportAll: function () {
    return JSON.parse(JSON.stringify(window.LFLD_PLAYER_PERSONAL));
  },

  /**
   * Импорт из внешнего источника (при загрузке playerPersonalData.js).
   */
  importAll: function (data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (id) {
      if (!window.LFLD_PLAYER_PERSONAL[id]) {
        window.LFLD_PLAYER_PERSONAL[id] = data[id];
      } else {
        var entry = window.LFLD_PLAYER_PERSONAL[id];
        var loaded = data[id];
        if (!entry.fullName && loaded.fullName) entry.fullName = loaded.fullName;
        if (!entry.middleName && loaded.middleName) entry.middleName = loaded.middleName;
        if ((!entry.birthDate || entry.birthDate === '—') && loaded.birthDate && loaded.birthDate !== '—') {
          entry.birthDate = loaded.birthDate;
        }
      }
    });
    saveToLocalStorage();
  },

  saveToLocalStorage: saveToLocalStorage,
  loadFromLocalStorage: loadFromLocalStorage,
  harvest: harvestFromMaster,

  /**
   * Генерация файла playerPersonalData.js для публикации в GitHub.
   */
  generateFileContent: function () {
    var data = this.exportAll();
    var ts = new Date().toISOString();
    var lines = [
      '/* ============================================================',
      '   playerPersonalData.js — автогенерация из админки',
      '   Опубликовано: ' + ts,
      '   ============================================================ */',
      '',
      'window.LFLD_PLAYER_PERSONAL = window.LFLD_PLAYER_PERSONAL || {};',
      '',
      'Object.assign(window.LFLD_PLAYER_PERSONAL, ' + JSON.stringify(data, null, 2) + ');',
      '',
      '/* ---------- Автосинхронизация в localStorage ---------- */',
      '(function () {',
      '  if (!window.LFLD_PLAYER_PERSONAL) return;',
      '  try {',
      '    var existing = JSON.parse(localStorage.getItem("lfld_player_personal_v1") || "{}");',
      '    var merged = Object.assign({}, window.LFLD_PLAYER_PERSONAL, existing);',
      '    localStorage.setItem("lfld_player_personal_v1", JSON.stringify(merged));',
      '  } catch (e) {}',
      '})();',
      ''
    ];
    return lines.join('\n');
  }
};

/* ============================================================
   6. АВТОЗАПУСК
   ============================================================ */
(function boot() {
  /* 1. Загрузка из localStorage (если уже сохранялось) */
  loadFromLocalStorage();

  /* 2. Гибридизация из master DB — с задержкой, чтобы база успела подгрузиться */
  function tryHarvest() {
    if (window.LFLD_MASTER_DB) {
      var count = harvestFromMaster();
      if (count) saveToLocalStorage();
    } else {
      setTimeout(tryHarvest, 300);
    }
  }
  setTimeout(tryHarvest, 800);
  setTimeout(tryHarvest, 2000);
  setTimeout(tryHarvest, 4000);

  console.log('[playerPersonalData] v1.0 · записей:', Object.keys(window.LFLD_PLAYER_PERSONAL).length);
})();