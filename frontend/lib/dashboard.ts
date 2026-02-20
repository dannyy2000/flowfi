import type { WalletId } from "@/lib/wallet";

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  amount: number;
  direction: "sent" | "received";
  timestamp: string;
}

export interface DashboardSnapshot {
  totalSent: number;
  totalReceived: number;
  totalValueLocked: number;
  activeStreams: number;
  recentActivity: ActivityItem[];
}

const MOCK_STATS_BY_WALLET: Record<WalletId, DashboardSnapshot | null> = {
  freighter: {
    totalSent: 12850,
    totalReceived: 4720,
    totalValueLocked: 32140,
    activeStreams: 2,
    recentActivity: [
      {
        id: "act-1",
        title: "Design Retainer",
        description: "Outgoing stream settled",
        amount: 250,
        direction: "sent",
        timestamp: "2026-02-19T13:10:00.000Z",
      },
      {
        id: "act-2",
        title: "Community Grant",
        description: "Incoming stream payout",
        amount: 420,
        direction: "received",
        timestamp: "2026-02-18T17:45:00.000Z",
      },
      {
        id: "act-3",
        title: "Developer Subscription",
        description: "Outgoing recurring payment",
        amount: 85,
        direction: "sent",
        timestamp: "2026-02-18T09:15:00.000Z",
      },
    ],
  },
  albedo: null,
  xbull: {
    totalSent: 2130,
    totalReceived: 3890,
    totalValueLocked: 5400,
    activeStreams: 1,
    recentActivity: [
      {
        id: "act-4",
        title: "Ops Payroll",
        description: "Incoming stream payout",
        amount: 630,
        direction: "received",
        timestamp: "2026-02-19T08:05:00.000Z",
      },
    ],
  },
};

export function getMockDashboardStats(
  walletId: WalletId,
): DashboardSnapshot | null {
  const source = MOCK_STATS_BY_WALLET[walletId];

  if (!source) {
    return null;
  }

  return {
    ...source,
    recentActivity: source.recentActivity.map((activity) => ({ ...activity })),
  };
}
