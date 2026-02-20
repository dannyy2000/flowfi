"use client";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { useWallet } from "@/context/wallet-context";

export function WalletEntry() {
  const {
    wallets,
    status,
    session,
    selectedWalletId,
    errorMessage,
    isHydrated,
    connect,
    disconnect,
    clearError,
  } = useWallet();

  if (!isHydrated) {
    return (
      <main className="app-shell">
        <section className="wallet-panel wallet-panel--loading">
          <div className="loading-pulse" />
          <h1>Loading wallet session...</h1>
          <p className="subtitle">
            Checking your previous connection before loading FlowFi.
          </p>
        </section>
      </main>
    );
  }

  if (status === "connected" && session) {
    return <DashboardView session={session} onDisconnect={disconnect} />;
  }

  const isConnecting = status === "connecting";

  return (
    <main className="app-shell">
      <section className="wallet-panel">
        <p className="kicker">FlowFi Entry</p>
        <h1>Select a wallet to continue</h1>
        <p className="subtitle">
          Choose your preferred wallet provider. The connection session is
          stored locally so you stay signed in after refresh.
        </p>

        {errorMessage ? (
          <div className="wallet-error" role="alert">
            <span>{errorMessage}</span>
            <button type="button" className="inline-link" onClick={clearError}>
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="wallet-grid">
          {wallets.map((wallet, index) => {
            const isActiveWallet = selectedWalletId === wallet.id;
            const isConnectingThisWallet = isConnecting && isActiveWallet;

            return (
              <article
                key={wallet.id}
                className="wallet-card"
                data-active={isActiveWallet ? "true" : undefined}
                style={{ animationDelay: `${index * 110}ms` }}
              >
                <header className="wallet-card__header">
                  <h2>{wallet.name}</h2>
                  <span>{wallet.badge}</span>
                </header>
                <p>{wallet.description}</p>
                <button
                  type="button"
                  className="wallet-button"
                  disabled={isConnecting}
                  onClick={() => void connect(wallet.id)}
                >
                  {isConnectingThisWallet
                    ? "Connecting..."
                    : `Connect ${wallet.name}`}
                </button>
              </article>
            );
          })}
        </div>

        <p className="wallet-status" data-busy={isConnecting ? "true" : undefined}>
          {isConnecting
            ? "Awaiting wallet approval..."
            : "Supported wallets: Freighter, Albedo, xBull."}
        </p>
      </section>
    </main>
  );
}
