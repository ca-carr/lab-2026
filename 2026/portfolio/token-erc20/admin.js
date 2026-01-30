import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseUnits,
  isAddress,
  getAddress,
} from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

import {
  BEEM161_ADDRESS,
  ABI_URL,
  SEPOLIA_CHAIN_ID_HEX,
  EXPLORER_BASE,
} from "./config.js";

let provider = null;
let signer = null;
let account = null;

let token = null;
let tokenDecimals = null;
let tokenOwner = null;
let tokenPaused = null;

const LS_TOKEN_ADDR = "lab2026_beem161_address";

// DOM helpers
const $ = (id) => document.getElementById(id);
const setText = (id, text) => {
  const el = $(id);
  if (!el) return;
  el.textContent = text ?? "—";
};
const msg = (id, text) => {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
};

function setExplorerLink(addr) {
  const a = $("explorerLink");
  if (!a) return;
  a.href = `${EXPLORER_BASE}/address/${addr}`;
  a.textContent = "View on Sepolia Etherscan";
}

function requireWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask (or another injected wallet) not detected.");
  }
}

function normalizeAddress(v) {
  const s = (v || "").trim();
  if (!isAddress(s)) throw new Error("Invalid address.");
  return getAddress(s);
}

async function loadAbi() {
  const res = await fetch(ABI_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Could not load ABI at ${ABI_URL}. Ensure abi/BEEM161.abi.json exists and is committed.`
    );
  }
  return await res.json();
}

function setAdminControlsEnabled(enabled) {
  const ids = ["btnPause", "btnUnpause", "btnMint"];
  for (const id of ids) {
    const el = $(id);
    if (el) el.disabled = !enabled;
  }
}

function updatePauseButtons(paused) {
  const pauseBtn = $("btnPause");
  const unpauseBtn = $("btnUnpause");
  if (!pauseBtn || !unpauseBtn) return;

  // If paused, disabling pause and enabling unpause makes the UI clearer
  if (paused === true) {
    pauseBtn.disabled = true;
    unpauseBtn.disabled = false;
  } else if (paused === false) {
    pauseBtn.disabled = false;
    unpauseBtn.disabled = true;
  }
}

function amOwner() {
  if (!account || !tokenOwner) return false;
  return getAddress(account) === getAddress(tokenOwner);
}

async function connectWallet() {
  requireWallet();

  provider = new BrowserProvider(window.ethereum);
  await window.ethereum.request({ method: "eth_requestAccounts" });

  signer = await provider.getSigner();
  account = await signer.getAddress();

  await refreshNetworkAndAccount();
  msg("walletMsg", "Wallet connected.");
}

async function refreshNetworkAndAccount() {
  if (!provider) return;
  const net = await provider.getNetwork();
  const chainIdStr = typeof net.chainId === "bigint" ? net.chainId.toString() : String(net.chainId);

  setText("network", `${net.name} (chainId=${chainIdStr})`);
  setText("account", account || "—");
}

async function switchToSepolia() {
  requireWallet();

  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
  });

  if (provider) await refreshNetworkAndAccount();
  msg("walletMsg", "Switched network.");
}

async function loadToken() {
  if (!signer || !account) throw new Error("Connect your wallet first.");

  const addr = normalizeAddress($("tokenAddress")?.value);
  localStorage.setItem(LS_TOKEN_ADDR, addr);
  setExplorerLink(addr);

  const abi = await loadAbi();
  token = new Contract(addr, abi, signer);

  const [decimals, owner, paused, supply] = await Promise.all([
    token.decimals(),
    token.owner(),
    // present because your contract inherits ERC20Pausable
    token.paused(),
    token.totalSupply(),
  ]);

  tokenDecimals = Number(decimals);
  tokenOwner = getAddress(owner);
  tokenPaused = Boolean(paused);

  setText("tOwner", tokenOwner);
  setText("tAmOwner", String(amOwner()));
  setText("tPaused", String(tokenPaused));
  setText("tSupply", formatUnits(supply, tokenDecimals));

  // Enable/disable admin controls
  setAdminControlsEnabled(amOwner());
  // If you are the owner, make pause/unpause reflect current state
  if (amOwner()) updatePauseButtons(tokenPaused);

  msg("tokenMsg", "Token loaded.");
}

async function refreshTokenReadouts() {
  if (!token || tokenDecimals === null || !account) return;

  const [paused, supply, owner] = await Promise.all([
    token.paused(),
    token.totalSupply(),
    token.owner(),
  ]);

  tokenOwner = getAddress(owner);
  tokenPaused = Boolean(paused);

  setText("tOwner", tokenOwner);
  setText("tAmOwner", String(amOwner()));
  setText("tPaused", String(tokenPaused));
  setText("tSupply", formatUnits(supply, tokenDecimals));

  setAdminControlsEnabled(amOwner());
  if (amOwner()) updatePauseButtons(tokenPaused);
}

async function pause() {
  if (!token) throw new Error("Load the token first.");

  msg("pauseMsg", "Sending pause…");
  const tx = await token.pause();
  msg("pauseMsg", `Submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  msg("pauseMsg", `Confirmed in block ${receipt.blockNumber}.`);

  await refreshTokenReadouts();
}

async function unpause() {
  if (!token) throw new Error("Load the token first.");

  msg("pauseMsg", "Sending unpause…");
  const tx = await token.unpause();
  msg("pauseMsg", `Submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  msg("pauseMsg", `Confirmed in block ${receipt.blockNumber}.`);

  await refreshTokenReadouts();
}

async function mint() {
  if (!token) throw new Error("Load the token first.");
  if (tokenDecimals === null) throw new Error("Token decimals unknown.");

  const to = normalizeAddress($("mintTo")?.value);
  const amtStr = ($("mintAmount")?.value || "").trim();
  if (!amtStr) throw new Error("Enter an amount to mint.");

  const amount = parseUnits(amtStr, tokenDecimals);

  msg("mintMsg", "Sending mint…");
  const tx = await token.mint(to, amount);
  msg("mintMsg", `Submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  msg("mintMsg", `Confirmed in block ${receipt.blockNumber}.`);

  await refreshTokenReadouts();
}

// ---- Wire up UI ----
$("btnConnect")?.addEventListener("click", async () => {
  msg("walletMsg", "");
  try {
    await connectWallet();
  } catch (e) {
    msg("walletMsg", e?.message || String(e));
  }
});

$("btnSwitchSepolia")?.addEventListener("click", async () => {
  msg("walletMsg", "");
  try {
    await switchToSepolia();
  } catch (e) {
    msg("walletMsg", e?.message || String(e));
  }
});

$("btnRefresh")?.addEventListener("click", async () => {
  msg("walletMsg", "");
  msg("tokenMsg", "");
  try {
    await refreshNetworkAndAccount();
    await refreshTokenReadouts();
  } catch (e) {
    msg("walletMsg", e?.message || String(e));
  }
});

$("btnLoadToken")?.addEventListener("click", async () => {
  msg("tokenMsg", "");
  try {
    await loadToken();
  } catch (e) {
    msg("tokenMsg", e?.message || String(e));
  }
});

$("btnPause")?.addEventListener("click", async () => {
  msg("pauseMsg", "");
  try {
    await pause();
  } catch (e) {
    msg("pauseMsg", e?.message || String(e));
  }
});

$("btnUnpause")?.addEventListener("click", async () => {
  msg("pauseMsg", "");
  try {
    await unpause();
  } catch (e) {
    msg("pauseMsg", e?.message || String(e));
  }
});

$("btnMint")?.addEventListener("click", async () => {
  msg("mintMsg", "");
  try {
    await mint();
  } catch (e) {
    msg("mintMsg", e?.message || String(e));
  }
});

// Prefill token address (saved -> default constant)
const saved = localStorage.getItem(LS_TOKEN_ADDR);
if ($("tokenAddress")) {
  if (saved && !$("tokenAddress").value) $("tokenAddress").value = saved;
  if (!$("tokenAddress").value) $("tokenAddress").value = BEEM161_ADDRESS;
  setExplorerLink($("tokenAddress").value);
}

// Start with admin controls disabled until we confirm ownership
setAdminControlsEnabled(false);

// React to account/network changes
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}
