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
    return {
      currentPrice: quote.regularMarketPrice,
      marketCap: quote.marketCap,
      trailingPE: quote.trailingPE,
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

    return {
      ratios: {
        profitMargin: financialData.profitMargins,
        operatingMargin: financialData.operatingMargins,
        returnOnAssets: financialData.returnOnAssets,
        returnOnEquity: financialData.returnOnEquity,
        debtToEquity: financialData.debtToEquity,
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
    const searchQuery = `${ticker} ${companyName}`;
    const result = await yahooFinance.search(searchQuery);

    if (!result.news || result.news.length === 0) {
      const fallbackResult = await yahooFinance.search(ticker);
      if (!fallbackResult.news) return [];
      return fallbackResult.news.map(item => ({
        title: item.title,
        publisher: item.publisher,
        link: item.link,
        pubdate: item.pubdate || item.pubDate
      }));
    }

    return result.news.map(item => ({
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

    const result = await yahooFinance.historical(ticker, {
      period1: fortyFiveDaysAgo.toISOString().split('T')[0],
      period2: today.toISOString().split('T')[0],
      interval: '1d'
    });

    if (!Array.isArray(result)) return [];

    return result
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
