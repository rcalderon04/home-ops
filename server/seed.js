// Seed the database with data from home_operations_tracker_v2.xlsx
const { getDb } = require('./db');

const TASKS = [
  {
    id: 'T-001', parent_task_id: null, task_name: 'Vacuum main living areas',
    category: 'Weekly Chore', area: 'Living Areas', location_type: 'Interior',
    cadence_type: 'Weekly', cadence_interval: 1, season: 'Any', is_active: 1,
    est_minutes: 45, difficulty: 'Easy', points: 3, default_owner: 'Either',
    tools_needed: 'Vacuum, crevice tool', products_needed: null, safety_notes: null,
    product_record_required: 'No', split_into_subtasks: 'No', target_date: null,
    last_completed: '2026-03-08', next_due_date: '2026-03-15',
    notes: 'Includes rugs and under sofa edges'
  },
  {
    id: 'T-002', parent_task_id: null, task_name: 'Clean primary bathroom',
    category: 'Weekly Chore', area: 'Bathroom', location_type: 'Interior',
    cadence_type: 'Weekly', cadence_interval: 1, season: 'Any', is_active: 1,
    est_minutes: 50, difficulty: 'Medium', points: 4, default_owner: 'Either',
    tools_needed: 'Toilet brush, scrub sponge, microfiber cloths',
    products_needed: 'Bathroom cleaner, glass cleaner', safety_notes: null,
    product_record_required: 'No', split_into_subtasks: 'No', target_date: null,
    last_completed: '2026-03-09', next_due_date: '2026-03-16',
    notes: 'Mirror, sink, toilet, shower surfaces'
  },
  {
    id: 'T-003', parent_task_id: null, task_name: 'Replace HVAC filter',
    category: 'Quarterly Maintenance', area: 'Utility/HVAC', location_type: 'Interior',
    cadence_type: 'Quarterly', cadence_interval: 1, season: 'Any', is_active: 1,
    est_minutes: 15, difficulty: 'Easy', points: 5, default_owner: 'Either',
    tools_needed: 'Step stool', products_needed: 'HVAC filter', safety_notes: null,
    product_record_required: 'Yes', split_into_subtasks: 'No', target_date: null,
    last_completed: '2025-12-15', next_due_date: '2026-03-15',
    notes: 'Log exact filter size and brand in Product Log'
  },
  {
    id: 'T-004', parent_task_id: null, task_name: 'Clean gutters',
    category: 'Quarterly Maintenance', area: 'Roof/Gutters', location_type: 'Exterior',
    cadence_type: 'Quarterly', cadence_interval: 1, season: 'Fall', is_active: 1,
    est_minutes: 90, difficulty: 'Hard', points: 8, default_owner: 'Either',
    tools_needed: 'Ladder, gloves, bucket, scoop', products_needed: null,
    safety_notes: 'Use ladder safety protocol', product_record_required: 'No',
    split_into_subtasks: 'No', target_date: null,
    last_completed: '2025-11-15', next_due_date: '2026-02-15',
    notes: 'Schedule after heavy leaf drop'
  },
  {
    id: 'T-005', parent_task_id: null, task_name: 'Deep clean refrigerator',
    category: 'Deep Clean', area: 'Kitchen', location_type: 'Interior',
    cadence_type: 'Quarterly', cadence_interval: 1, season: 'Any', is_active: 1,
    est_minutes: 75, difficulty: 'Medium', points: 6, default_owner: 'Either',
    tools_needed: 'Cooler, microfiber cloths',
    products_needed: 'Degreaser, baking soda', safety_notes: null,
    product_record_required: 'No', split_into_subtasks: 'Yes', target_date: null,
    last_completed: '2025-12-20', next_due_date: '2026-03-20',
    notes: 'Break into shelves, drawers, seals, and exterior'
  },
  {
    id: 'T-006', parent_task_id: null, task_name: 'Mow and edge lawn',
    category: 'Yard', area: 'Yard/Lawn', location_type: 'Exterior',
    cadence_type: 'Weekly', cadence_interval: 1, season: 'Spring', is_active: 1,
    est_minutes: 60, difficulty: 'Medium', points: 4, default_owner: 'Either',
    tools_needed: 'Mower, edger, leaf blower', products_needed: 'Fuel/battery',
    safety_notes: 'Check for rocks and toys first', product_record_required: 'No',
    split_into_subtasks: 'No', target_date: null,
    last_completed: '2026-03-10', next_due_date: '2026-03-17',
    notes: 'Adjust cadence to biweekly in slower months if desired'
  },
  {
    id: 'T-007', parent_task_id: null, task_name: 'Clean moss on driveway',
    category: 'Project', area: 'Driveway/Walkway', location_type: 'Exterior',
    cadence_type: 'One-off', cadence_interval: 1, season: 'Spring', is_active: 1,
    est_minutes: 180, difficulty: 'Hard', points: 12, default_owner: 'Either',
    tools_needed: 'Push broom, pressure washer, stiff brush',
    products_needed: 'Moss treatment', safety_notes: 'Surface can be slippery',
    product_record_required: 'Yes', split_into_subtasks: 'Yes',
    target_date: '2026-04-05', last_completed: null, next_due_date: '2026-04-05',
    notes: 'Example custom task'
  },
  {
    id: 'T-008', parent_task_id: null, task_name: 'Wash exterior windows',
    category: 'Deep Clean', area: 'Windows', location_type: 'Exterior',
    cadence_type: 'Biweekly', cadence_interval: 6, season: 'Spring', is_active: 1,
    est_minutes: 120, difficulty: 'Medium', points: 7, default_owner: 'Either',
    tools_needed: 'Squeegee, extension pole, bucket',
    products_needed: 'Window cleaner', safety_notes: 'Avoid windy conditions',
    product_record_required: 'No', split_into_subtasks: 'No', target_date: null,
    last_completed: '2025-10-05', next_due_date: '2025-12-28',
    notes: 'Ideal in spring and early fall'
  },
  {
    id: 'T-009', parent_task_id: null, task_name: 'Test smoke and CO alarms',
    category: 'Yearly Maintenance', area: 'Safety', location_type: 'Interior',
    cadence_type: 'Yearly', cadence_interval: 1, season: 'Fall', is_active: 1,
    est_minutes: 20, difficulty: 'Easy', points: 5, default_owner: 'Either',
    tools_needed: 'Step stool', products_needed: '9V batteries',
    safety_notes: 'Record battery dates', product_record_required: 'Yes',
    split_into_subtasks: 'No', target_date: null,
    last_completed: '2025-09-20', next_due_date: '2026-09-20',
    notes: 'Replace batteries if needed'
  },
  {
    id: 'T-010', parent_task_id: null, task_name: 'Clean dryer vent and lint duct',
    category: 'Yearly Maintenance', area: 'Laundry', location_type: 'Interior',
    cadence_type: 'Yearly', cadence_interval: 1, season: 'Winter', is_active: 1,
    est_minutes: 45, difficulty: 'Medium', points: 7, default_owner: 'Either',
    tools_needed: 'Dryer vent brush, vacuum', products_needed: null,
    safety_notes: 'Unplug dryer before service', product_record_required: 'No',
    split_into_subtasks: 'No', target_date: null,
    last_completed: '2025-01-15', next_due_date: '2026-01-15',
    notes: 'Important fire safety item'
  },
  {
    id: 'T-011', parent_task_id: null, task_name: 'Pressure wash patio',
    category: 'Project', area: 'Patio/Deck', location_type: 'Exterior',
    cadence_type: 'One-off', cadence_interval: 1, season: 'Summer', is_active: 1,
    est_minutes: 150, difficulty: 'Medium', points: 10, default_owner: 'Either',
    tools_needed: 'Pressure washer, broom',
    products_needed: 'Concrete or deck cleaner', safety_notes: 'Test small area first',
    product_record_required: 'No', split_into_subtasks: 'Yes',
    target_date: '2026-06-15', last_completed: null, next_due_date: '2026-06-15',
    notes: 'Can be split by zone'
  },
  {
    id: 'T-012', parent_task_id: null, task_name: 'Fertilize and seed lawn',
    category: 'Yard', area: 'Yard/Lawn', location_type: 'Exterior',
    cadence_type: 'Quarterly', cadence_interval: 1, season: 'Spring', is_active: 1,
    est_minutes: 45, difficulty: 'Medium', points: 6, default_owner: 'Either',
    tools_needed: 'Spreader', products_needed: 'Fertilizer, grass seed',
    safety_notes: 'Follow pet/kid reentry times', product_record_required: 'Yes',
    split_into_subtasks: 'No', target_date: null,
    last_completed: '2025-10-01', next_due_date: '2026-01-01',
    notes: 'Use region-appropriate blend'
  },
  {
    id: 'T-013', parent_task_id: null, task_name: 'Clean kitchen vent hood and filter',
    category: 'Monthly Chore', area: 'Kitchen', location_type: 'Interior',
    cadence_type: 'Monthly', cadence_interval: 1, season: 'Any', is_active: 1,
    est_minutes: 25, difficulty: 'Easy', points: 3, default_owner: 'Either',
    tools_needed: 'Microfiber cloths', products_needed: 'Degreaser',
    safety_notes: null, product_record_required: 'No', split_into_subtasks: 'No',
    target_date: null,
    last_completed: '2026-02-20', next_due_date: '2026-03-20',
    notes: 'Soak baffle filters if metal'
  },
  {
    id: 'T-014', parent_task_id: null, task_name: 'Wipe baseboards in main floor',
    category: 'Deep Clean', area: 'Living Areas', location_type: 'Interior',
    cadence_type: 'Quarterly', cadence_interval: 1, season: 'Any', is_active: 1,
    est_minutes: 60, difficulty: 'Medium', points: 5, default_owner: 'Either',
    tools_needed: 'Microfiber duster, kneeling pad',
    products_needed: 'All-purpose cleaner', safety_notes: null,
    product_record_required: 'No', split_into_subtasks: 'Yes', target_date: null,
    last_completed: '2025-12-01', next_due_date: '2026-03-01',
    notes: 'Split by room if needed'
  },
  {
    id: 'T-015', parent_task_id: null, task_name: 'Winterize exterior hose bibs',
    category: 'Yearly Maintenance', area: 'Plumbing', location_type: 'Exterior',
    cadence_type: 'Yearly', cadence_interval: 1, season: 'Fall', is_active: 1,
    est_minutes: 30, difficulty: 'Easy', points: 6, default_owner: 'Either',
    tools_needed: 'Hose bib covers', products_needed: 'Insulated covers',
    safety_notes: 'Shut off and drain lines if applicable',
    product_record_required: 'Yes', split_into_subtasks: 'No', target_date: null,
    last_completed: '2025-10-25', next_due_date: '2026-10-25',
    notes: 'Prevent freeze damage'
  },
  {
    id: 'T-016', parent_task_id: null, task_name: 'Clean dishwasher filter and spray arms',
    category: 'Monthly Chore', area: 'Kitchen', location_type: 'Interior',
    cadence_type: 'Monthly', cadence_interval: 1, season: 'Any', is_active: 1,
    est_minutes: 20, difficulty: 'Easy', points: 3, default_owner: 'Either',
    tools_needed: 'Small brush', products_needed: 'Dish soap, vinegar',
    safety_notes: null, product_record_required: 'No', split_into_subtasks: 'No',
    target_date: null,
    last_completed: '2026-02-28', next_due_date: '2026-03-28',
    notes: 'Good monthly reset'
  },
  {
    id: 'T-017', parent_task_id: null, task_name: 'Trim front hedge',
    category: 'Yard', area: 'Front Yard', location_type: 'Exterior',
    cadence_type: 'Monthly', cadence_interval: 1, season: 'Spring', is_active: 1,
    est_minutes: 35, difficulty: 'Medium', points: 4, default_owner: 'Either',
    tools_needed: 'Hedge trimmer, tarp', products_needed: 'Blade oil',
    safety_notes: 'Wear eye protection', product_record_required: 'No',
    split_into_subtasks: 'No', target_date: null,
    last_completed: '2026-02-15', next_due_date: '2026-03-15',
    notes: 'Avoid nesting season where relevant'
  },
  {
    id: 'T-018', parent_task_id: null, task_name: 'Inspect caulking at showers and tub',
    category: 'Quarterly Maintenance', area: 'Bathroom', location_type: 'Interior',
    cadence_type: 'Quarterly', cadence_interval: 1, season: 'Winter', is_active: 1,
    est_minutes: 20, difficulty: 'Easy', points: 4, default_owner: 'Either',
    tools_needed: 'Flashlight', products_needed: 'Caulk touch-up as needed',
    safety_notes: null, product_record_required: 'No', split_into_subtasks: 'No',
    target_date: null,
    last_completed: '2025-12-30', next_due_date: '2026-03-30',
    notes: 'Prevent leaks and mold'
  }
];

const SUBTASKS = [
  // T-007: Clean moss on driveway
  { id: 'ST-001', project_id: 'P-001', parent_task_id: 'T-007', subtask_name: 'Inspect driveway and measure moss areas', sequence: 1, est_minutes: 20, owner: 'Either', status: 'Done', due_date: '2026-03-15', completed_date: '2026-03-15', tools: 'Tape measure, phone', products: null, notes: null },
  { id: 'ST-002', project_id: 'P-001', parent_task_id: 'T-007', subtask_name: 'Sweep debris and pull weeds from cracks', sequence: 2, est_minutes: 30, owner: 'Either', status: 'Not Started', due_date: '2026-03-20', completed_date: null, tools: 'Push broom, weeding tool', products: null, notes: null },
  { id: 'ST-003', project_id: 'P-001', parent_task_id: 'T-007', subtask_name: 'Apply moss treatment and wait dwell time', sequence: 3, est_minutes: 25, owner: 'Either', status: 'Not Started', due_date: '2026-03-27', completed_date: null, tools: 'Pump sprayer', products: 'Moss treatment', notes: null },
  { id: 'ST-004', project_id: 'P-001', parent_task_id: 'T-007', subtask_name: 'Pressure wash in two driveway zones', sequence: 4, est_minutes: 75, owner: 'Either', status: 'Not Started', due_date: '2026-04-03', completed_date: null, tools: 'Pressure washer', products: null, notes: null },
  { id: 'ST-005', project_id: 'P-001', parent_task_id: 'T-007', subtask_name: 'Final rinse and log products/results', sequence: 5, est_minutes: 30, owner: 'Either', status: 'Not Started', due_date: '2026-04-05', completed_date: null, tools: 'Hose', products: 'Moss treatment', notes: null },
  // T-005: Deep clean refrigerator
  { id: 'ST-006', project_id: 'P-002', parent_task_id: 'T-005', subtask_name: 'Empty fridge and sort contents', sequence: 1, est_minutes: 15, owner: 'Either', status: 'Not Started', due_date: null, completed_date: null, tools: 'Cooler', products: null, notes: null },
  { id: 'ST-007', project_id: 'P-002', parent_task_id: 'T-005', subtask_name: 'Clean shelves, drawers, seals', sequence: 2, est_minutes: 35, owner: 'Either', status: 'Not Started', due_date: null, completed_date: null, tools: 'Microfiber cloths', products: 'Degreaser, baking soda', notes: null },
  { id: 'ST-008', project_id: 'P-002', parent_task_id: 'T-005', subtask_name: 'Wipe exterior and restock by zone', sequence: 3, est_minutes: 25, owner: 'Either', status: 'Not Started', due_date: null, completed_date: null, tools: 'Microfiber cloths', products: null, notes: null }
];

const REWARD_RULES = [
  { id: 'R-001', reward_level: 'Bronze', min_points: 0,  max_points: 24,  reward: 'Choose takeout night',                 cadence: 'Weekly',  shared_or_individual: 'Shared',  notes: 'Easy starter reward',         is_active: 1 },
  { id: 'R-002', reward_level: 'Silver', min_points: 25, max_points: 49,  reward: 'Movie night or dessert outing',        cadence: 'Weekly',  shared_or_individual: 'Shared',  notes: 'Good weekly stretch goal',    is_active: 1 },
  { id: 'R-003', reward_level: 'Gold',   min_points: 50, max_points: 74,  reward: 'Date night or hobby budget',           cadence: 'Monthly', shared_or_individual: 'Shared',  notes: 'Celebrates consistency',      is_active: 1 },
  { id: 'R-004', reward_level: 'Platinum', min_points: 75, max_points: 999, reward: 'Skip-one-chore coupon or house splurge', cadence: 'Monthly', shared_or_individual: 'Shared', notes: 'Capstone reward',           is_active: 1 },
];

// Richer activity history so the dashboard has data to visualize
const ACTIVITY_LOG = [
  { id: 'L-001', log_date: '2026-03-15', task_id: 'T-007', plan_item_id: null,    project_id: 'P-001', action: 'Completed subtask', minutes_spent: 20, points: 1,  owner: 'Ryan',    products_used: null,                      outcome: 'Measured and photographed areas',  notes: null },
  { id: 'L-002', log_date: '2026-03-09', task_id: 'T-002', plan_item_id: 'WP-099', project_id: null,   action: 'Completed task',    minutes_spent: 55, points: 4,  owner: 'Bayley', products_used: 'Bathroom cleaner; glass cleaner', outcome: 'Main bathroom reset',         notes: null },
  { id: 'L-003', log_date: '2026-03-15', task_id: 'T-016', plan_item_id: 'WP-006', project_id: null,   action: 'Completed task',    minutes_spent: 20, points: 3,  owner: 'Bayley', products_used: 'Dish soap; vinegar',       outcome: 'Filter and spray arms cleaned',     notes: null },
  { id: 'L-004', log_date: '2026-03-08', task_id: 'T-001', plan_item_id: 'WP-095', project_id: null,   action: 'Completed task',    minutes_spent: 40, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: 'Living room and hallway',          notes: null },
  // Feb 2026
  { id: 'L-005', log_date: '2026-02-28', task_id: 'T-016', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 20, points: 3,  owner: 'Bayley', products_used: 'Dish soap',               outcome: null,                               notes: null },
  { id: 'L-006', log_date: '2026-02-24', task_id: 'T-001', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 45, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: null,                               notes: null },
  { id: 'L-007', log_date: '2026-02-23', task_id: 'T-002', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 50, points: 4,  owner: 'Bayley', products_used: 'Bathroom cleaner',        outcome: null,                               notes: null },
  { id: 'L-008', log_date: '2026-02-20', task_id: 'T-013', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 25, points: 3,  owner: 'Either',  products_used: 'Degreaser',               outcome: null,                               notes: null },
  { id: 'L-009', log_date: '2026-02-17', task_id: 'T-006', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 60, points: 4,  owner: 'Ryan',    products_used: 'Fuel',                    outcome: null,                               notes: null },
  { id: 'L-010', log_date: '2026-02-15', task_id: 'T-017', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 35, points: 4,  owner: 'Bayley', products_used: 'Blade oil',               outcome: null,                               notes: null },
  { id: 'L-011', log_date: '2026-02-10', task_id: 'T-001', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 45, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: null,                               notes: null },
  { id: 'L-012', log_date: '2026-02-09', task_id: 'T-002', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 50, points: 4,  owner: 'Bayley', products_used: 'Bathroom cleaner',        outcome: null,                               notes: null },
  { id: 'L-013', log_date: '2026-02-03', task_id: 'T-001', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 40, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: null,                               notes: null },
  { id: 'L-014', log_date: '2026-02-02', task_id: 'T-002', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 55, points: 4,  owner: 'Bayley', products_used: 'Bathroom cleaner',        outcome: null,                               notes: null },
  // Jan 2026
  { id: 'L-015', log_date: '2026-01-27', task_id: 'T-001', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 45, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: null,                               notes: null },
  { id: 'L-016', log_date: '2026-01-26', task_id: 'T-002', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 50, points: 4,  owner: 'Bayley', products_used: 'Bathroom cleaner',        outcome: null,                               notes: null },
  { id: 'L-017', log_date: '2026-01-20', task_id: 'T-013', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 25, points: 3,  owner: 'Either',  products_used: 'Degreaser',               outcome: null,                               notes: null },
  { id: 'L-018', log_date: '2026-01-15', task_id: 'T-003', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 15, points: 5,  owner: 'Ryan',    products_used: 'HVAC filter',             outcome: null,                               notes: null },
  { id: 'L-019', log_date: '2026-01-15', task_id: 'T-010', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 45, points: 7,  owner: 'Ryan',    products_used: null,                      outcome: 'Vent cleaned',                     notes: null },
  { id: 'L-020', log_date: '2026-01-14', task_id: 'T-014', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 60, points: 5,  owner: 'Bayley', products_used: 'All-purpose cleaner',     outcome: null,                               notes: null },
  { id: 'L-021', log_date: '2026-01-06', task_id: 'T-001', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 45, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: null,                               notes: null },
  // Dec 2025
  { id: 'L-022', log_date: '2025-12-22', task_id: 'T-005', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 75, points: 6,  owner: 'Bayley', products_used: 'Degreaser, baking soda',  outcome: null,                               notes: null },
  { id: 'L-023', log_date: '2025-12-15', task_id: 'T-003', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 15, points: 5,  owner: 'Ryan',    products_used: 'HVAC filter',             outcome: null,                               notes: null },
  { id: 'L-024', log_date: '2025-12-08', task_id: 'T-001', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 40, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: null,                               notes: null },
  { id: 'L-025', log_date: '2025-12-07', task_id: 'T-002', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 50, points: 4,  owner: 'Bayley', products_used: 'Bathroom cleaner',        outcome: null,                               notes: null },
  { id: 'L-026', log_date: '2025-12-01', task_id: 'T-014', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 60, points: 5,  owner: 'Either',  products_used: 'All-purpose cleaner',     outcome: null,                               notes: null },
  // Nov 2025
  { id: 'L-027', log_date: '2025-11-18', task_id: 'T-001', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 45, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: null,                               notes: null },
  { id: 'L-028', log_date: '2025-11-15', task_id: 'T-004', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 90, points: 8,  owner: 'Ryan',    products_used: null,                      outcome: 'Gutters cleared',                  notes: null },
  { id: 'L-029', log_date: '2025-11-10', task_id: 'T-002', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 50, points: 4,  owner: 'Bayley', products_used: 'Bathroom cleaner',        outcome: null,                               notes: null },
  { id: 'L-030', log_date: '2025-11-03', task_id: 'T-001', plan_item_id: null,    project_id: null,   action: 'Completed task',    minutes_spent: 40, points: 3,  owner: 'Ryan',    products_used: null,                      outcome: null,                               notes: null },
];

const WEEKLY_PLAN_ITEMS = [
  { id: 'WP-001', week_start: '2026-03-16', task_id: 'T-013', task_name: 'Clean kitchen vent hood and filter', category: 'Monthly Chore', est_minutes: 25, owner: 'Either', planned_day: 'Mon', status: 'Not Started', actual_date: null, points_earned: 3, notes: 'Monthly kitchen reset', sort_order: 1 },
  { id: 'WP-002', week_start: '2026-03-16', task_id: 'T-001', task_name: 'Vacuum main living areas', category: 'Weekly Chore', est_minutes: 45, owner: 'Ryan', planned_day: 'Tue', status: 'Not Started', actual_date: null, points_earned: 3, notes: null, sort_order: 2 },
  { id: 'WP-003', week_start: '2026-03-16', task_id: 'T-002', task_name: 'Clean primary bathroom', category: 'Weekly Chore', est_minutes: 50, owner: 'Bayley', planned_day: 'Wed', status: 'Not Started', actual_date: null, points_earned: 4, notes: null, sort_order: 3 },
  { id: 'WP-004', week_start: '2026-03-16', task_id: 'T-003', task_name: 'Replace HVAC filter', category: 'Quarterly Maintenance', est_minutes: 15, owner: 'Either', planned_day: 'Thu', status: 'Not Started', actual_date: null, points_earned: 5, notes: 'Filter swap before allergy season', sort_order: 4 },
  { id: 'WP-005', week_start: '2026-03-16', task_id: 'T-007', task_name: 'Clean moss on driveway', category: 'Project', est_minutes: 180, owner: 'Ryan', planned_day: 'Sat', status: 'In Progress', actual_date: null, points_earned: 12, notes: 'Subtasks tracked separately', sort_order: 5 },
  { id: 'WP-006', week_start: '2026-03-16', task_id: 'T-016', task_name: 'Clean dishwasher filter and spray arms', category: 'Monthly Chore', est_minutes: 20, owner: 'Bayley', planned_day: 'Sun', status: 'Completed', actual_date: '2026-03-15', points_earned: 3, notes: null, sort_order: 6 }
];

function seed() {
  const db = getDb();

  const taskCount = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
  if (taskCount > 0) {
    console.log('Database already seeded. Skipping.');
    return;
  }

  const insertTask = db.prepare(`
    INSERT INTO tasks (id, parent_task_id, task_name, category, area, location_type,
      cadence_type, cadence_interval, season, is_active, est_minutes, difficulty,
      points, default_owner, tools_needed, products_needed, safety_notes,
      product_record_required, split_into_subtasks, target_date, last_completed,
      next_due_date, notes)
    VALUES (@id, @parent_task_id, @task_name, @category, @area, @location_type,
      @cadence_type, @cadence_interval, @season, @is_active, @est_minutes, @difficulty,
      @points, @default_owner, @tools_needed, @products_needed, @safety_notes,
      @product_record_required, @split_into_subtasks, @target_date, @last_completed,
      @next_due_date, @notes)
  `);

  const insertSubtask = db.prepare(`
    INSERT INTO subtasks (id, project_id, parent_task_id, subtask_name, sequence,
      est_minutes, owner, status, due_date, completed_date, tools, products, notes)
    VALUES (@id, @project_id, @parent_task_id, @subtask_name, @sequence,
      @est_minutes, @owner, @status, @due_date, @completed_date, @tools, @products, @notes)
  `);

  const insertWeekly = db.prepare(`
    INSERT INTO weekly_plan_items (id, week_start, task_id, task_name, category,
      est_minutes, owner, planned_day, status, actual_date, points_earned, notes, sort_order)
    VALUES (@id, @week_start, @task_id, @task_name, @category,
      @est_minutes, @owner, @planned_day, @status, @actual_date, @points_earned, @notes, @sort_order)
  `);

  const insertRewardRule = db.prepare(`
    INSERT INTO reward_rules (id, reward_level, min_points, max_points, reward, cadence, shared_or_individual, notes, is_active)
    VALUES (@id, @reward_level, @min_points, @max_points, @reward, @cadence, @shared_or_individual, @notes, @is_active)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO activity_log (id, log_date, task_id, plan_item_id, project_id, action, minutes_spent, points, owner, products_used, outcome, notes)
    VALUES (@id, @log_date, @task_id, @plan_item_id, @project_id, @action, @minutes_spent, @points, @owner, @products_used, @outcome, @notes)
  `);

  const seedAll = db.transaction(() => {
    for (const task of TASKS) insertTask.run(task);
    for (const sub of SUBTASKS) insertSubtask.run(sub);
    for (const wp of WEEKLY_PLAN_ITEMS) insertWeekly.run(wp);
    for (const r of REWARD_RULES) insertRewardRule.run(r);
    for (const a of ACTIVITY_LOG) insertActivity.run(a);
  });

  seedAll();
  console.log(`✅ Seeded ${TASKS.length} tasks, ${SUBTASKS.length} subtasks, ${WEEKLY_PLAN_ITEMS.length} weekly items, ${REWARD_RULES.length} reward rules, ${ACTIVITY_LOG.length} activity logs.`);
}

module.exports = { seed };

if (require.main === module) {
  seed();
}
