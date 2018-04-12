var _ = require('lodash');
var log = require('../core/log');

var strat = {};

strat.init = function() {
  this.input = 'candle';
  this.currentTrend = 'short';

  // Most strategies need a minimal amount of history before the trading strategy can be started.
  // For example the strategy may be calculating a moving average for the first 3 candles,
  // so it must have at least 3 candles to start.
  // The check function is executed after the required history period is over.
  // The default required history is 0.
  //this.requiredHistory = this.settings.enterSlow + 1; //config.tradingAdvisor.historySize;
  // set to 0  - in the check method we populate array 'candles' with slowEntry+1 candles before giving advice anyway, so no warmup period required.
  // could probably refactor
  this.requiredHistory = 0;


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
  this.maxCandlesLength = this.settings.enterSlow + 1;
  this.stop = 0

  this.addTalibIndicator('atr', 'atr', { optInTimePeriod: this.atrPeriod });
}

// What happens on every new candle?
strat.update = function(candle) {
  manageTrailingStopLoss(candle, this)

  this.candles.push(candle);

  let start = (this.candles.length < this.maxCandlesLength) ? 0 : (this.candles.length - this.maxCandlesLength)
  this.candles =  this.candles.slice(start)
}

// For debugging purposes.
strat.log = function() {
}

shouldEnterL = function(candle, currentFrame) {
  return checkEnterFastL(candle, currentFrame) ? checkEnterFastL(candle, currentFrame) : checkEnterSlowL(candle, currentFrame)
}

checkEnterFastL = function(candle, currentFrame) {
  if (candle.high > highest(currentFrame.enterFast, currentFrame)) {
    currentFrame.currentTrend = 'fastL'
    return true
  }
}

checkEnterSlowL = function(candle, currentFrame) {
  if (candle.high > highest(currentFrame.enterSlow, currentFrame)) {
    currentFrame.currentTrend = 'slowL'
    return true
  }
}

shouldExitL = function(candle, currentFrame) {
  if (currentFrame.currentTrend === "fastL") {
    return checkExitFastL(candle, currentFrame)
  } else if(currentFrame.currentTrend === "slowL") {
    return checkExitSlowL(candle, currentFrame)
  }
}

checkExitSlowL = function(candle, currentFrame) {
  if (candle.low <= lowest(currentFrame.exitSlow, currentFrame) || (currentFrame.stop !== 0 && candle.close <= currentFrame.stop)) {
    currentFrame.currentTrend = 'short'
    return true
  }
}

checkExitFastL = function(candle, currentFrame) {
  if (candle.low <= lowest(currentFrame.exitFast, currentFrame) || (currentFrame.stop !== 0 && candle.close <= currentFrame.stop)) {
    currentFrame.currentTrend = 'short'
    return true
  }
}

lowest = function(numberOfCandlesBack, currentFrame) {
  let relaventCandles = currentFrame.candles.slice((currentFrame.maxCandlesLength-numberOfCandlesBack), -1)
  return Math.min.apply(Math, relaventCandles.map(function(c) { return c.low; }))
}

highest = function(numberOfCandlesBack, currentFrame) {
  let relaventCandles = currentFrame.candles.slice((currentFrame.maxCandlesLength-numberOfCandlesBack), -1)
  return Math.max.apply(Math, relaventCandles.map(function(c) { return c.high; }))
}

manageStopLoss = function(candle, currentFrame) {
  if (currentFrame.useAtrStop) {
    let atr = currentFrame.talibIndicators.atr.result.outReal;
    currentFrame.stop = (candle.close - (atr * currentFrame.atrStop))
  }
}

manageTrailingStopLoss = function(candle, currentFrame) {
  if (currentFrame.useTrailingAtrStop) {
    let atr = currentFrame.talibIndicators.atr.result.outReal;

    // Update the stop loss if the newly suggest stop loss is higher than previous value
    if (currentFrame.stop < (candle.close - (atr * currentFrame.atrStop))) {
      currentFrame.stop = candle.close - (atr * currentFrame.atrStop)
    }
  }
}

computeExitSignal = function(candle, currentFrame) {
  if(currentFrame.currentTrend === 'fastL' || currentFrame.currentTrend === 'slowL') {
    if (shouldExitL(candle, currentFrame)) {
      currentFrame.currentTrend = 'short';
      currentFrame.stop = 0;
      currentFrame.advice('short');
    }
  }
}

computeEntrySignal = function(candle, currentFrame) {
  if(currentFrame.currentTrend === 'short') {
    if (shouldEnterL(candle, currentFrame)) {
      manageStopLoss(candle, currentFrame)

      currentFrame.advice('long');
    }
  }
}


strat.check = function(candle) {
  // won't do anything until we have slowEntry+1 number of candles
  if (this.candles.length === this.maxCandlesLength) {
    computeExitSignal(candle, this)
    computeEntrySignal(candle, this)
  }
}

module.exports = strat;
