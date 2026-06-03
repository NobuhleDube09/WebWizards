const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Export endpoint
router.get('/reports/export', async (req, res) => {
  try {
    const { type, format } = req.query;
    const userId = req.user?.id; // Get logged-in user ID
    
    let data = [];
    
    // Get data based on type
    switch(type) {
      case 'listings':
        const { data: listings, error: listingsError } = await supabase
          .from('listings')
          .select('*')
          .eq('user_id', userId);
        
        if (listingsError) throw listingsError;
        data = listings;
        break;
        
      case 'orders':
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('seller_id', userId);
        
        if (ordersError) throw ordersError;
        data = orders;
        break;
        
      case 'earnings':
        const { data: earnings, error: earningsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', userId);
        
        if (earningsError) throw earningsError;
        data = earnings;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    // Export as CSV or PDF
    if (format === 'csv') {
      return exportAsCSV(res, data, type);
    } else {
      return exportAsJSON(res, data);
    }
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: Export as CSV
function exportAsCSV(res, data, filename) {
  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'No data to export' });
  }
  
  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const csvRows = [];
  csvRows.push(headers.join(','));
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const csvContent = csvRows.join('\n');
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}_export_${Date.now()}.csv`);
  res.send(csvContent);
}

// Helper: Export as JSON
function exportAsJSON(res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=export_${Date.now()}.json`);
  res.json(data);
}

module.exports = router;