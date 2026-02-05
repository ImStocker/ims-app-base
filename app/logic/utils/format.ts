import dayjs from 'dayjs';
import type { UrlMatch } from 'autolinker';
import Autolinker from 'autolinker';
import validator from 'validator';

export function getDuration(
  startDate: string | Date | number,
  endDate: string | Date | number,
) {
  const dateArray = [];
  const currentDate = new Date(startDate);
  const stopDate = new Date(endDate);
  stopDate.setDate(stopDate.getDate() + 1);
  while (currentDate <= stopDate) {
    dateArray.push(formatDashDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
}

export function formatDashDate(
  time: string | Date | number | null | undefined,
  _locale: string = 'ru',
) {
  if (!time) return '';
  return dayjs(time).format('YYYY-MM-DD');
}

export function formatDate(
  time: string | Date | number | null | undefined,
  locale: string = 'ru',
) {
  if (!time) return '';
  return dayjs(time).format(locale === 'ru' ? 'DD.MM.YYYY' : 'MM/DD/YYYY');
}

export function formatDateShort(
  time: string | Date | number | null | undefined,
  locale: string = 'ru',
) {
  if (!time) return '';
  return dayjs(time).format(locale === 'ru' ? 'DD.MM.YY' : 'MM/DD/YY');
}

const DateLocaleStrings = {
  ru: {
    justNow: 'только что',
    minuteAgoForms: [
      'минуту назад', // 1
      'минуты назад', // 2-4
      'минут назад', // 5-20
      'минуту назад', // 21
    ],
    hourAgoForms: ['час назад', 'часа назад', 'часов назад', 'час назад'],
    dayAgoForms: ['день назад', 'дня назад', 'дней назад', 'день назад'],
  },
  en: {
    justNow: 'just now',
    minuteAgoForms: ['minute ago', 'minutes ago', 'minutes ago', 'minutes ago'],
    hourAgoForms: ['hour ago', 'hours ago', 'hours ago', 'hours ago'],
    dayAgoForms: ['day ago', 'days ago', 'days ago', 'days ago'],
  },
};

/*
    0: "минуту назад", // 1
    1: "минуты назад", // 2-4
    2: "минут назад",  // 5-20
    3: "минуту назад", // 21
*/
function getNumberStringForm(val: number): number {
  if (val < 0) val = -val;
  if (val === 0) {
    return 2;
  } else if (val === 1) {
    return 0;
  } else if (val <= 4) {
    return 1;
  } else if (val <= 20) {
    return 2;
  } else {
    const mod = val % 10;
    if (mod === 1) {
      return 3;
    } else if (mod <= 4) {
      return 1;
    } else return 2;
  }
}

export function formatDateTimeAgo(
  time: string | Date | number | null | undefined,
  locale: 'ru' | 'en',
) {
  if (!time) return '';
  const time_dayjs = dayjs(time);
  const ago = dayjs().diff(time_dayjs);
  if (ago < 31 * 1000) {
    return DateLocaleStrings[locale].justNow;
  } else if (ago < 60 * 60 * 1000) {
    const minutes = Math.round(ago / (60 * 1000));
    return (
      minutes +
      ' ' +
      DateLocaleStrings[locale].minuteAgoForms[getNumberStringForm(minutes)]
    );
  } else if (ago < 24 * 60 * 60 * 1000) {
    const hours = Math.round(ago / (60 * 60 * 1000));
    return (
      hours +
      ' ' +
      DateLocaleStrings[locale].hourAgoForms[getNumberStringForm(hours)]
    );
  } else if (ago < 4 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(ago / (24 * 60 * 60 * 1000));
    return (
      days +
      ' ' +
      DateLocaleStrings[locale].dayAgoForms[getNumberStringForm(days)]
    );
  } else return time_dayjs.format(locale === 'ru' ? 'DD.MM.YY' : 'MM/DD/YY');
}

export function formatDateTime(
  time: string | Date | number | null | undefined,
  locale: string = 'ru',
  short = false,
) {
  if (!time) return '';
  return dayjs(time).format(
    locale === 'ru'
      ? `DD.MM.${short ? 'YY' : 'YYYY'} HH:mm${!short ? ':ss' : ''}`
      : `MM/DD/${short ? 'YY' : 'YYYY'} HH:mm${!short ? ':ss' : ''}`,
  );
}

export function formatDuration(sec: string | number | null | undefined) {
  if (sec === null) return '';
  if (sec === undefined) return '';
  sec = parseFloat(sec.toString());
  if (isNaN(sec)) return '';
  let time = Math.trunc(sec / 60) + ':' + Math.trunc((sec % 60) / 10);
  if (sec % 1 !== 0) {
    time = time + ((sec % 60) % 10).toFixed(3);
    return time.padStart(9, '00:00.000');
  } else time = time + ((sec % 60) % 10);
  return time.padStart(5, '00:00');
}

export function formatFileSize(
  size: number | null | undefined,
  $t: (key: string, params?: any) => string,
): string {
  if (size === null || size === undefined) return '';
  let units = ['B', 'KB', 'MB', 'GB', 'TB'];
  if ($t) units = units.map((u) => $t('file.sizeUnits.' + u));
  for (let i = 0; i < units.length; i++) {
    if (size < 1024 || i === units.length - 1) {
      return Math.round(size * 10) / 10 + ' ' + units[i];
    } else {
      size /= 1024;
    }
  }
  throw new Error('formatFileSize: unreachable code');
}

const OpenFolderRegexp = /^open:\/\/folder\//;
const ShowFileRegexp = /^show:\/\/file\//;
export function formatSimpleDescriptionHTML(content: string): string {
  return Autolinker.link(
    validator
      .escape(content)
      .replace(/&#x2F;/g, '/')
      .replace(/\*\*([^*\n]*)\*\*/g, '<b>$1</b>')
      .replace(/\n/g, '<br>'),
    {
      replaceFn: function (match: any) {
        if (match.getType() === 'url') {
          const url = (match as UrlMatch).getUrl();
          if (OpenFolderRegexp.test(url)) {
            const folder = decodeURIComponent(
              url.replace(OpenFolderRegexp, ''),
            ).replace(/\\/g, '/');
            const parts = folder.split('/');
            const last = parts.pop();
            return `<a href="open://folder/${encodeURIComponent(folder)}" title="${validator.escape(folder)}">${last ? last : '/'}</a>`;
          } else if (ShowFileRegexp.test(url)) {
            const file = decodeURIComponent(
              url.replace(ShowFileRegexp, ''),
            ).replace(/\\/g, '/');
            const parts = file.split('/');
            const last = parts.pop();
            return `<a href="show://file/${encodeURIComponent(file)}" title="${validator.escape(file)}">${last ? last : '/'}</a>`;
          }
        }
        return true;
      },
    },
  );
}

export function formatFixedFract(val: number, fract: number, delimeter = '.') {
  const e = Math.pow(10, fract);
  const sign = val < 0;
  let fract_val = (Math.floor(Math.abs(val) * e) % e) + '';
  while (fract_val.length < fract) fract_val = '0' + fract_val;
  return (sign ? '-' : '') + Math.floor(Math.abs(val)) + delimeter + fract_val;
}

export function formatPrice(val: number) {
  const round_val = Math.round(val * 100);
  if (round_val % 100 === 0) return Math.round(round_val / 100);
  else return formatFixedFract(val, 2);
}

export function isValidDate(
  testing_date: string,
  selected_format: string,
): boolean {
  if (isValidISODate(testing_date)) {
    return true;
  }

  const dotFormatRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const match = dotFormatRegex.exec(testing_date);

  if (!match) {
    return false;
  }

  const [, first, second, yearStr] = match;
  const year = parseInt(yearStr, 10);

  if (selected_format === 'DD.MM.YYYY') {
    return isValidDMY(parseInt(first, 10), parseInt(second, 10), year);
  } else if (selected_format === 'MM.DD.YYYY') {
    return isValidMDY(parseInt(first, 10), parseInt(second, 10), year);
  }

  return false;
}

function isValidISODate(dateString: string): boolean {
  const isoRegex =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

  if (!isoRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return (
    !isNaN(date.getTime()) &&
    date.toISOString().startsWith(dateString.split('T')[0])
  );
}

function isValidDMY(day: number, month: number, year: number): boolean {
  return isValidDateComponents(day, month, year);
}

function isValidMDY(month: number, day: number, year: number): boolean {
  return isValidDateComponents(day, month, year);
}

function isValidDateComponents(
  day: number,
  month: number,
  year: number,
): boolean {
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 1000 ||
    year > 9999
  ) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
