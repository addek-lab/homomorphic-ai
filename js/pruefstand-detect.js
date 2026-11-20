/* KI-Datenschutz-Prüfstand: Erkennung im Browser (Port der Python-Regeln).
   Läuft vollständig lokal: Es werden keine Texte versendet. */
(function (global) {
  'use strict';

  var U = 'A-ZÄÖÜÇŞİĞ', L = 'a-zäöüßçşığ';
  var GAZ_NAMES = ['Anna', 'Lukas', 'Sophie', 'Jonas', 'Leonie', 'Felix', 'Marie', 'Maximilian', 'Hannah', 'Paul',
    'Laura', 'Tim', 'Lena', 'Niklas', 'Julia', 'Jan', 'Katharina', 'Moritz', 'Sarah', 'David',
    'Mia', 'Elias', 'Emma', 'Noah', 'Lea', 'Ben', 'Clara', 'Finn', 'Johanna', 'Tobias'];
  var GAZ_MEDS = ['Metformin', 'Ramipril', 'Ibuprofen', 'Salbutamol', 'Sertralin', 'Pantoprazol'];
  var GAZ_DX = ['Diabetes mellitus Typ 2', 'arterielle Hypertonie', 'allergisches Asthma',
    'mittelgradige depressive Episode', 'Kreuzschmerz', 'Gastritis', 'Harnwegsinfekt', 'Mammakarzinom'];
  var PLZ_STOP = { 'Euro': 1, 'Mal': 1, 'Uhr': 1, 'Stück': 1, 'Prozent': 1 };

  var LABEL_DE = {
    PERSON: 'Person (Name)', ADRESSE: 'Straße + Hausnr.', PLZ_ORT: 'PLZ + Ort', GEBURTSDATUM: 'Geburtsdatum',
    TELEFON: 'Telefon', EMAIL: 'E-Mail', IBAN: 'IBAN', BIC: 'BIC', KREDITKARTE: 'Kreditkarte',
    STEUER_ID: 'Steuer-ID', KVNR: 'Krankenversichertennr.', ICD10: 'ICD-10-Code', DIAGNOSE: 'Diagnose (Text)',
    MEDIKAMENT: 'Medikament', OTHER: 'Sonstiges'
  };

  /* ---------------- Prüfsummen ---------------- */
  function ibanValid(v) {
    var s = v.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
    if (s.slice(0, 2) === 'DE' && s.length !== 22) return false;
    var moved = s.slice(4) + s.slice(0, 4), rem = 0;
    for (var i = 0; i < moved.length; i++) {
      var c = moved.charCodeAt(i), d = c >= 65 ? String(c - 55) : moved.charAt(i);
      for (var j = 0; j < d.length; j++) rem = (rem * 10 + (d.charCodeAt(j) - 48)) % 97;
    }
    return rem === 1;
  }

  function luhnValid(v) {
    var digits = v.replace(/[\s-]/g, '').replace(/\D/g, '');
    if (digits.length < 12 || digits.length > 19) return false;
    var total = 0;
    for (var i = 0; i < digits.length; i++) {
      var d = +digits.charAt(digits.length - 1 - i);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      total += d;
    }
    return total % 10 === 0;
  }

  function steuerCheck(first10) {
    var product = 10;
    for (var i = 0; i < first10.length; i++) {
      var s = (+first10.charAt(i) + product) % 10;
      if (s === 0) s = 10;
      product = (s * 2) % 11;
    }
    var check = 11 - product;
    return check === 10 ? 0 : check;
  }

  function steuerIdValid(v) {
    var s = v.replace(/\s/g, '');
    if (!/^\d{11}$/.test(s) || s.charAt(0) === '0') return false;
    var first10 = s.slice(0, 10), repeated = [];
    for (var d = 0; d < 10; d++) {
      var c = first10.split(String(d)).length - 1;
      if (c > 1) repeated.push(c);
    }
    if (repeated.length !== 1 || (repeated[0] !== 2 && repeated[0] !== 3)) return false;
    if (/(\d)\1\1/.test(first10)) return false;
    return +s.charAt(10) === steuerCheck(first10);
  }

  function kvnrValid(v) {
    var s = v.trim().toUpperCase();
    if (!/^[A-Z]\d{9}$/.test(s)) return false;
    var seq = ('0' + (s.charCodeAt(0) - 64)).slice(-2) + s.slice(1, 9), total = 0;
    for (var i = 0; i < seq.length; i++) {
      var p = +seq.charAt(i) * (i % 2 === 0 ? 1 : 2);
      total += Math.floor(p / 10) + (p % 10);
    }
    return +s.charAt(9) === total % 10;
  }

  /* ---------------- Hilfen ---------------- */
  function hasContext(text, start, words, windowSize) {
    var before = text.slice(Math.max(0, start - windowSize), start).toLowerCase();
    for (var i = 0; i < words.length; i++) if (before.indexOf(words[i]) !== -1) return true;
    return false;
  }

  function find(pattern, text, label, validate, group, flags) {
    var re = new RegExp(pattern, (flags || '') + 'g' + (group ? 'd' : '')), out = [], m;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      var s, e;
      if (group) { s = m.indices[group][0]; e = m.indices[group][1]; } else { s = m.index; e = m.index + m[0].length; }
      if (validate && !validate(m, text.slice(s, e))) continue;
      out.push({ start: s, end: e, label: label });
    }
    return out;
  }

  var FIRST_PRIORITY = { IBAN: 1, KREDITKARTE: 1, STEUER_ID: 1, KVNR: 1, BIC: 1, EMAIL: 1 };

  function resolve(spans) {
    var order = spans.slice().sort(function (a, b) {
      var pa = FIRST_PRIORITY[a.label] ? 0 : 1, pb = FIRST_PRIORITY[b.label] ? 0 : 1;
      if (pa !== pb) return pa - pb;
      var la = a.end - a.start, lb = b.end - b.start;
      if (la !== lb) return lb - la;
      return a.start - b.start;
    });
    var kept = [];
    order.forEach(function (s) {
      var free = kept.every(function (k) { return s.end <= k.start || s.start >= k.end; });
      if (free) kept.push(s);
    });
    return kept.sort(function (a, b) { return a.start - b.start; });
  }

  /* ---------------- Detektor 1: einfacher Regex-Filter ---------------- */
  function detectNaiv(text) {
    var out = [];
    out = out.concat(find('[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}', text, 'EMAIL'));
    out = out.concat(find('DE\\d{20}', text, 'IBAN'));
    out = out.concat(find('(?<!\\d)\\d{16}(?!\\d)', text, 'KREDITKARTE'));
    out = out.concat(find('(?<!\\d)(?:\\+49|0)[\\d /()\\-]{8,}\\d', text, 'TELEFON'));
    return resolve(out);
  }

  /* ---------------- Detektor 2: Referenz-Regeln ---------------- */
  var DATE = '\\d{1,2}\\.(?:\\d{1,2}\\.|\\s?(?:Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\\s)\\d{4}';
  var NAME = '[' + U + '][' + L + '\\-]+(?:[ ][' + U + '][' + L + '\\-]+){0,2}';

  function detectReferenz(text) {
    var out = [];
    out = out.concat(find('[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}', text, 'EMAIL'));
    out = out.concat(find('(?<![A-Za-z0-9])DE\\d{2}(?: ?\\d{4}){4} ?\\d{2}(?!\\d)', text, 'IBAN', function (m, v) { return ibanValid(v); }));
    out = out.concat(find('(?<![A-Za-z0-9])[A-Z]{4}DE[A-Z0-9]{2}(?:[A-Z0-9]{3})?(?![A-Za-z0-9])', text, 'BIC',
      function (m) { return hasContext(text, m.index, ['bic', 'swift'], 14); }));
    out = out.concat(find('(?<![\\d-])(?:\\d{4}[ -]?){3}\\d{4}(?![\\d-])', text, 'KREDITKARTE', function (m, v) { return luhnValid(v); }));
    out = out.concat(find('(?<!\\d)(?:\\d{11}|\\d{2} \\d{3} \\d{3} \\d{3})(?!\\d)', text, 'STEUER_ID', function (m, v) { return steuerIdValid(v); }));
    out = out.concat(find('(?<![A-Za-z0-9])[A-Z]\\d{9}(?![A-Za-z0-9])', text, 'KVNR', function (m, v) {
      return kvnrValid(v) || hasContext(text, m.index, ['versichert', 'kvnr', 'krankenkasse', 'krankenversicher'], 40);
    }));
    out = out.concat(find('(?<![\\d+])(?:\\+49|0049) ?(?:\\(0\\) ?)?\\d{2,5}[ /-]?\\d{3,9}(?!\\d)', text, 'TELEFON'));
    out = out.concat(find('(?<![\\d+(])0\\d{2,4}[ /-]\\d{3,9}(?: \\d{2,4})?(?!\\d)', text, 'TELEFON'));
    out = out.concat(find('\\(0\\d{1,4}\\) ?\\d{3,5}[ -]?\\d{2,6}(?!\\d)', text, 'TELEFON'));
    out = out.concat(find(DATE, text, 'GEBURTSDATUM', function (m) { return hasContext(text, m.index, ['geb', 'geboren', 'geburtsdatum'], 22); }));
    out = out.concat(find('(?<![A-Za-z' + L + U + '])(?:[' + U + '][' + L + ']+(?:straße|strasse|weg|platz|allee|gasse|ring|damm|ufer)' +
      '|[' + U + '][' + L + ']+ (?:Allee|Markt|Platz))[ ]\\d{1,3}[a-z]?(?![\\dA-Za-z])', text, 'ADRESSE'));
    out = out.concat(find('(?<!\\d)\\d{5}[ ]+[' + U + '][' + L + ']+(?:\\-[' + U + '][' + L + ']+)?(?:[ ](?:am|an der)[ ][' + U + '][' + L + ']+)?',
      text, 'PLZ_ORT', function (m, v) { return !PLZ_STOP[v.split(/\s+/)[1]]; }));
    out = out.concat(find('(?<![A-Za-z0-9])[A-TV-Z]\\d{2}(?:\\.\\d{1,2})?(?![A-Za-z0-9])', text, 'ICD10',
      function (m) { return hasContext(text, m.index, ['icd', 'diagnose'], 40); }));
    out = out.concat(find('(?<![A-Za-z' + L + U + '])(?:' + GAZ_DX.map(function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') +
      ')(?![A-Za-z' + L + '])', text, 'DIAGNOSE', null, 0, 'i'));
    out = out.concat(find('(?<![A-Za-z' + L + U + '])(?:' + GAZ_MEDS.join('|') + ')(?![A-Za-z' + L + '])', text, 'MEDIKAMENT'));
    out = out.concat(find('(?:Herr|Frau|Dr\\.|Prof\\.|Patient(?:in)?|Versicherte(?:\\(r\\)|r)?|Kontoinhaber(?:in)?|Name|Name ist)[: ]+(' + NAME + ')',
      text, 'PERSON', null, 1));
    out = out.concat(find('(?<![A-Za-z' + L + U + '])(?:' + GAZ_NAMES.join('|') + ')[ ][' + U + '][' + L + ']+(?:\\-[' + U + '][' + L + ']+)?', text, 'PERSON'));
    return resolve(out);
  }

  var DETECTORS = { naiv: detectNaiv, referenz: detectReferenz };

  /* ---------------- Maskieren / Zurücksetzen ---------------- */
  function mask(text, spans) {
    var mapping = {}, reverse = {}, counters = {}, out = [], pos = 0;
    spans.slice().sort(function (a, b) { return a.start - b.start; }).forEach(function (s) {
      if (s.start < pos) return;
      var value = text.slice(s.start, s.end), key = s.label + '\u0000' + value;
      if (!reverse[key]) {
        counters[s.label] = (counters[s.label] || 0) + 1;
        reverse[key] = '[' + s.label + '_' + counters[s.label] + ']';
        mapping[reverse[key]] = value;
      }
      out.push(text.slice(pos, s.start), reverse[key]);
      pos = s.end;
    });
    out.push(text.slice(pos));
    return { text: out.join(''), mapping: mapping };
  }

  function restore(text, mapping) {
    var keys = Object.keys(mapping).sort(function (a, b) { return b.length - a.length; });
    if (!keys.length) return text;
    var re = new RegExp(keys.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g');
    return text.replace(re, function (k) { return mapping[k]; });
  }

  function coverage(gold, dets) {
    var covered = 0, cur = gold.start;
    dets.filter(function (d) { return d.end > gold.start && d.start < gold.end; })
      .map(function (d) { return [Math.max(d.start, gold.start), Math.min(d.end, gold.end)]; })
      .sort(function (a, b) { return a[0] - b[0]; })
      .forEach(function (iv) { var s = Math.max(iv[0], cur); if (iv[1] > s) { covered += iv[1] - s; cur = iv[1]; } });
    return covered / (gold.end - gold.start);
  }

  global.Pruefstand = {
    detect: function (name, text) { return DETECTORS[name](text); },
    mask: mask, restore: restore, coverage: coverage, LABEL_DE: LABEL_DE,
    validators: { ibanValid: ibanValid, luhnValid: luhnValid, steuerIdValid: steuerIdValid, kvnrValid: kvnrValid }
  };
})(typeof window !== 'undefined' ? window : globalThis);
