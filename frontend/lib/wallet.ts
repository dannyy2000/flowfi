export type WalletId = "freighter" | "albedo" | "xbull";

export interface WalletDescriptor {
  id: WalletId;
  name: string;
  badge: string;
  description: string;
}

export interface WalletSession {
  walletId: WalletId;
  walletName: string;
  publicKey: string;
  connectedAt: string;
  network: string;
  mocked: boolean;
}

interface FreighterApi {
  getPublicKey: () => Promise<string>;
  setAllowed?: () => Promise<void>;
  getNetwork?: () => Promise<string | { network: string }>;
}

declare global {
  interface Window {
    freighterApi?: FreighterApi;
  }
}

const DEFAULT_NETWORK = "Stellar Testnet";
const CONNECT_DELAY_MS = 1050;

const MOCK_PUBLIC_KEYS: Record<WalletId, string> = {
  freighter: "GCFLOWFIFREIGHTERMOCKPUBKEY9Q6YB6PW46O67Q3N",
  albedo: "GCFLOWFIALBEDOMOCKPUBKEYYPP7RBJ5QCY5NG4DNCDG",
  xbull: "GCFLOWFIXBULLMOCKPUBKEY2QXH4N4R6NDT2Z3QF6W7",
};

export const SUPPORTED_WALLETS: readonly WalletDescriptor[] = [
  {
    id: "freighter",
    name: "Freighter",
    badge: "Extension",
    description: "Direct browser wallet for Stellar accounts and Soroban apps.",
  },
  {
    id: "albedo",
    name: "Albedo",
    badge: "Web Auth",
    description: "Signing flow through Albedo web authentication.",
  },
  {
    id: "xbull",
    name: "xBull",
    badge: "Mobile",
    description: "Mobile-first Stellar wallet compatible with dApp handoffs.",
  },
];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildSession(
  walletId: WalletId,
  publicKey: string,
  mocked: boolean,
  network = DEFAULT_NETWORK,
): WalletSession {
  const descriptor = SUPPORTED_WALLETS.find((wallet) => wallet.id === walletId);

  if (!descriptor) {
    throw new Error("Unsupported wallet selected.");
  }

  return {
    walletId,
    walletName: descriptor.name,
    publicKey,
    connectedAt: new Date().toISOString(),
    network,
    mocked,
  };
}

async function connectMock(walletId: WalletId): Promise<WalletSession> {
  await wait(CONNECT_DELAY_MS);
  return buildSession(walletId, MOCK_PUBLIC_KEYS[walletId], true);
}

function pickFreighterNetwork(networkResult: string | { network: string }): string {
  if (typeof networkResult === "string" && networkResult.length > 0) {
    return networkResult;
  }

  if (
    typeof networkResult === "object" &&
    networkResult !== null &&
    typeof networkResult.network === "string" &&
    networkResult.network.length > 0
  ) {
    return networkResult.network;
  }

  return DEFAULT_NETWORK;
}

async function connectFreighter(): Promise<WalletSession> {
  const api = window.freighterApi;

  if (!api?.getPublicKey) {
    return connectMock("freighter");
  }

  if (typeof api.setAllowed === "function") {
    await api.setAllowed();
  }

  const publicKey = await api.getPublicKey();

  if (!publicKey) {
    throw new Error("Freighter did not return a valid public key.");
  }

  let network = DEFAULT_NETWORK;

  if (typeof api.getNetwork === "function") {
    const result = await api.getNetwork();
    network = pickFreighterNetwork(result);
  }

  return buildSession("freighter", publicKey, false, network);
}

export async function connectWallet(walletId: WalletId): Promise<WalletSession> {
  switch (walletId) {
    case "freighter":
      return connectFreighter();
    case "albedo":
      return connectMock("albedo");
    case "xbull":
      return connectMock("xbull");
    default:
      throw new Error("Unsupported wallet selected.");
  }
}

const USER_REJECTION_PATTERNS = [
  /rejected/i,
  /declined/i,
  /denied/i,
  /canceled/i,
  /cancelled/i,
  /closed/i,
];

export function toWalletErrorMessage(error: unknown): string {
  const baseMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Wallet connection failed. Please try again.";

  if (USER_REJECTION_PATTERNS.some((pattern) => pattern.test(baseMessage))) {
    return "User rejected the wallet connection request.";
  }

  return baseMessage;
}

export function shortenPublicKey(publicKey: string): string {
  if (publicKey.length <= 14) {
    return publicKey;
  }

  return `${publicKey.slice(0, 7)}...${publicKey.slice(-7)}`;
}
