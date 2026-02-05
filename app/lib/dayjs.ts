import dayjs from 'dayjs';
import 'dayjs/locale/ru';

import dayjsCustomParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(dayjsCustomParseFormat);
export default dayjs;
