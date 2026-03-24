#!/usr/bin/env node
// validate.js — Schema + sanity checks for companies.json
// Catches: missing fields, stale data, wrong market caps, P/S mismatches
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'companies.json');
let errors = 0, warnings = 0;
function err(m) { console.error('  ERROR: ' + m); errors++; }
function warn(m) { console.warn('  WARN:  ' + m); warnings++; }
function ok(m) { console.log('  OK:    ' + m); }

console.log('=== Equity Dashboard Validator ===\n');

// Parse
let data;
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); ok('Valid JSON'); }
catch (e) { err('Invalid JSON: ' + e.message); process.exit(1); }

// Meta
console.log('\n[META]');
if (!data.meta || !data.meta.date) err('Missing meta.date');
else {
  var days = Math.floor((new Date() - new Date(data.meta.date)) / 86400000);
  if (days > 30) warn('Data is ' + days + ' days old');
  else ok('Data age: ' + days + ' days');
}

// FinTwit + Portfolios
console.log('\n[FINTWIT & PORTFOLIOS]');
if (!data.fintwit || data.fintwit.length < 10) err('Need >=10 fintwit, got ' + (data.fintwit||[]).length);
else ok(data.fintwit.length + ' fintwit profiles');

['blind_1','blind_2','blind_3'].forEach(function(p) {
  if (!data.portfolios || !data.portfolios[p]) { err('Missing ' + p); return; }
  var sum = Object.values(data.portfolios[p].allocation).reduce(function(a,b){return a+b},0);
  if (sum !== 100) err(p + ' = ' + sum + '% (must be 100)');
  else ok(p + ': 100%');
});

// Schema per company
console.log('\n[SCHEMA]');
var REQ = ['NVDA','AAPL','MSFT','GOOGL','META','AMZN','TSLA','TSM'];
REQ.forEach(function(t) {
  var c = (data.companies||{})[t];
  if (!c) { err('Missing ' + t); return; }
  if (!c.name) err(t + ': no name');
  if (!c.price) err(t + ': no price');
  if (!c.mcap) err(t + ': no mcap');
  if (!c.valuation) err(t + ': no valuation');
  else ['trailingPE','forwardPE'].forEach(function(k) {
    if (!c.valuation[k]) err(t + ': no ' + k);
    else if (!c.valuation[k].sources) err(t + ': no sources for ' + k);
  });
  if (!c.kpis || c.kpis.length < 3) err(t + ': <3 KPIs');
  if (!c.quarters || c.quarters.length < 3) err(t + ': <3 quarters');
  if (!c.earningsCall) err(t + ': no earningsCall');
  else {
    if (!c.earningsCall.highlights || c.earningsCall.highlights.length < 3) err(t + ': <3 EC highlights');
    if (!c.earningsCall.qa || c.earningsCall.qa.length < 3) err(t + ': <3 EC Q&A');
  }
  if (!c.sentiment) err(t + ': no sentiment');
  if (!c.bull || !c.bear) err(t + ': no bull/bear');
  ok(t + ': schema OK');
});

// Sanity checks
console.log('\n[SANITY CHECKS]');
function parseMcap(s) {
  if (!s) return null;
  var c = s.replace(/[~$,\s]/g,'');
  if (c.indexOf('T')>=0) return parseFloat(c);
  if (c.indexOf('B')>=0) return parseFloat(c)/1000;
  return null;
}
function parseNum(s) { return s ? parseFloat(s.replace(/[~$,]/g,'')) : null; }

REQ.forEach(function(t) {
  var c = (data.companies||{})[t];
  if (!c) return;
  var mcap = parseMcap(c.mcap);

  // Market cap minimum
  if (mcap !== null) {
    if (mcap < 0.5) err(t + ': mcap ' + c.mcap + ' < $500B — almost certainly wrong');
    else if (mcap < 1.0) warn(t + ': mcap ' + c.mcap + ' < $1T — verify current');
    else ok(t + ': mcap ' + c.mcap);
  } else warn(t + ': cannot parse mcap "' + c.mcap + '"');

  // Price vs 52w range
  var price = parseNum(c.price);
  if (price && c.w52) {
    var parts = c.w52.replace(/[$]/g,'').split('-');
    if (parts.length === 2) {
      var lo = parseFloat(parts[0]), hi = parseFloat(parts[1]);
      if (price < lo * 0.85 || price > hi * 1.15)
        warn(t + ': price ' + c.price + ' outside 52w ' + c.w52 + ' (+/-15%)');
      else ok(t + ': price in range');
    }
  }

  // P/S cross-check: mcap / (last Q rev * 4) ≈ stated P/S
  if (mcap && c.valuation && c.valuation.ps && c.quarters && c.quarters.length > 0) {
    var statedPS = parseFloat(c.valuation.ps.value);
    var lastRev = parseNum(c.quarters[c.quarters.length-1].rev);
    if (lastRev && statedPS > 0) {
      var calcPS = (mcap * 1000) / (lastRev * 4);
      var diff = Math.abs(calcPS - statedPS) / statedPS;
      if (diff > 0.30) err(t + ': P/S mismatch! stated=' + statedPS.toFixed(1) + ' calc=' + calcPS.toFixed(1) + ' (' + (diff*100).toFixed(0) + '% off). Check mcap or revenue.');
      else if (diff > 0.15) warn(t + ': P/S deviation stated=' + statedPS.toFixed(1) + ' calc=' + calcPS.toFixed(1));
      else ok(t + ': P/S cross-check OK');
    }
  }

  // Market cap source must be named (not just "Derived")
  if (c.valuation && c.valuation.ps && c.valuation.ps.sources) {
    var src = c.valuation.ps.sources;
    if (src.indexOf('Derived') >= 0 && !/SA|GF|MT|CompaniesMarketCap|MacroTrends/.test(src))
      warn(t + ': P/S source says "Derived" without named mcap source');
  }

  // Trailing P/E sanity
  if (c.valuation && c.valuation.trailingPE) {
    var tpe = parseFloat(c.valuation.trailingPE.value);
    if (tpe > 500) warn(t + ': trailing P/E ' + tpe + ' extremely high');
    if (tpe > 0 && tpe < 5) warn(t + ': trailing P/E ' + tpe + ' very low for Mag7');
  }

  // Forward < Trailing usually
  if (c.valuation && c.valuation.trailingPE && c.valuation.forwardPE) {
    var tp = parseFloat(c.valuation.trailingPE.value);
    var fp = parseFloat(c.valuation.forwardPE.value);
    if (fp > tp * 1.5 && tp > 10)
      warn(t + ': fwd P/E (' + fp + ') >> trailing (' + tp + ') — unusual');
  }
});

// Summary
console.log('\n=== RESULT ===');
if (errors > 0) {
  console.error('FAILED: ' + errors + ' error(s), ' + warnings + ' warning(s)');
  process.exit(1);
} else if (warnings > 0) {
  console.log('PASSED with ' + warnings + ' warning(s)');
  process.exit(0);
} else {
  console.log('PASSED: All checks OK');
  process.exit(0);
}
