"use client";

import React from "react";
import toast from "react-hot-toast";

import {
  getMockDashboardStats,
  type DashboardSnapshot,
  type Stream,
} from "@/lib/dashboard";
import { shortenPublicKey, type WalletSession } from "@/lib/wallet";
import {
  createStream as sorobanCreateStream,
  topUpStream as sorobanTopUp,
  cancelStream as sorobanCancel,
  toBaseUnits,
  toDurationSeconds,
  getTokenAddress,
  toSorobanErrorMessage,
} from "@/lib/soroban";

import IncomingStreams from "../IncomingStreams";
import {
  StreamCreationWizard,
  type StreamFormData,
} from "../stream-creation/StreamCreationWizard";
import { TopUpModal } from "../stream-creation/TopUpModal";
import { CancelConfirmModal } from "../stream-creation/CancelConfirmModal";
import { Button } from "../ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardViewProps {
  session: WalletSession;
  onDisconnect: () => void;
}

interface SidebarItem {
  id: string;
  label: string;
}

// Modal state: null = closed
type ModalState =
  | null
  | { type: "topup"; stream: Stream }
  | { type: "cancel"; stream: Stream };

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "overview", label: "Overview" },
  { id: "incoming", label: "Incoming" },
  { id: "streams", label: "Outgoing" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "activity", label: "Activity" },
  { id: "settings", label: "Settings" },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatActivityTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

// ─── Sub-renders ──────────────────────────────────────────────────────────────

function renderStats(snapshot: DashboardSnapshot) {
  const items = [
    {
      id: "total-sent",
      label: "Total Sent",
      value: formatCurrency(snapshot.totalSent),
      detail: "Lifetime outgoing amount",
    },
    {
      id: "total-received",
      label: "Total Received",
      value: formatCurrency(snapshot.totalReceived),
      detail: "Lifetime incoming amount",
    },
    {
      id: "tvl",
      label: "Total Value Locked",
      value: formatCurrency(snapshot.totalValueLocked),
      detail: "Funds currently locked in streams",
    },
    {
      id: "active-streams",
      label: "Active Streams",
      value: String(snapshot.activeStreamsCount),
      detail: "Streams currently live",
    },
  ] as const;

  return (
    <section className="dashboard-stats-grid" aria-label="Wallet stats">
      {items.map((item) => (
        <article key={item.id} className="dashboard-stat-card">
          <p>{item.label}</p>
          <h2>{item.value}</h2>
          <span>{item.detail}</span>
        </article>
      ))}
    </section>
  );
}

function renderRecentActivity(snapshot: DashboardSnapshot) {
  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel__header">
        <h3>Recent Activity</h3>
        <span>{snapshot.recentActivity.length} items</span>
      </div>

      {snapshot.recentActivity.length > 0 ? (
        <ul className="activity-list">
          {snapshot.recentActivity.map((activity) => {
            const amountPrefix = activity.direction === "received" ? "+" : "-";
            const amountClass =
              activity.direction === "received" ? "is-positive" : "is-negative";

            return (
              <li key={activity.id} className="activity-item">
                <div>
                  <strong>{activity.title}</strong>
                  <p>{activity.description}</p>
                  <small>{formatActivityTime(activity.timestamp)}</small>
                </div>
                <span className={amountClass}>
                  {amountPrefix}
                  {formatCurrency(activity.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mini-empty-state">
          <p>No recent activity yet.</p>
        </div>
      )}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardView({ session, onDisconnect }: DashboardViewProps) {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [showWizard, setShowWizard] = React.useState(false);
  const [modal, setModal] = React.useState<ModalState>(null);

  // In real usage this would be fetched from the chain.
  // For now we keep the mock and add local state so UI updates optimistically.
  const [snapshot, setSnapshot] = React.useState<DashboardSnapshot | null>(
    () => getMockDashboardStats(session.walletId),
  );

  // ── Optimistic helpers ──────────────────────────────────────────────────────

  /** Mark a stream as cancelled in local state. */
  const removeStreamLocally = (streamId: string) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        streams: prev.streams.map((s) =>
          s.id === streamId ? { ...s, status: "Cancelled" as const } : s,
        ),
        activeStreamsCount: Math.max(0, prev.activeStreamsCount - 1),
      };
    });
  };

  /** Add top-up amount to a stream in local state. */
  const topUpStreamLocally = (streamId: string, amount: number) => {
    setSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        streams: prev.streams.map((s) =>
          s.id === streamId
            ? { ...s, deposited: s.deposited + amount }
            : s,
        ),
      };
    });
  };

  /** Prepend a new stream to local state after creation. */
  const addStreamLocally = (data: StreamFormData) => {
    const newStream: Stream = {
      id: `stream-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      recipient: shortenPublicKey(data.recipient),
      amount: parseFloat(data.amount),
      token: data.token,
      status: "Active",
      deposited: parseFloat(data.amount),
      withdrawn: 0,
    };
    setSnapshot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        streams: [newStream, ...prev.streams],
        activeStreamsCount: prev.activeStreamsCount + 1,
      };
    });
  };

  // ── Contract handlers ───────────────────────────────────────────────────────

  const handleCreateStream = async (data: StreamFormData) => {
    const toastId = toast.loading("Creating stream…");
    try {
      const durationSecs = toDurationSeconds(data.duration, data.durationUnit);
      const amount = toBaseUnits(data.amount);
      const tokenAddress = getTokenAddress(data.token);

      await sorobanCreateStream(session, {
        recipient: data.recipient,
        tokenAddress,
        amount,
        durationSeconds: durationSecs,
      });

      addStreamLocally(data);
      setShowWizard(false);
      toast.success("Stream created successfully!", { id: toastId });
    } catch (err) {
      toast.error(toSorobanErrorMessage(err), { id: toastId });
      // Re-throw so the wizard's isSubmitting state resets properly
      throw err;
    }
  };

  const handleTopUpConfirm = async (streamId: string, amountStr: string) => {
    const toastId = toast.loading("Topping up stream…");
    try {
      const amount = toBaseUnits(amountStr);
      await sorobanTopUp(session, {
        streamId: BigInt(streamId.replace(/\D/g, "") || "0"),
        amount,
      });

      topUpStreamLocally(streamId, parseFloat(amountStr));
      setModal(null);
      toast.success("Stream topped up successfully!", { id: toastId });
    } catch (err) {
      toast.error(toSorobanErrorMessage(err), { id: toastId });
      throw err;
    }
  };

  const handleCancelConfirm = async (streamId: string) => {
    const toastId = toast.loading("Cancelling stream…");
    try {
      await sorobanCancel(session, {
        streamId: BigInt(streamId.replace(/\D/g, "") || "0"),
      });

      removeStreamLocally(streamId);
      setModal(null);
      toast.success("Stream cancelled.", { id: toastId });
    } catch (err) {
      toast.error(toSorobanErrorMessage(err), { id: toastId });
      throw err;
    }
  };

  // ── Streams table ───────────────────────────────────────────────────────────

  function renderStreams(snap: DashboardSnapshot) {
    const activeStreams = snap.streams.filter((s) => s.status === "Active");

    return (
      <section className="dashboard-panel">
        <div className="dashboard-panel__header">
          <h3>My Active Streams</h3>
          <span>{activeStreams.length} active</span>
        </div>

        {activeStreams.length === 0 ? (
          <div className="mini-empty-state">
            <p>No active streams. Create one to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Recipient</th>
                  <th>Deposited</th>
                  <th>Withdrawn</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeStreams.map((stream) => (
                  <tr key={stream.id}>
                    <td>{stream.date}</td>
                    <td>
                      <code className="text-xs">{stream.recipient}</code>
                    </td>
                    <td className="font-semibold text-accent">
                      {stream.deposited} {stream.token}
                    </td>
                    <td className="text-slate-400">
                      {stream.withdrawn} {stream.token}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Top Up */}
                        <button
                          type="button"
                          className="secondary-button py-1 px-3 text-sm h-auto"
                          onClick={() => setModal({ type: "topup", stream })}
                        >
                          Add Funds
                        </button>

                        {/* Cancel */}
                        <button
                          type="button"
                          className="py-1 px-3 text-sm rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors font-semibold"
                          onClick={() => setModal({ type: "cancel", stream })}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  // ── Tab content ─────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (activeTab === "incoming") {
      return <div className="mt-8"><IncomingStreams /></div>;
    }

    if (activeTab === "overview") {
      if (!snapshot) {
        return (
          <section className="dashboard-empty-state">
            <h2>No stream data yet</h2>
            <p>
              Your account is connected, but there are no active or historical
              stream records available yet.
            </p>
            <ul>
              <li>Create your first payment stream</li>
              <li>Invite a recipient to start receiving funds</li>
              <li>Check back once transactions are confirmed</li>
            </ul>
            <div className="mt-6">
              <Button onClick={() => setShowWizard(true)} glow>
                Create Your First Stream
              </Button>
            </div>
          </section>
        );
      }

      return (
        <div className="dashboard-content-stack mt-8">
          {renderStats(snapshot)}
          {renderStreams(snapshot)}
          {renderRecentActivity(snapshot)}
        </div>
      );
    }

    return (
      <div className="dashboard-empty-state mt-8">
        <h2>Under Construction</h2>
        <p>This tab is currently under development.</p>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand">FlowFi</div>
        <nav aria-label="Sidebar">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="sidebar-item"
              data-active={activeTab === item.id ? "true" : undefined}
              aria-current={activeTab === item.id ? "page" : undefined}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="kicker">Dashboard</p>
            <h1>{SIDEBAR_ITEMS.find((item) => item.id === activeTab)?.label}</h1>
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={() => setShowWizard(true)} glow>
              Create Stream
            </Button>
            <div className="wallet-chip">
              <span>{session.walletName}</span>
              <strong>{shortenPublicKey(session.publicKey)}</strong>
            </div>
          </div>
        </header>

        {session.mocked ? (
          <p className="dashboard-note">
            Mocked wallet session active — contract calls are simulated.
          </p>
        ) : null}

        {renderContent()}

        <div className="dashboard-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onDisconnect}
          >
            Disconnect Wallet
          </button>
        </div>
      </section>

      {/* Create Stream Wizard */}
      {showWizard && (
        <StreamCreationWizard
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreateStream}
        />
      )}

      {/* Top Up Modal */}
      {modal?.type === "topup" && (
        <TopUpModal
          streamId={modal.stream.id}
          token={modal.stream.token}
          currentDeposited={modal.stream.deposited}
          onConfirm={handleTopUpConfirm}
          onClose={() => setModal(null)}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {modal?.type === "cancel" && (
        <CancelConfirmModal
          streamId={modal.stream.id}
          recipient={modal.stream.recipient}
          token={modal.stream.token}
          deposited={modal.stream.deposited}
          withdrawn={modal.stream.withdrawn}
          onConfirm={handleCancelConfirm}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
