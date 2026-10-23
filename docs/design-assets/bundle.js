/* @ds-bundle: {"format":4,"namespace":"Journal","components":[{"name":"DayHeader"},{"name":"ProgressMeter"},{"name":"TaskInput"},{"name":"TaskItem"},{"name":"CarryMarker"},{"name":"TicketChip"},{"name":"CommentSheet"},{"name":"PeriodSwitch"},{"name":"StatTile"},{"name":"ReviewItem"},{"name":"Button"},{"name":"Kbd"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(' ');
  }

  var TICKET = /\b[A-Z][A-Z0-9]+-\d+\b/;
  var URL_RE = /https?:\/\/[^\s)]+/;
  var TOKEN = new RegExp('(' + URL_RE.source + '|' + TICKET.source + ')', 'g');

  function shortUrl(u) {
    try { var p = new URL(u); var s = p.host + (p.pathname === '/' ? '' : p.pathname); return s.length > 48 ? s.slice(0, 47) + '…' : s; }
    catch (e) { return u; }
  }

  /* Splits plain text into strings, TicketChips and links. */
  function rich(text, keyBase) {
    if (!text) return null;
    var parts = String(text).split(TOKEN);
    return parts.map(function (p, i) {
      if (!p) return null;
      var k = (keyBase || 'r') + i;
      if (/^https?:\/\//.test(p)) return h('a', { key: k, className: 'dj-link', href: p, target: '_blank', rel: 'noreferrer' }, shortUrl(p));
      if (new RegExp('^' + TICKET.source + '$').test(p)) return h(TicketChip, { key: k, id: p });
      return p;
    });
  }

  function Kbd(props) {
    return h('kbd', { className: cx('dj-kbd', props.className) }, props.children);
  }

  function Button(props) {
    var variant = props.variant || 'quiet';
    var rest = Object.assign({}, props);
    delete rest.variant; delete rest.kbd; delete rest.className; delete rest.children;
    return h('button', Object.assign({ type: 'button' }, rest, { className: cx('dj-btn', 'dj-btn-' + variant, props.className) }),
      props.children,
      props.kbd ? h(Kbd, { className: 'dj-btn-kbd' }, props.kbd) : null);
  }

  function TicketChip(props) {
    var label = props.id;
    if (props.href) return h('a', { className: 'dj-ticket', href: props.href, target: '_blank', rel: 'noreferrer' }, label);
    return h('span', { className: 'dj-ticket' }, label);
  }

  function CarryMarker(props) {
    var d = props.days || 0;
    if (d < 1) return null;
    return h('span', { className: 'dj-carry', title: 'Carried over ' + d + (d === 1 ? ' day' : ' days') },
      h('span', { 'aria-hidden': 'true' }, '↻'), ' ' + d + 'd');
  }

  function CheckGlyph() {
    return h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, 'aria-hidden': 'true' },
      h('path', { d: 'M3.5 8.5l3 3 6-7', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }));
  }

  function TaskItem(props) {
    var status = props.status || 'open';
    var carried = props.carriedDays || 0;
    var stuck = status === 'open' && carried >= 5;
    return h('li', { className: cx('dj-task', 'dj-task-' + status, stuck && 'dj-task-stuck', props.className) },
      h('button', {
        type: 'button', role: 'checkbox', className: 'dj-check',
        'aria-checked': status === 'done' ? 'true' : 'false',
        'aria-label': (status === 'done' ? 'Mark not done: ' : 'Mark done: ') + props.text,
        disabled: status === 'dropped',
        onClick: props.onToggle
      }, status === 'done' ? h(CheckGlyph) : null),
      h('span', { className: 'dj-task-text' }, rich(props.text, 't')),
      h('span', { className: 'dj-task-meta' },
        status === 'dropped' ? h('span', { className: 'dj-dropped' }, 'dropped') : null,
        status !== 'dropped' ? h(CarryMarker, { days: carried }) : null));
  }

  function TaskInput(props) {
    var s = useState(''); var v = s[0], setV = s[1];
    return h('label', { className: 'dj-input' },
      h('span', { className: 'dj-input-plus', 'aria-hidden': 'true' }, '+'),
      h('input', {
        type: 'text', value: v, autoFocus: props.autoFocus,
        placeholder: props.placeholder || 'Add a task',
        'aria-label': 'Add a task',
        onChange: function (e) { setV(e.target.value); },
        onKeyDown: function (e) {
          if (e.key === 'Enter' && v.trim()) { if (props.onAdd) props.onAdd(v.trim()); setV(''); }
          if (e.key === 'Escape') { setV(''); e.target.blur(); }
        }
      }),
      h(Kbd, null, 'Enter'));
  }

  function ProgressMeter(props) {
    var done = props.done || 0, total = props.total || 0;
    var pct = total ? Math.round((done / total) * 100) : 0;
    return h('div', { className: 'dj-progress' },
      h('span', { className: 'dj-progress-text' }, total ? (done + ' of ' + total + ' done') : 'No tasks yet'),
      h('span', { className: 'dj-progress-track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': done, 'aria-label': 'Tasks done' },
        h('span', { className: 'dj-progress-fill', style: { width: pct + '%' } })));
  }

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function toDate(d) { return d instanceof Date ? d : new Date(String(d) + 'T00:00:00'); }
  function longDate(d) { d = toDate(d); return { weekday: DAYS[d.getDay()], date: d.getDate() + ' ' + MONTHS[d.getMonth()], year: d.getFullYear() }; }
  function shortDate(d) { d = toDate(d); return DAYS[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3); }

  function DayHeader(props) {
    var L = longDate(props.date);
    return h('header', { className: 'dj-dayhead' },
      h('div', { className: 'dj-dayhead-titles' },
        h('div', { className: 'dj-dayhead-kicker' }, props.isToday ? 'Today' : String(L.year)),
        h('h1', { className: 'dj-dayhead-date' }, L.weekday + ', ' + L.date)),
      h('nav', { className: 'dj-dayhead-nav', 'aria-label': 'Day navigation' },
        h('button', { type: 'button', className: 'dj-iconbtn', 'aria-label': 'Previous day', onClick: props.onPrev }, '‹'),
        props.isToday ? null : h(Button, { onClick: props.onToday, kbd: 'T' }, 'Today'),
        h('button', { type: 'button', className: 'dj-iconbtn', 'aria-label': 'Next day', onClick: props.onNext }, '›'),
        h(Button, { onClick: props.onJump, kbd: 'G' }, 'Jump to date')));
  }

  function CommentSheet(props) {
    var mode = props.mode || 'edit';
    var title = props.title === undefined ? 'Comments' : props.title;
    var body;
    if (mode === 'read') {
      var paras = String(props.value || '').split(/\n{2,}/);
      body = h('div', { className: 'dj-sheet-body dj-sheet-read' }, paras.map(function (p, i) {
        return h('p', { key: i }, rich(p, 'c' + i));
      }));
    } else {
      body = h('textarea', {
        className: 'dj-sheet-body dj-sheet-edit', value: props.value, rows: props.rows || 6,
        placeholder: props.placeholder || 'Notes, links, questions for later…',
        'aria-label': title || 'Comments',
        onChange: function (e) { if (props.onChange) props.onChange(e.target.value); }
      });
    }
    return h('section', { className: 'dj-sheet' },
      title ? h('h2', { className: 'dj-sheet-title' }, title, props.meta ? h('span', { className: 'dj-sheet-meta' }, props.meta) : null) : null,
      body);
  }

  function PeriodSwitch(props) {
    var opts = props.options || [{ value: 'week', label: 'This week' }, { value: 'month', label: 'This month' }];
    return h('div', { className: 'dj-seg', role: 'radiogroup', 'aria-label': props.label || 'Period' },
      opts.map(function (o) {
        var on = o.value === props.value;
        return h('button', {
          key: o.value, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false',
          className: cx('dj-seg-btn', on && 'is-on'),
          onClick: function () { if (props.onChange) props.onChange(o.value); }
        }, o.label);
      }));
  }

  function StatTile(props) {
    var tone = props.tone || 'done';
    return h('button', {
      type: 'button', className: cx('dj-stat', 'dj-stat-' + tone, props.selected && 'is-on'),
      'aria-pressed': props.selected ? 'true' : 'false', onClick: props.onClick
    },
      h('span', { className: 'dj-stat-label' }, props.label || (tone === 'done' ? 'Done' : 'Remaining')),
      h('span', { className: 'dj-stat-num' }, props.count),
      props.caption ? h('span', { className: 'dj-stat-caption' }, props.caption) : null);
  }

  function ReviewItem(props) {
    var status = props.status || 'open';
    return h('li', { className: cx('dj-review', 'dj-review-' + status) },
      h('span', { className: 'dj-review-text' }, rich(props.text, 'v')),
      h('span', { className: 'dj-review-meta' },
        status === 'open' && props.openDays ? h('span', { className: 'dj-review-age' }, 'open ' + props.openDays + (props.openDays === 1 ? ' day' : ' days')) : null,
        h('button', { type: 'button', className: 'dj-review-day', onClick: props.onOpenDay, 'aria-label': 'Open ' + shortDate(props.day) }, shortDate(props.day), ' ›')));
  }

  window.Journal = Object.assign(window.Journal || {}, {
    DayHeader: DayHeader, ProgressMeter: ProgressMeter, TaskInput: TaskInput, TaskItem: TaskItem,
    CarryMarker: CarryMarker, TicketChip: TicketChip, CommentSheet: CommentSheet, PeriodSwitch: PeriodSwitch,
    StatTile: StatTile, ReviewItem: ReviewItem, Button: Button, Kbd: Kbd,
    richText: rich, formatShortDate: shortDate
  });
})();
