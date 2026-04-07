(function () {
  var calendarData = null;
  // Detect base path from own script src
  var scripts = document.querySelectorAll('script[src*="static-calendar.js"]');
  var basePath = '';
  if (scripts.length) {
    var src = scripts[0].getAttribute('src');
    var idx = src.indexOf('/wp-content/');
    if (idx > 0) basePath = src.substring(0, idx);
  }
  var dataUrl = basePath + '/wp-content/themes/hope21/assets/js/calendar-data.json';

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function getFirstDayOfWeek(year, month) {
    // 0=Sun, convert to Mon=0
    var d = new Date(year, month - 1, 1).getDay();
    return d === 0 ? 6 : d - 1;
  }

  function isHoliday(year, month, day) {
    if (!calendarData || !calendarData.holidays) return false;
    var key = year + '-' + pad(month);
    var list = calendarData.holidays[key];
    return list && list.indexOf(day) !== -1;
  }

  function renderCalendar(container, year, month) {
    var daysInMonth = getDaysInMonth(year, month);
    var firstDay = getFirstDayOfWeek(year, month);
    var color = (calendarData && calendarData.holidayColor) || '#fddde6';
    var label = (calendarData && calendarData.holidayLabel) || '定休日';
    var weekDays = ['月', '火', '水', '木', '金', '土', '日'];
    var weekClasses = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    var rowNames = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];

    // Previous month days
    var prevMonth = month === 1 ? 12 : month - 1;
    var prevYear = month === 1 ? year - 1 : year;
    var prevDays = getDaysInMonth(prevYear, prevMonth);

    var html = '<div class="calendars"><div class="calendar"><table class="month">';
    html += '<caption style=""><div class="month-header">';
    html += '<button class="month-prev" type="button"><span style="">‹</span></button>';
    html += '<span class="month-title">' + year + '年 ' + month + '月</span>';
    html += '<button class="month-next" type="button"><span style="">›</span></button>';
    html += '</div></caption>';
    html += '<thead><tr class="week-days">';
    for (var w = 0; w < 7; w++) {
      html += '<th class="' + weekClasses[w] + '"><span>' + weekDays[w] + '</span></th>';
    }
    html += '</tr></thead><tbody>';

    var day = 1;
    var nextDay = 1;
    var started = false;

    for (var row = 0; row < 6; row++) {
      if (day > daysInMonth) break;
      html += '<tr class="' + rowNames[row] + '">';
      for (var col = 0; col < 7; col++) {
        var cellDay, isOther, cellYear, cellMonth;
        if (!started && col < firstDay) {
          cellDay = prevDays - firstDay + col + 1;
          isOther = true;
          cellYear = prevYear;
          cellMonth = prevMonth;
        } else if (day > daysInMonth) {
          cellDay = nextDay++;
          isOther = true;
          cellYear = month === 12 ? year + 1 : year;
          cellMonth = month === 12 ? 1 : month + 1;
        } else {
          started = true;
          cellDay = day++;
          isOther = false;
          cellYear = year;
          cellMonth = month;
        }

        var cls = 'day ' + weekClasses[col];
        if (isOther) cls += ' other';
        var holiday = isHoliday(cellYear, cellMonth, cellDay);
        if (holiday) cls += ' holiday holiday-dayoff';

        var style = holiday ? ' style="background-color: ' + color + ';"' : ' style=""';
        html += '<td class="' + cls + '"><span' + style + '>' + cellDay + '</span></td>';
      }
      html += '</tr>';
    }

    html += '</tbody></table></div></div>';
    html += '<div class="calendars-footer"><ul class="holiday-titles">';
    html += '<li class="holiday-title"><span class="mark" style="background-color:' + color + '"></span> ';
    html += '<span class="title">' + label + '</span></li></ul></div>';

    container.innerHTML = html;

    // Attach month navigation
    var prevBtn = container.querySelector('.month-prev');
    var nextBtn = container.querySelector('.month-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        var m = month - 1, y = year;
        if (m < 1) { m = 12; y--; }
        renderCalendar(container, y, m);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        var m = month + 1, y = year;
        if (m > 12) { m = 1; y++; }
        renderCalendar(container, y, m);
      });
    }
  }

  function init() {
    var containers = document.querySelectorAll('.xo-simple-calendar');
    if (!containers.length) return;

    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;

    // Load calendar data then render
    var xhr = new XMLHttpRequest();
    xhr.open('GET', dataUrl, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { calendarData = JSON.parse(xhr.responseText); } catch (e) {}
      }
      containers.forEach(function (c) { renderCalendar(c, year, month); });
    };
    xhr.onerror = function () {
      containers.forEach(function (c) { renderCalendar(c, year, month); });
    };
    xhr.send();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
