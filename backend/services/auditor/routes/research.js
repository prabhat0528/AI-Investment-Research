import express from 'express';
import { query } from '../../../core/db.js';
import { authenticateToken } from '../../../core/middleware/auth.js';
import { graph } from '../agent/graph.js';

const router = express.Router();

// Helper to extract sections from Markdown report
function extractSection(markdown, sectionHeader) {
  if (!markdown) return "";
  const lines = markdown.split("\n");
  let startIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes(`## ${sectionHeader.toLowerCase()}`) || 
        line.includes(`### ${sectionHeader.toLowerCase()}`) || 
        (line.startsWith('##') && line.includes(sectionHeader.toLowerCase().substring(3)))) {
      startIndex = i;
      break;
    }
  }
  
  if (startIndex === -1) return "";
  
  const content = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ") || lines[i].startsWith("# ")) {
      break;
    }
    content.push(lines[i]);
  }
  return content.join("\n").trim();
}

// 1. POST /api/research - Start async research job
router.post('/research', authenticateToken, async (req, res) => {
  const { companyName } = req.body;
  const userId = req.user.id;

  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required.' });
  }

  try {
    // Insert a pending report row into DB to get a reportId (jobId)
    const initLogs = [
      {
        agent: "Planner",
        status: "waiting",
        message: `Research scheduled for "${companyName}".`,
        timestamp: new Date()
      },
      { agent: "Financial Agent", status: "waiting", message: "Waiting for Planner...", timestamp: new Date() },
      { agent: "News Agent", status: "waiting", message: "Waiting for Planner...", timestamp: new Date() },
      { agent: "Risk Agent", status: "waiting", message: "Waiting for Financial Agent...", timestamp: new Date() },
      { agent: "Sentiment Agent", status: "waiting", message: "Waiting for News Agent...", timestamp: new Date() },
      { agent: "Valuation Agent", status: "waiting", message: "Waiting for analysis audits...", timestamp: new Date() },
      { agent: "Report Generator", status: "waiting", message: "Waiting for decision audit...", timestamp: new Date() }
    ];

    const result = await query(
      `INSERT INTO research_reports (user_id, company_name, ticker, decision, reasoning, report_sections, logs) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, companyName, 'PENDING', 'HOLD', 'Research analysis is in progress...', '{}', JSON.stringify(initLogs)]
    );

    const reportId = result.rows[0].id;

    // Run LangGraph.js asynchronously and stream updates into database in the background
    (async () => {
      try {
        const stream = await graph.stream({ companyName });
        let currentState = { 
          logs: initLogs, 
          ticker: 'PENDING', 
          companyName,
          decision: 'HOLD',
          reasoning: 'Research analysis in progress...'
        };

        for await (const update of stream) {
          // Object key is the node name that finished
          const nodeName = Object.keys(update)[0];
          const nodeState = update[nodeName];

          // 1. Merge logs: replace the waiting logs with actual running/finished logs
          if (nodeState.logs) {
            nodeState.logs.forEach(newLog => {
              const idx = currentState.logs.findIndex(l => l.agent === newLog.agent);
              if (idx !== -1) {
                currentState.logs[idx] = newLog;
              } else {
                currentState.logs.push(newLog);
              }
            });
          }

          // 2. Set node progress state in the log list
          // Update downstream agents status based on active nodes
          if (nodeName === 'planner') {
            currentState.ticker = nodeState.ticker || currentState.ticker;
            currentState.companyName = nodeState.companyName || currentState.companyName;
            
            // Mark financial/news agents as running
            const fIdx = currentState.logs.findIndex(l => l.agent === "Financial Agent");
            const nIdx = currentState.logs.findIndex(l => l.agent === "News Agent");
            if (fIdx !== -1) currentState.logs[fIdx].status = "running";
            if (nIdx !== -1) currentState.logs[nIdx].status = "running";
          }
          else if (nodeName === 'financial_agent') {
            currentState.financialData = nodeState.financialData;
            // Mark risk agent as running
            const rIdx = currentState.logs.findIndex(l => l.agent === "Risk Agent");
            if (rIdx !== -1) currentState.logs[rIdx].status = "running";
          }
          else if (nodeName === 'news_agent') {
            currentState.newsArticles = nodeState.newsArticles;
            // Mark sentiment agent as running
            const sIdx = currentState.logs.findIndex(l => l.agent === "Sentiment Agent");
            if (sIdx !== -1) currentState.logs[sIdx].status = "running";
          }
          else if (nodeName === 'risk_agent' || nodeName === 'sentiment_agent') {
            // Check if both are finished, then mark valuation as running
            const rLog = currentState.logs.find(l => l.agent === "Risk Agent");
            const sLog = currentState.logs.find(l => l.agent === "Sentiment Agent");
            if (rLog?.status === 'finished' && sLog?.status === 'finished') {
              const vIdx = currentState.logs.findIndex(l => l.agent === "Valuation Agent");
              if (vIdx !== -1) currentState.logs[vIdx].status = "running";
            }
          }
          else if (nodeName === 'valuation_agent') {
            currentState.decision = nodeState.decision || currentState.decision;
            currentState.reasoning = nodeState.reasoning || currentState.reasoning;
            currentState.strategicAudit = nodeState.strategicAudit || currentState.strategicAudit;
            currentState.financialRisks = nodeState.financialRisks || currentState.financialRisks;
            
            // Mark report generator as running
            const repIdx = currentState.logs.findIndex(l => l.agent === "Report Generator");
            if (repIdx !== -1) currentState.logs[repIdx].status = "running";
          }
          else if (nodeName === 'report_generator') {
            currentState.finalReport = nodeState.finalReport;
          }

          // 3. Update the database record in real-time
          await query(
            `UPDATE research_reports 
             SET company_name = $1, ticker = $2, decision = $3, reasoning = $4, logs = $5 
             WHERE id = $6`,
            [
              currentState.companyName,
              currentState.ticker,
              currentState.decision,
              currentState.reasoning,
              JSON.stringify(currentState.logs),
              reportId
            ]
          );
        }

        // 4. Once streaming is complete, compile the final segmented sections
        const finalReportText = currentState.finalReport;
        const quote = currentState.financialData?.quote || {};
        const ratios = currentState.financialData?.statements?.ratios || {};
        
        const reportSections = {
          summary: extractSection(finalReportText, "1. Summary"),
          financialAnalysis: extractSection(finalReportText, "2. Financial Analysis"),
          businessAnalysis: extractSection(finalReportText, "3. Business Analysis"),
          competitivePosition: extractSection(finalReportText, "4. Competitive Position"),
          valuation: extractSection(finalReportText, "5. Valuation"),
          risks: extractSection(finalReportText, "6. Risks"),
          opportunities: extractSection(finalReportText, "7. Opportunities"),
          investmentThesis: extractSection(finalReportText, "8. Investment Thesis"),
          references: currentState.newsArticles && currentState.newsArticles.length > 0
            ? currentState.newsArticles.map(n => `- [${n.title}](${n.link || '#'}) (${n.publisher})`).join("\n")
            : newsArticlesList(currentState.logs), // Fallback reference generator
          fullReport: finalReportText,
          metrics: {
            peRatio: quote.trailingPE || quote.forwardPE || null,
            roe: ratios.returnOnEquity || null,
            debtToEquity: ratios.debtToEquity || null,
            profitMargin: ratios.profitMargin || null
          },
          history: currentState.financialData?.history || [],
          strategicAudit: currentState.strategicAudit || {},
          financialRisks: currentState.financialRisks || {}
        };

        await query(
          `UPDATE research_reports 
           SET report_sections = $1 
           WHERE id = $2`,
          [JSON.stringify(reportSections), reportId]
        );

      } catch (err) {
        console.error(`Agent run error for report ${reportId}:`, err);
        const failLogs = [{ agent: "System", status: "failed", message: err.message, timestamp: new Date() }];
        await query(
          `UPDATE research_reports 
           SET reasoning = $1, logs = $2 
           WHERE id = $3`,
          [`Research failed: ${err.message}`, JSON.stringify(failLogs), reportId]
        );
      }
    })();

    res.status(202).json({
      message: 'Research task initiated successfully.',
      reportId
    });

  } catch (error) {
    console.error('Error starting research:', error);
    res.status(500).json({ error: 'Server error starting research task.' });
  }
});

// Helper to compile news references if parsing fails
function newsArticlesList(logs) {
  return [
    "- Yahoo Finance Quotes", 
    "- Yahoo Finance Financial Summaries", 
    "- Yahoo Finance Search & News feeds"
  ].join("\n");
}

// 2. GET /api/research/status/:id - Poll status and progress logs
router.get('/research/status/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      'SELECT id, company_name, ticker, decision, reasoning, report_sections, logs, created_at FROM research_reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const report = result.rows[0];
    
    // Check if the report has finished processing
    // (Finished when the final report generator logs status is "finished" or if there is a failed log)
    const logs = report.logs || [];
    const repGenLog = logs.find(l => l.agent === "Report Generator");
    const isFinished = repGenLog?.status === 'finished';
    const isFailed = logs.some(l => l.status === 'failed');

    res.json({
      id: report.id,
      companyName: report.company_name,
      ticker: report.ticker,
      decision: report.decision,
      reasoning: report.reasoning,
      reportSections: report.report_sections,
      logs: report.logs,
      createdAt: report.created_at,
      status: isFailed ? 'failed' : (isFinished ? 'finished' : 'running')
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Server error retrieving job status.' });
  }
});

// 3. GET /api/research/history - Fetch research history sidebar items
router.get('/research/history', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await query(
      `SELECT id, company_name, ticker, decision, reasoning, created_at 
       FROM research_reports 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Server error retrieving history.' });
  }
});

// 4. GET /api/research/report/:id - Get full report details
router.get('/research/report/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      'SELECT id, company_name, ticker, decision, reasoning, report_sections, logs, created_at FROM research_reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found.' });
    }

    const report = result.rows[0];
    res.json({
      id: report.id,
      companyName: report.company_name,
      ticker: report.ticker,
      decision: report.decision,
      reasoning: report.reasoning,
      reportSections: report.report_sections,
      logs: report.logs,
      createdAt: report.created_at
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    res.status(500).json({ error: 'Server error retrieving report details.' });
  }
});

// 5. DELETE /api/research/report/:id - Delete a report from history
router.delete('/research/report/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      'DELETE FROM research_reports WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found or unauthorized.' });
    }

    res.json({ message: 'Report deleted successfully.', id });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Server error deleting report.' });
  }
});

export default router;
