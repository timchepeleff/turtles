var _ = require('lodash');
var log = require('../core/log');

var strat = {};

strat.init = function() {
  this.input = 'candle';
  this.currentTrend = 'short';
  this.requiredHistory = 55;
  this.candles = [];
  this.enterFast = this.settings.enterFast;
  this.exitFast = this.settings.exitFast;
  this.enterSlow = this.settings.enterSlow;
  this.exitSlow = this.settings.exitSlow;
  this.hiekenAshi = this.settings.hiekenAshi;
  this.useAtrStop = this.settings.useAtrStop;
  this.useTrailingAtrStop = this.settings.useTrailingAtrStop;
  this.atrPeriod = this.settings.atrPeriod;
  this.atrStop = this.settings.atrStop;
  this.maxCandlesLength = 56;
  this.stop = 0

  this.addIndicator('heiken', 'HEIKEN');
  this.addTalibIndicator('atr', 'atr', { optInTimePeriod: this.atrPeriod });
}

// What happens on every new candle?
strat.update = function(candle) {
  if (this.useTrailingAtrStop) {
    let atr = this.talibIndicators.atr.result.outReal;
    if (this.stop < (candle.close - (atr * this.atrStop))) {
      this.stop = this.stop > (candle.close - (atr * this.atrStop))
    }
  }
}

// For debugging purposes.
strat.log = function() {
}

shouldEnterL = function(candle, strat) {
  return checkEnterFastL(candle, strat) ? checkEnterFastL(candle, strat) : checkEnterSlowL(candle, strat)
}

checkEnterFastL = function(candle, strat) {
  if (candle.high > highest(strat.enterFast, strat)) {
    strat.currentTrend = 'fastL'
    return true
  }
}

checkEnterSlowL = function(candle, strat) {
  if (candle.high > highest(strat.enterSlow, strat)) {
    strat.currentTrend = 'slowL'
    return true
  }
}

shouldExitL = function(candle, strat) {
  if (strat.currentTrend === "fastL") {
    return checkExitFastL(candle, strat)
  } else if(strat.currentTrend === "slowL") {
    return checkExitSlowL(candle, strat)
  }
}


checkExitSlowL = function(candle, strat) {
  if (candle.low <= lowest(strat.exitSlow, strat) || (strat.stop !== 0 && candle.close <= strat.stop)) {
    strat.currentTrend = 'short'
    return true
  }
}

checkExitFastL = function(candle, strat) {
  if (candle.low <= lowest(strat.exitFast, strat) || (strat.stop !== 0 && candle.close <= strat.stop)) {
    strat.currentTrend = 'short'
    return true
  }
}

lowest = function(numberOfCandlesBack, strat) {
  let relaventCandles = strat.candles.slice((strat.maxCandlesLength-numberOfCandlesBack), -1)
  return Math.min.apply(Math, relaventCandles.map(function(c) { return c.low; }))
}

highest = function(numberOfCandlesBack, strat) {
  let relaventCandles = strat.candles.slice((strat.maxCandlesLength-numberOfCandlesBack), -1)
  return Math.max.apply(Math, relaventCandles.map(function(c) { return c.high; }))
}

strat.check = function(candle) {
  let atr = this.talibIndicators.atr.result.outReal;

  if (this.hiekenAshi) {
    let heiken = this.indicators.heiken;
    var newCandle = {
        close: heiken.close,
        open: heiken.open,
        high: heiken.high,
        low: heiken.low
      }

    this.candles.push(newCandle);

    let start = (this.candles.length < this.maxCandlesLength) ? 0 : (this.candles.length - this.maxCandlesLength)
    this.candles =  this.candles.slice(start)
  } else {
    var newCandle = candle

    this.candles.push(newCandle);

    let start = (this.candles.length < this.maxCandlesLength) ? 0 : (this.candles.length - this.maxCandlesLength)
    this.candles =  this.candles.slice(start)
  }

  if (this.candles.length === this.maxCandlesLength) {
    if(this.currentTrend === 'fastL' || this.currentTrend === 'slowL') {
      if (shouldExitL(newCandle, this)) {
        this.currentTrend = 'short';
        this.stop = 0;
        this.advice('short');
      }
    } else {
      if (shouldEnterL(newCandle, this)) {
        // if (this.useAtrStop) { this.stop = (newCandle.close - (atr * this.atrStop)) }
        if (this.useAtrStop) { this.stop = (newCandle.close - (atr * this.atrStop)) }

        this.advice('long');
      }
    }
  }
}

module.exports = strat;
