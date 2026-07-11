import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

/**
 * Searches for a ticker symbol given a company name.
 * Returns the ticker symbol and name of the company.
 */
export async function searchTicker(companyName) {
  try {
    const result = await yahooFinance.search(companyName);
    
    if (!result.quotes || result.quotes.length === 0) {
      throw new Error(`No stock quotes found matching "${companyName}".`);
    }

    // Find the first valid equity quote (preferably US markets or major exchanges)
    const validQuote = result.quotes.find(q => q.quoteType === 'EQUITY') || result.quotes[0];
    
    return {
      ticker: validQuote.symbol,
      name: validQuote.shortname || validQuote.longname || companyName
    };
  } catch (error) {
    console.error(`Error searching ticker for "${companyName}":`, error);
    throw error;
  }
}

/**
 * Fetches basic quote data (price, PE ratio, beta, etc.) for a ticker.
 */
export async function getQuoteData(ticker) {
  try {
    const quote = await yahooFinance.quote(ticker);
    
    // Fallback calculation for PE Ratio if not directly populated (common on some international exchanges)
    let trailingPE = quote.trailingPE;
    if (!trailingPE && quote.regularMarketPrice && quote.epsTrailingTwelveMonths && quote.epsTrailingTwelveMonths > 0) {
      trailingPE = quote.regularMarketPrice / quote.epsTrailingTwelveMonths;
    }

    return {
      currentPrice: quote.regularMarketPrice,
      marketCap: quote.marketCap,
      trailingPE: trailingPE ? parseFloat(trailingPE.toFixed(2)) : null,
      forwardPE: quote.forwardPE,
      beta: quote.beta,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      dividendYield: quote.dividendYield,
      volume: quote.regularMarketVolume,
      currency: quote.currency
    };
  } catch (error) {
    console.error(`Error fetching quote for ${ticker}:`, error);
    return {};
  }
}

/**
 * Fetches comprehensive financial statement history and ratios.
 */
export async function getFinancialStatements(ticker) {
  try {
    const summary = await yahooFinance.quoteSummary(ticker, {
      modules: [
        'financialData',
        'defaultKeyStatistics',
        'incomeStatementHistory',
        'balanceSheetHistory',
        'cashflowStatementHistory'
      ]
    });

    const financialData = summary.financialData || {};
    const keyStats = summary.defaultKeyStatistics || {};
    
    // Extract recent financial history (usually last 3-4 years)
    const incomeHistory = (summary.incomeStatementHistory?.incomeStatementHistory || []).map(item => ({
      endDate: item.endDate,
      totalRevenue: item.totalRevenue,
      grossProfit: item.grossProfit,
      operatingIncome: item.operatingIncome,
      netIncome: item.netIncome
    }));

    const balanceHistory = (summary.balanceSheetHistory?.balanceSheetHistory || []).map(item => ({
      endDate: item.endDate,
      totalAssets: item.totalAssets,
      totalLiab: item.totalLiab,
      totalStockholderEquity: item.totalStockholderEquity,
      longTermDebt: item.longTermDebt
    }));

    const cashflowHistory = (summary.cashflowStatementHistory?.cashflowStatementHistory || []).map(item => ({
      endDate: item.endDate,
      operatingCashflow: item.totalCashFromOperatingActivities,
      capitalExpenditures: item.capitalExpenditures,
      freeCashFlow: item.totalCashFromOperatingActivities + (item.capitalExpenditures || 0) // CapEx is negative in Yahoo
    }));

    let debtToEquity = financialData.debtToEquity;
    if ((debtToEquity === undefined || debtToEquity === null) && balanceHistory && balanceHistory.length > 0) {
      const latestBalance = balanceHistory[0];
      if (latestBalance.totalLiab && latestBalance.totalStockholderEquity && latestBalance.totalStockholderEquity !== 0) {
        debtToEquity = latestBalance.totalLiab / latestBalance.totalStockholderEquity;
      }
    }

    return {
      ratios: {
        profitMargin: financialData.profitMargins,
        operatingMargin: financialData.operatingMargins,
        returnOnAssets: financialData.returnOnAssets,
        returnOnEquity: financialData.returnOnEquity,
        debtToEquity: debtToEquity,
        currentRatio: financialData.currentRatio,
        quickRatio: financialData.quickRatio,
        totalCash: financialData.totalCash,
        totalDebt: financialData.totalDebt,
        freeCashflow: financialData.freeCashflow,
        revenueGrowth: financialData.revenueGrowth,
        earningsGrowth: financialData.earningsGrowth,
        priceToBook: keyStats.priceToBook
      },
      incomeStatement: incomeHistory,
      balanceSheet: balanceHistory,
      cashflowStatement: cashflowHistory
    };
  } catch (error) {
    console.error(`Error fetching financials for ${ticker}:`, error);
    return { ratios: {}, incomeStatement: [], balanceSheet: [], cashflowStatement: [] };
  }
}

/**
 * Fetches recent news articles and news sentiment indicators.
 */
export async function getRecentNews(ticker, companyName) {
  try {
    const cleanTicker = ticker.split('.')[0].toLowerCase();
    const keywords = [
      cleanTicker,
      ...companyName.toLowerCase().split(/\s+/).filter(w => w.length > 2 && w !== 'ltd' && w !== 'inc' && w !== 'corp' && w !== 'co' && w !== 'limited')
    ];

    const filterNews = (newsArray) => {
      if (!Array.isArray(newsArray)) return [];
      return newsArray.filter(item => {
        const titleLower = (item.title || "").toLowerCase();
        return keywords.some(kw => titleLower.includes(kw));
      });
    };

    const searchQuery = `${ticker} ${companyName}`;
    const result = await yahooFinance.search(searchQuery);
    let rawNews = result.news || [];

    if (rawNews.length === 0) {
      const fallbackResult = await yahooFinance.search(ticker);
      rawNews = fallbackResult.news || [];
    }

    const filtered = filterNews(rawNews);

    return filtered.map(item => ({
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      pubdate: item.pubdate || item.pubDate
    }));
  } catch (error) {
    console.error(`Error fetching news for ${ticker}:`, error);
    return [];
  }
}

/**
 * Fetches last 30 days of closing prices for line charts.
 */
export async function getHistoricalPrices(ticker) {
  try {
    const today = new Date();
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(today.getDate() - 45);

    const result = await yahooFinance.chart(ticker, {
      period1: fortyFiveDaysAgo,
      period2: today,
      interval: '1d'
    });

    if (!result || !Array.isArray(result.quotes)) return [];

    return result.quotes
      .filter(day => day && day.date && day.close !== null && day.close !== undefined)
      .map(day => ({
        date: day.date,
        close: day.close
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30);
  } catch (error) {
    console.error(`Error fetching historical prices for ${ticker}:`, error);
    return [];
  }
}
