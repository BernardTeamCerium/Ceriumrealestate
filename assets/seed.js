/*
 * Seed data for the Cerium Real Estate accounting dashboard.
 * This is loaded the first time the app runs (or after a data reset).
 * Once loaded, all edits are persisted to the browser's localStorage,
 * so changes survive page reloads.
 */

const SEED_DATA = {
  // The fiscal context the dashboard reports against.
  meta: {
    company: 'Cerium Real Estate',
    fiscalYear: 2026,
    currency: 'USD',
  },

  // Properties give expenses, receivables, and tasks a place to belong.
  properties: [
    { id: 'p1', name: 'Harborview Apartments', units: 24 },
    { id: 'p2', name: 'Maple Street Duplex', units: 2 },
    { id: 'p3', name: 'Cerium Tower (Commercial)', units: 12 },
    { id: 'p4', name: 'Riverside Townhomes', units: 8 },
  ],

  // Recorded expenses. `status` is one of: paid | pending | overdue.
  // `amount` is the total cost. `paid` is how much has been settled so far;
  // any remainder is treated as money owed (a payable).
  expenses: [
    { id: 'e1', date: '2026-05-02', property: 'p1', category: 'Maintenance', vendor: 'BlueLine Plumbing', description: 'Boiler servicing', amount: 4200, paid: 4200, status: 'paid' },
    { id: 'e2', date: '2026-05-08', property: 'p3', category: 'Utilities', vendor: 'Metro Power', description: 'Electricity - May', amount: 6800, paid: 6800, status: 'paid' },
    { id: 'e3', date: '2026-05-12', property: 'p1', category: 'Insurance', vendor: '安全 Insurance Co', description: 'Quarterly premium', amount: 9100, paid: 0, status: 'pending' },
    { id: 'e4', date: '2026-04-20', property: 'p4', category: 'Repairs', vendor: 'Apex Roofing', description: 'Roof leak repair', amount: 5400, paid: 2000, status: 'overdue' },
    { id: 'e5', date: '2026-05-18', property: 'p2', category: 'Landscaping', vendor: 'GreenScape', description: 'Spring grounds work', amount: 1250, paid: 1250, status: 'paid' },
    { id: 'e6', date: '2026-05-21', property: 'p3', category: 'Property Tax', vendor: 'County Assessor', description: 'Q2 property tax', amount: 18500, paid: 0, status: 'pending' },
    { id: 'e7', date: '2026-05-25', property: 'p1', category: 'Utilities', vendor: 'City Water', description: 'Water & sewer - May', amount: 2300, paid: 2300, status: 'paid' },
    { id: 'e8', date: '2026-03-30', property: 'p4', category: 'Maintenance', vendor: 'Comfort HVAC', description: 'AC unit replacement', amount: 7600, paid: 3000, status: 'overdue' },
    { id: 'e9', date: '2026-05-28', property: 'p3', category: 'Cleaning', vendor: 'SparkleCo', description: 'Common area cleaning', amount: 1800, paid: 1800, status: 'paid' },
    { id: 'e10', date: '2026-06-01', property: 'p2', category: 'Management', vendor: 'Internal', description: 'Property management fee', amount: 950, paid: 0, status: 'pending' },
  ],

  // Money owed TO the company (rent / receivables from tenants).
  // `status` is one of: current | due | overdue | paid.
  receivables: [
    { id: 'r1', tenant: 'Northwind Logistics', property: 'p3', description: 'Office lease - June', dueDate: '2026-06-05', amount: 14500, status: 'overdue' },
    { id: 'r2', tenant: 'A. Okafor', property: 'p1', description: 'Unit 12B rent - June', dueDate: '2026-06-01', amount: 2100, status: 'due' },
    { id: 'r3', tenant: 'M. Tanaka', property: 'p1', description: 'Unit 4A rent - June', dueDate: '2026-06-01', amount: 1950, status: 'paid' },
    { id: 'r4', tenant: 'Riverside HOA', property: 'p4', description: 'Shared services - Q2', dueDate: '2026-06-15', amount: 3200, status: 'current' },
    { id: 'r5', tenant: 'Bright Cafe LLC', property: 'p3', description: 'Retail unit - June', dueDate: '2026-06-05', amount: 5600, status: 'due' },
    { id: 'r6', tenant: 'J. Alvarez', property: 'p2', description: 'Duplex unit 2 - June', dueDate: '2026-05-28', amount: 1700, status: 'overdue' },
  ],

  // Capital contributed by owners / investors into the business or a property.
  // `type`: equity | loan | reserve. Equity & reserve are owner capital;
  // loans are owner financing that's expected to be repaid.
  investments: [
    { id: 'i1', date: '2026-01-15', owner: 'B. Cerium', property: 'p1', type: 'equity', amount: 120000, notes: 'Initial acquisition equity' },
    { id: 'i2', date: '2026-02-03', owner: 'R. Frazier', property: 'p3', type: 'equity', amount: 200000, notes: 'Commercial tower stake' },
    { id: 'i3', date: '2026-03-12', owner: 'B. Cerium', property: 'p4', type: 'loan', amount: 45000, notes: 'Bridge loan for renovations' },
    { id: 'i4', date: '2026-04-01', owner: 'Cerium Holdings', property: '', type: 'reserve', amount: 30000, notes: 'Operating reserve top-up' },
    { id: 'i5', date: '2026-05-09', owner: 'R. Frazier', property: 'p2', type: 'equity', amount: 60000, notes: 'Duplex buy-in' },
  ],

  // Forward-looking monthly projections for the fiscal year.
  // Amounts are projected income vs projected expenses.
  projections: [
    { month: '2026-01', income: 58000, expenses: 41000 },
    { month: '2026-02', income: 59500, expenses: 39000 },
    { month: '2026-03', income: 61000, expenses: 47000 },
    { month: '2026-04', income: 60500, expenses: 43500 },
    { month: '2026-05', income: 62000, expenses: 54100 },
    { month: '2026-06', income: 63500, expenses: 46000 },
    { month: '2026-07', income: 64000, expenses: 44000 },
    { month: '2026-08', income: 64500, expenses: 45500 },
    { month: '2026-09', income: 65000, expenses: 48000 },
    { month: '2026-10', income: 66000, expenses: 46500 },
    { month: '2026-11', income: 66500, expenses: 49000 },
    { month: '2026-12', income: 68000, expenses: 52000 },
  ],

  // Upcoming things that need to be fixed / maintenance items.
  // `priority`: high | medium | low. `status`: open | scheduled | in-progress | done.
  tasks: [
    { id: 't1', title: 'Replace lobby elevator cable', property: 'p3', priority: 'high', status: 'scheduled', due: '2026-06-14', estCost: 8500, notes: 'Inspection flagged wear; vendor booked.' },
    { id: 't2', title: 'Fix recurring roof leak', property: 'p4', priority: 'high', status: 'in-progress', due: '2026-06-12', estCost: 5400, notes: 'Partial payment made to Apex Roofing.' },
    { id: 't3', title: 'Repaint exterior trim', property: 'p1', priority: 'low', status: 'open', due: '2026-07-20', estCost: 3200, notes: 'Cosmetic; schedule for summer.' },
    { id: 't4', title: 'Upgrade unit 4A appliances', property: 'p1', priority: 'medium', status: 'open', due: '2026-06-30', estCost: 2800, notes: 'Tenant turnover scheduled.' },
    { id: 't5', title: 'Parking lot resurfacing', property: 'p3', priority: 'medium', status: 'scheduled', due: '2026-06-25', estCost: 12000, notes: 'Three quotes received.' },
    { id: 't6', title: 'Replace HVAC compressor', property: 'p4', priority: 'high', status: 'open', due: '2026-06-09', estCost: 4600, notes: 'Overdue — unit 3 reporting no cooling.' },
  ],
};
