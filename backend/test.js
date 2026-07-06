import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

try {
  const result = await yahooFinance.search('Apple');
  console.log("Search result successfully fetched! Found items:", result.quotes.length);
} catch (e) {
  console.log("Search failed:", e);
}

try {
  const quote = await yahooFinance.quote('AAPL');
  console.log("Quote successfully fetched! Price:", quote.regularMarketPrice);
} catch (e) {
  console.log("Quote failed:", e);
}
