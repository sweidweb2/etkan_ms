export type IncomeStatementAnalyticsPeriodPoint = {
  key: string;
  label: string;
  payments: number;
  credits: number;
  debits: number;
  adjustments: number;
};

export type IncomeStatementAnalyticsNamedValue = {
  name: string;
  value: number;
};

export type ManagerIncomeStatementAnalyticsData = {
  year: number;
  month: number | null;
  availableYears: number[];
  periodSeries: IncomeStatementAnalyticsPeriodPoint[];
  composition: IncomeStatementAnalyticsNamedValue[];
  totals: {
    payments: number;
    credits: number;
    debits: number;
    adjustments: number;
  };
};
