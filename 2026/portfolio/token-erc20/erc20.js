import {
  BrowserProvider,
  Contract,
  formatUnits,
  parseUnits,
  isAddress,
  getAddress,
} from "https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm";

import { BEEM161_ADDRESS, ABI_URL, SEPOLIA_CHAIN_ID_HEX, EXPLORER_BASE } from "./config.js";

let provider = null;
let signer = null;
let account = null;

let token = null;
let tokenDecimals = null;

const LS_TOKEN_ADDR = "lab2026_beem161_address";



// DOM helpers
const $ = (id) => document.getElementById(id);
const setText = (id, text) => ($(id).textContent = text ?? "—");
const msg = (id, text) => ($(id).textContent = text || "");

function setExplorerLink(addr) {
  const a = document.getElementById("explorerLink");
  if (!a) return;
  a.href = `${EXPLORER_BASE}/address/${addr}`;
  a.textContent = "View on Sepolia Etherscan";
}


function requireWallet() {
  if (!window.ethereum) throw new Error("MetaMask (or another injected wallet) not detected.");
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
      `Could not load ABI at ${ABI_URL}. Did you create abi/BEEM161.abi.json and commit it?`
    );
  }
  return await res.json();
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
  setText("network", `${net.name} (chainId=${net.chainId})`);
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

  const addr = normalizeAddress($("tokenAddress").value);
  setExplorerLink(addr);


  const abi = await loadAbi();
  token = new Contract(addr, abi, signer);

  const [name, symbol, decimals, supply, bal, paused] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.balanceOf(account),
    // ERC20Pausable exposes paused()
    token.paused?.() ?? Promise.resolve(false),
  ]);

  tokenDecimals = Number(decimals);

  setText("tName", name);
  setText("tSymbol", symbol);
  setText("tDecimals", String(tokenDecimals));
  setText("tSupply", formatUnits(supply, tokenDecimals));
  setText("tBalance", formatUnits(bal, tokenDecimals));
  setText("tPaused", String(paused));

  msg("tokenMsg", "Token loaded.");
}

async function refreshTokenReadouts() {
  if (!token || tokenDecimals === null || !account) return;

  const [supply, bal, paused] = await Promise.all([
    token.totalSupply(),
    token.balanceOf(account),
    token.paused?.() ?? Promise.resolve(false),
  ]);

  setText("tSupply", formatUnits(supply, tokenDecimals));
  setText("tBalance", formatUnits(bal, tokenDecimals));
  setText("tPaused", String(paused));
}

async function transfer() {
  if (!token) throw new Error("Load the token first.");
  if (tokenDecimals === null) throw new Error("Token decimals unknown.");

  const to = normalizeAddress($("toAddress").value);
  const amtStr = ($("amount").value || "").trim();
  if (!amtStr) throw new Error("Enter an amount.");

  const amount = parseUnits(amtStr, tokenDecimals);

  msg("txMsg", "Sending transfer…");
  const tx = await token.transfer(to, amount);
  msg("txMsg", `Submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  msg("txMsg", `Confirmed in block ${receipt.blockNumber}.`);

  await refreshTokenReadouts();
}

async function burn() {
  if (!token) throw new Error("Load the token first.");
  if (tokenDecimals === null) throw new Error("Token decimals unknown.");

  const amtStr = ($("burnAmount").value || "").trim();
  if (!amtStr) throw new Error("Enter an amount to burn.");

  const amount = parseUnits(amtStr, tokenDecimals);

  msg("burnMsg", "Sending burn…");
  const tx = await token.burn(amount);
  msg("burnMsg", `Submitted: ${tx.hash}`);

  const receipt = await tx.wait();
  msg("burnMsg", `Confirmed in block ${receipt.blockNumber}.`);

  await refreshTokenReadouts();
}

// Wire up UI
$("btnConnect").addEventListener("click", async () => {
  msg("walletMsg", "");
  try {
    await connectWallet();
  } catch (e) {
    msg("walletMsg", e?.message || String(e));
  }
});

$("btnSwitchSepolia").addEventListener("click", async () => {
  msg("walletMsg", "");
  try {
    await switchToSepolia();
  } catch (e) {
    msg("walletMsg", e?.message || String(e));
  }
});

$("btnRefresh").addEventListener("click", async () => {
  msg("walletMsg", "");
  msg("tokenMsg", "");
  try {
    await refreshNetworkAndAccount();
    await refreshTokenReadouts();
  } catch (e) {
    msg("walletMsg", e?.message || String(e));
  }
});

$("btnLoadToken").addEventListener("click", async () => {
  msg("tokenMsg", "");
  try {
    await loadToken();
  } catch (e) {
    msg("tokenMsg", e?.message || String(e));
  }
});

$("btnTransfer").addEventListener("click", async () => {
  msg("txMsg", "");
  try {
    await transfer();
  } catch (e) {
    msg("txMsg", e?.message || String(e));
  }
});

$("btnBurn").addEventListener("click", async () => {
  msg("burnMsg", "");
  try {
    await burn();
  } catch (e) {
    msg("burnMsg", e?.message || String(e));
  }
});

// Prefill last token address
const saved = localStorage.getItem(LS_TOKEN_ADDR);
if (saved && !$("tokenAddress").value) $("tokenAddress").value = saved;
if (!$("tokenAddress").value) $("tokenAddress").value = BEEM161_ADDRESS;

setExplorerLink($("tokenAddress").value);


// React to account/network changes
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => window.location.reload());
  window.ethereum.on?.("chainChanged", () => window.location.reload());
}
