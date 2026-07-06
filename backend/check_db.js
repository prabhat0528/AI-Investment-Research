import { query } from './db.js';

try {
  const result = await query('SELECT id, company_name, ticker, decision, reasoning, report_sections, logs FROM research_reports ORDER BY created_at DESC LIMIT 2');
  console.log("Successfully fetched recent reports.");
  result.rows.forEach(row => {
    console.log(`\n=================== REPORT ID: ${row.id} ===================`);
    console.log("Company Name:", row.company_name);
    console.log("Ticker:", row.ticker);
    console.log("Decision:", row.decision);
    console.log("Reasoning:", row.reasoning);
    console.log("Logs count:", row.logs?.length);
    console.log("Report Sections Keys:", Object.keys(row.report_sections || {}));
    if (row.report_sections) {
      console.log("Report Sections Sample (Summary):", row.report_sections.summary?.substring(0, 200));
      console.log("Report Sections Sample (FullReport length):", row.report_sections.fullReport?.length);
    }
  });
  process.exit(0);
} catch (e) {
  console.error("Failed to query DB:", e);
  process.exit(1);
}
