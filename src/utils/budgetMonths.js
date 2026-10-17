import * as c from './calc.js'
import { CURRENT_MONTH } from './dates.js'
// Months offered in the budget pickers: every month with data or a budget, this month and next month.
export const budgetMonths = (txs, budgets) => c.allMonths(txs, [...budgets.map((b) => b.month), CURRENT_MONTH, c.shiftMonth(CURRENT_MONTH, 1)])
